import { betterAuth } from "better-auth"

export const auth = betterAuth({
  database: {
    provider: "pg",
    url: process.env.NEON_DATABASE_URL!,
  },
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
})