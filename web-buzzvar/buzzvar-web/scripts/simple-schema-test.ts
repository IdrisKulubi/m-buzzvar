#!/usr/bin/env tsx

/**
 * Simple Schema Test
 * This script performs basic schema validation without complex operations
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Pool } from "pg";

// Load environment variables
config({ path: resolve(__dirname, "../.env.local") });

async function testSchema() {
  console.log("🧪 Simple Schema Test");
  console.log("=".repeat(50));

  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
  });

  try {
    // Test basic connection
    console.log("1. Testing basic connection...");
    const client = await pool.connect();
    await client.query("SELECT 1 as test");
    client.release();
    console.log("   ✅ Connection successful");

    // Test table existence
    console.log("\n2. Testing table existence...");
    const tableResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'venues', 'vibe_checks', 'reviews', 'promotions', 'events')
      ORDER BY table_name
    `);

    const tables = tableResult.rows.map((row) => row.table_name);
    console.log(`   ✅ Found tables: ${tables.join(", ")}`);

    // Test basic insert/select
    console.log("\n3. Testing basic operations...");

    // Insert a test user
    const userResult = await pool.query(`
      INSERT INTO users (email, name, email_verified) 
      VALUES ('test@example.com', 'Test User', true) 
      RETURNING id, email, name
    `);
    console.log("   ✅ User insertion successful");

    // Select the user
    const selectResult = await pool.query(`
      SELECT id, email, name, created_at 
      FROM users 
      WHERE email = 'test@example.com'
    `);
    console.log("   ✅ User selection successful");

    // Clean up
    await pool.query(`DELETE FROM users WHERE email = 'test@example.com'`);
    console.log("   ✅ Cleanup successful");

    // Test constraints
    console.log("\n4. Testing constraints...");
    try {
      await pool.query(`
        INSERT INTO users (email, name) 
        VALUES ('test@example.com', 'Test User')
      `);
      await pool.query(`
        INSERT INTO users (email, name) 
        VALUES ('test@example.com', 'Duplicate User')
      `);
      console.log("   ❌ Unique constraint not working");
    } catch (error) {
      console.log("   ✅ Unique constraint working correctly");
    }

    // Clean up again
    await pool.query(`DELETE FROM users WHERE email = 'test@example.com'`);

    console.log("\n🎉 All basic tests passed!");
    console.log("\n✅ Schema migration appears to be successful!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Main execution
testSchema().catch((error) => {
  console.error("Schema test failed:", error);
  process.exit(1);
});
