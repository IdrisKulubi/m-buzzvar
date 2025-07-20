# Google OAuth Setup for Buzzvar Web

This document explains how Google OAuth is set up and used in the Buzzvar Web application.

## Configuration

Google OAuth is configured in the Better Auth server setup:

```typescript
// apps/web-buzzvar/buzzvar-web/src/lib/auth/better-auth-server.ts
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  },
},
```

## Environment Variables

The following environment variables need to be set:

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

These are already configured in `.env.local`.

## Google Cloud Console Setup

Make sure your Google Cloud Console project is configured with:

1. **Authorized JavaScript origins**:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)

2. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

## Usage in Components

### Using the GoogleSignIn Component

```tsx
import { GoogleSignIn } from "@/components/auth/GoogleSignIn"

// In your component:
<GoogleSignIn 
  onSuccess={() => console.log("Signed in successfully")}
  onError={(error) => console.error("Sign-in error:", error)}
  className="w-full"
/>
```

### Using the AuthContext

```tsx
import { useAuthContext } from "@/components/auth/AuthProvider"

// In your component:
const { signInWithGoogle } = useAuthContext()

const handleGoogleSignIn = async () => {
  try {
    await signInWithGoogle()
    // Handle success
  } catch (error) {
    // Handle error
  }
}
```

## Advanced Options

To configure additional options for Google OAuth, you can update the Better Auth server configuration:

```typescript
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // Optional settings:
    prompt: "select_account", // Always ask to select an account
    accessType: "offline", // Get refresh token
    // For additional scopes:
    scope: ["email", "profile", "https://www.googleapis.com/auth/drive.file"],
  },
},
```

## Requesting Additional Scopes

If you need additional Google API scopes after the user has already signed up:

```typescript
import { authClient } from "@/lib/auth/better-auth-client-web"

const requestGoogleDriveAccess = async () => {
  await authClient.linkSocial({
    provider: "google",
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
};
```

## Troubleshooting

1. **Redirect URI mismatch**: Ensure the redirect URI in Google Cloud Console matches your application's callback URL.
2. **Invalid client ID/secret**: Verify the environment variables are correctly set.
3. **Scope issues**: If requesting additional scopes, make sure they're properly formatted and permitted.