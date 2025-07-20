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

// Simple role management functions without complex database operations for now
export async function getUserRole(userId: string): Promise<string | null> {
  // For now, return 'user' as default. This can be enhanced later.
  return "user";
}

export async function assignUserRole(
  userId: string,
  roleName: string,
  assignedBy?: string
): Promise<boolean> {
  // For now, return true. This can be enhanced later.
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
