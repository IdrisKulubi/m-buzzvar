/**
 * Google OAuth Helper for Expo AuthSession
 *
 * This helper simplifies Google OAuth using the expo-auth-session/providers/google
 * which automatically handles the Expo proxy redirect URI.
 */

import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

// Complete auth session setup
WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthConfig {
  expoClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
  webClientId?: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export class GoogleAuthHelper {
  private config: GoogleAuthConfig;

  constructor(config: GoogleAuthConfig) {
    this.config = config;
  }

  /**
   * Sign in with Google using Expo AuthSession
   * This automatically uses the Expo proxy (https://auth.expo.io/@vehem23/buzzvar)
   */
  async signIn(): Promise<{
    userInfo: GoogleUserInfo | null;
    accessToken: string | null;
    error: Error | null;
  }> {
    try {
      console.log("🔵 GoogleAuthHelper: Starting Google sign-in...");

      // Get the appropriate client ID
      const clientId =
        this.config.expoClientId ||
        this.config.webClientId ||
        this.config.iosClientId ||
        this.config.androidClientId;

      if (!clientId) {
        throw new Error("No Google Client ID configured");
      }

      console.log(
        "🔵 GoogleAuthHelper: Using Client ID:",
        clientId.substring(0, 20) + "..."
      );

      // Create redirect URI - Expo automatically uses proxy for auth.expo.io
      const redirectUri = AuthSession.makeRedirectUri();

      console.log("🔵 GoogleAuthHelper: Redirect URI:", redirectUri);

      // Generate a random state for security
      const state =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      // Create the auth request with Authorization Code + PKCE flow (more secure)
      const request = new AuthSession.AuthRequest({
        clientId: clientId,
        scopes: ["openid", "profile", "email"],
        responseType: AuthSession.ResponseType.Code, // Use authorization code flow
        redirectUri: redirectUri,
        usePKCE: true, // Enable PKCE for security
        state: state,
      });

      console.log("🔵 GoogleAuthHelper: Prompting for authentication...");

      // Prompt for authentication
      const result = await request.promptAsync({
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      });

      if (result?.type === "success") {
        console.log(
          "🔵 GoogleAuthHelper: Authentication successful, exchanging code..."
        );

        const authCode = result.params?.code;

        if (!authCode) {
          throw new Error("No authorization code received from Google");
        }

        // Exchange authorization code for access token
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: clientId,
            code: authCode,
            redirectUri: redirectUri,
            extraParams: {},
          },
          {
            tokenEndpoint: "https://oauth2.googleapis.com/token",
          }
        );

        const accessToken = tokenResult.accessToken;

        if (!accessToken) {
          throw new Error("Failed to exchange code for access token");
        }

        // Fetch user information
        const userInfo = await this.fetchUserInfo(accessToken);

        return {
          userInfo,
          accessToken,
          error: null,
        };
      } else if (result?.type === "cancel") {
        console.log("🟡 GoogleAuthHelper: Authentication cancelled by user");
        return {
          userInfo: null,
          accessToken: null,
          error: new Error("Authentication was cancelled"),
        };
      } else {
        console.error("🔴 GoogleAuthHelper: Authentication failed:", result);
        return {
          userInfo: null,
          accessToken: null,
          error: new Error("Google authentication failed"),
        };
      }
    } catch (error) {
      console.error("🔴 GoogleAuthHelper: Sign-in error:", error);
      return {
        userInfo: null,
        accessToken: null,
        error:
          error instanceof Error ? error : new Error("Unknown error occurred"),
      };
    }
  }

  /**
   * Fetch user information from Google using access token
   */
  private async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    console.log("🔵 GoogleAuthHelper: Fetching user info...");

    const response = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    const userInfo = await response.json();

    console.log("🔵 GoogleAuthHelper: User info received:", {
      hasId: !!userInfo.id,
      hasEmail: !!userInfo.email,
      hasName: !!userInfo.name,
    });

    return {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name || userInfo.email?.split("@")[0] || "Unknown",
      picture: userInfo.picture,
    };
  }

  /**
   * Check if Google authentication is properly configured
   */
  isConfigured(): boolean {
    const hasAnyClientId = !!(
      this.config.expoClientId ||
      this.config.iosClientId ||
      this.config.androidClientId ||
      this.config.webClientId
    );

    if (!hasAnyClientId) {
      console.error("🔴 GoogleAuthHelper: No Google Client IDs found!");
      console.error(
        "🔴 Available env vars:",
        Object.keys(process.env).filter((key) => key.includes("GOOGLE"))
      );
      console.error("🔴 Config:", this.config);
    }

    return hasAnyClientId;
  }
}

/**
 * Create a Google Auth Helper with environment variables
 */
export function createGoogleAuthHelper(): GoogleAuthHelper {
  // Try to get platform-specific Client IDs first, fallback to main Client ID
  const fallbackClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

  const config: GoogleAuthConfig = {
    expoClientId:
      process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || fallbackClientId,
    iosClientId:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || fallbackClientId,
    androidClientId:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || fallbackClientId,
    webClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || fallbackClientId,
  };

  console.log("🔵 GoogleAuthHelper: Configuration:", {
    hasExpoClientId: !!config.expoClientId,
    hasIosClientId: !!config.iosClientId,
    hasAndroidClientId: !!config.androidClientId,
    hasWebClientId: !!config.webClientId,
    hasFallbackClientId: !!fallbackClientId,
  });

  return new GoogleAuthHelper(config);
}
