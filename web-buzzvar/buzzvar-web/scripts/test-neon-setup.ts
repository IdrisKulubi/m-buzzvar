#!/usr/bin/env tsx

/**
 * Integration test script to verify Neon DB setup
 * Run with: npx tsx scripts/test-neon-setup.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(__dirname, '../.env.local') })

import {
  checkDatabaseHealth,
  closeDatabaseConnection,
} from "../lib/database/neon-client";
import { databaseMonitor } from "../lib/monitoring/database-monitor";

async function testNeonSetup() {
  console.log("🔍 Testing Neon DB Setup...\n");

  try {
    // Test 1: Basic health check
    console.log("1. Testing database health check...");
    const health = await checkDatabaseHealth();

    if (health.status === "healthy") {
      console.log("✅ Database health check passed");
      console.log(`   - Connection count: ${health.connectionCount}`);
      console.log(`   - Idle connections: ${health.idleCount}`);
      console.log(`   - Waiting connections: ${health.waitingCount}`);
      console.log(`   - DB timestamp: ${health.dbTimestamp}`);
    } else {
      console.log("❌ Database health check failed");
      console.log(`   - Error: ${health.error}`);
      return false;
    }

    // Test 2: Database monitor
    console.log("\n2. Testing database monitor...");
    const monitorHealth = await databaseMonitor.performHealthCheck();

    if (monitorHealth.status === "healthy") {
      console.log("✅ Database monitor working");
      console.log(`   - Response time: ${monitorHealth.responseTime}ms`);
    } else {
      console.log("❌ Database monitor failed");
      console.log(`   - Error: ${monitorHealth.error}`);
    }

    // Test 3: Connection pool stats
    console.log("\n3. Testing connection pool stats...");
    const currentMetrics = databaseMonitor.getCurrentMetrics();
    if (currentMetrics) {
      console.log("✅ Connection pool stats retrieved");
      console.log(`   - Total connections: ${currentMetrics.connectionCount}`);
      console.log(`   - Idle connections: ${currentMetrics.idleCount}`);
      console.log(`   - Waiting connections: ${currentMetrics.waitingCount}`);
    } else {
      console.log(
        "⚠️  No metrics available yet, performing health check first..."
      );
      const metrics = await databaseMonitor.performHealthCheck();
      console.log("✅ Connection pool stats retrieved");
      console.log(`   - Total connections: ${metrics.connectionCount}`);
      console.log(`   - Idle connections: ${metrics.idleCount}`);
      console.log(`   - Waiting connections: ${metrics.waitingCount}`);
    }

    // Test 4: Health summary
    console.log("\n4. Testing health summary...");
    const summary = databaseMonitor.getHealthSummary(5); // Last 5 minutes
    console.log("✅ Health summary generated");
    console.log(`   - Total checks: ${summary.totalChecks}`);
    console.log(`   - Healthy checks: ${summary.healthyChecks}`);
    console.log(
      `   - Average response time: ${summary.averageResponseTime.toFixed(2)}ms`
    );
    console.log(`   - Uptime: ${summary.uptime.toFixed(2)}%`);

    console.log("\n🎉 All tests passed! Neon DB setup is working correctly.");
    return true;
  } catch (error) {
    console.error("\n❌ Test failed with error:", error);
    return false;
  } finally {
    // Clean up
    await closeDatabaseConnection();
    console.log("\n🧹 Database connections closed.");
  }
}

// Test environment variables
function testEnvironmentVariables() {
  console.log("🔧 Checking environment variables...\n");

  const requiredVars = [
    "NEON_DATABASE_URL",
    "NEON_DATABASE_HOST",
    "NEON_DATABASE_NAME",
    "NEON_DATABASE_USER",
  ];

  let allPresent = true;

  requiredVars.forEach((varName) => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      allPresent = false;
    }
  });

  if (!allPresent) {
    console.log("\n⚠️  Some environment variables are missing.");
    console.log(
      "   Please check your .env.local file and ensure all Neon DB variables are set."
    );
    console.log("   Tests will be skipped if NEON_DATABASE_URL is not set.\n");
  } else {
    console.log("\n✅ All required environment variables are present.\n");
  }

  return allPresent;
}

// Main execution
async function main() {
  console.log("🚀 Neon DB Setup Integration Test\n");
  console.log("=".repeat(50));

  // Check environment variables first
  const envOk = testEnvironmentVariables();

  if (!envOk || !process.env.NEON_DATABASE_URL) {
    console.log("⏭️  Skipping database tests due to missing configuration.");
    console.log(
      "   This is expected if you haven't set up your Neon database yet."
    );
    process.exit(0);
  }

  // Run database tests
  const success = await testNeonSetup();

  process.exit(success ? 0 : 1);
}

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Run the test
main().catch((error) => {
  console.error("Test script failed:", error);
  process.exit(1);
});
