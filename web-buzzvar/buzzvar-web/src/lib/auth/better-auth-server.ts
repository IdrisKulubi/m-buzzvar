import { betterAuth } from "better-auth";
import { Pool } from "pg";

// Create a single pool instance
let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL!,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on("error", (err) => {
      console.error("Database pool error:", err);
    });
  }
  return pool;
}

export const auth = betterAuth({
  database: getPool(),
  secret: process.env.BETTER_AUTH_SECRET!,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});

// Role management functions with admin email checking
export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const pool = getPool();
    const client = await pool.connect();

    try {
      // Get user email from database
      const userResult = await client.query(
        'SELECT email FROM "user" WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        console.log(`User with ID ${userId} not found`);
        return null;
      }

      const userEmail = userResult.rows[0].email;
      console.log(`Checking role for user email: ${userEmail}`);

      // Check if user is admin based on ADMIN_EMAILS environment variable
      const adminEmailsEnv = process.env.ADMIN_EMAILS;
      console.log(`ADMIN_EMAILS env var: ${adminEmailsEnv}`);

      const adminEmails =
        adminEmailsEnv?.split(",").map((email) => email.trim().toLowerCase()) ||
        [];
      console.log(`Parsed admin emails:`, adminEmails);

      if (adminEmails.includes(userEmail.toLowerCase())) {
        console.log(`User ${userEmail} is an admin`);
        return "admin";
      }

      console.log(`User ${userEmail} is a regular user`);
      // For now, return 'user' as default for non-admin users
      return "user";
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching user role:", error);
    return "user";
  }
}

export async function assignUserRole(
  userId: string,
  roleName: string,
  assignedBy?: string
): Promise<boolean> {
  // For now, return true. This can be enhanced later with proper role tables.
  console.log(`Assigning role ${roleName} to user ${userId} by ${assignedBy}`);
  return true;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === "admin" || role === "super_admin";
}

export async function isVenueOwner(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === "venue_owner" || role === "admin" || role === "super_admin";
}

export async function getUserByEmail(email: string) {
  try {
    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM "user" WHERE email = $1',
        [email]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
}

// Debug function to test environment variable loading
export function debugAdminEmails() {
  console.log("=== Admin Emails Debug ===");
  console.log("ADMIN_EMAILS env var:", process.env.ADMIN_EMAILS);
  console.log(
    "All env vars starting with ADMIN:",
    Object.keys(process.env).filter((key) => key.startsWith("ADMIN"))
  );

  const adminEmails =
    process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim()) || [];
  console.log("Parsed admin emails:", adminEmails);
  console.log("========================");

  return {
    raw: process.env.ADMIN_EMAILS,
    parsed: adminEmails,
  };
}
