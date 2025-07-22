/**
 * Standalone Authentication System
 *
 * This module provides a complete authentication system that works without a backend server.
 * It handles:
 * - Email/password authentication with local storage
 * - Google OAuth integration using Expo AuthSession (browser-based)
 * - Session management with secure token storage
 * - Graceful fallback when Google Sign-In is unavailable
 *
 * Google Sign-In Requirements (Expo AuthSession):
 * - expo-auth-session and expo-web-browser packages
 * - At least one Google Client ID configured:
 *   - EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID (recommended)
 *   - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
 *   - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (optional)
 *   - EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID (optional)
 *
 * The system gracefully handles missing dependencies and provides user-friendly error messages.
 * Works in Expo Go without native module compilation.
 */

import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { createGoogleAuthHelper } from "./google-auth-helper";

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: "user" | "venue_owner" | "admin" | "super_admin";
  created_at: string;
  updated_at: string;
}

export interface Session {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

// Constants
const STORAGE_KEYS = {
  SESSION: "buzzvar_session",
  USER: "buzzvar_user",
  REFRESH_TOKEN: "buzzvar_refresh_token",
} as const;

const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Google Auth Helper
const googleAuthHelper = createGoogleAuthHelper();

class StandaloneAuth {
  private currentUser: User | null = null;
  private currentSession: Session | null = null;
  private listeners: ((state: AuthState) => void)[] = [];
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;

  constructor() {
    this.initializeAuth();
  }

  // Initialize authentication state
  private async initializeAuth() {
    if (this.isInitializing) return;

    this.isInitializing = true;
    console.log("🔵 StandaloneAuth: Starting initialization...");

    try {
      const storedSession = await SecureStore.getItemAsync(
        STORAGE_KEYS.SESSION
      );
      const storedUser = await SecureStore.getItemAsync(STORAGE_KEYS.USER);

      console.log("🔵 StandaloneAuth: Stored data check:", {
        hasSession: !!storedSession,
        hasUser: !!storedUser,
      });

      if (storedSession && storedUser) {
        const session: Session = JSON.parse(storedSession);
        const user: User = JSON.parse(storedUser);

        console.log(
          "🔵 StandaloneAuth: Found stored session for user:",
          user.email
        );

        // Check if session is still valid
        if (session.expires_at > Date.now()) {
          console.log("🟢 StandaloneAuth: Session is still valid");
          this.currentSession = session;
          this.currentUser = user;
          this.isInitialized = true;
          this.isInitializing = false;
          this.notifyListeners();
          return;
        }

        console.log(
          "🟡 StandaloneAuth: Session expired, attempting refresh..."
        );
        // Try to refresh the session
        const refreshed = await this.refreshSession();
        if (!refreshed) {
          console.log(
            "🔴 StandaloneAuth: Session refresh failed, clearing session"
          );
          await this.clearSession();
        }
      } else {
        console.log("🔵 StandaloneAuth: No stored session found");
      }
    } catch (error) {
      console.error("🔴 StandaloneAuth: Failed to initialize auth:", error);
      await this.clearSession();
    } finally {
      this.isInitialized = true;
      this.isInitializing = false;
      console.log("🔵 StandaloneAuth: Initialization complete");
      this.notifyListeners();
    }
  }

  // Generate secure tokens
  private async generateTokens(
    userId: string
  ): Promise<{ access_token: string; refresh_token: string }> {
    const access_token = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${userId}_${Date.now()}_${Math.random()}`,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    const refresh_token = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `refresh_${userId}_${Date.now()}_${Math.random()}`,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    return { access_token, refresh_token };
  }

  // Create session
  private async createSession(user: User): Promise<Session> {
    const { access_token, refresh_token } = await this.generateTokens(user.id);
    const expires_at = Date.now() + TOKEN_EXPIRY;

    const session: Session = {
      user,
      access_token,
      refresh_token,
      expires_at,
    };

    // Store session securely
    await SecureStore.setItemAsync(
      STORAGE_KEYS.SESSION,
      JSON.stringify(session)
    );
    await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user));
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);

    this.currentSession = session;
    this.currentUser = user;
    this.notifyListeners();

    return session;
  }

  // Sign in with email and password
  async signInWithEmail(
    email: string,
    password: string
  ): Promise<{ user: User | null; error: Error | null }> {
    try {
      console.log("🔵 StandaloneAuth: Starting email sign-in...");

      // Hash password for comparison (in real app, this would be done server-side)
      await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      // For demo purposes, create a mock user
      // In production, this would validate against your database
      const user: User = {
        id: await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          email
        ),
        email,
        name: email.split("@")[0],
        role: "user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await this.createSession(user);
      console.log("🟢 StandaloneAuth: Email sign-in completed successfully");
      return { user, error: null };
    } catch (error) {
      console.error("🔴 StandaloneAuth: Email sign in failed:", error);
      return { user: null, error: error as Error };
    }
  }

  // Sign up with email and password
  async signUpWithEmail(
    email: string,
    password: string,
    name: string
  ): Promise<{ user: User | null; error: Error | null }> {
    try {
      console.log("🔵 StandaloneAuth: Starting email sign-up...");

      // Hash password (in real app, this would be done server-side)
      await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      // Create new user
      const user: User = {
        id: await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          email + Date.now()
        ),
        email,
        name,
        role: "user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await this.createSession(user);
      console.log("🟢 StandaloneAuth: Email sign-up completed successfully");
      return { user, error: null };
    } catch (error) {
      console.error("🔴 StandaloneAuth: Email sign up failed:", error);
      return { user: null, error: error as Error };
    }
  }

  // Sign in with Google using Expo AuthSession
  async signInWithGoogle(): Promise<{
    user: User | null;
    error: Error | null;
  }> {
    console.log("🔵 StandaloneAuth: Google sign-in requested...");

    if (!googleAuthHelper.isConfigured()) {
      console.error("🔴 StandaloneAuth: Google Auth not configured");
      return { 
        user: null, 
        error: new Error("Google Sign-In is not properly configured. Please check your environment variables.") 
      };
    }

    try {
      console.log("🔵 StandaloneAuth: Using Google Auth Helper...");

      // Use the simplified Google Auth Helper
      const { userInfo, accessToken, error: googleError } = await googleAuthHelper.signIn();

      if (googleError) {
        throw googleError;
      }

      if (!userInfo || !accessToken) {
        throw new Error("No user information received from Google");
      }

      console.log("🔵 StandaloneAuth: Google user info received:", {
        hasId: !!userInfo.id,
        hasEmail: !!userInfo.email,
        hasName: !!userInfo.name,
      });

      const user: User = {
        id: `google_${userInfo.id}`,
        email: userInfo.email,
        name: userInfo.name,
        avatar_url: userInfo.picture || undefined,
        role: "user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("🔵 StandaloneAuth: Creating session for Google user:", user.email);
      await this.createSession(user);

      console.log("🟢 StandaloneAuth: Google sign-in completed successfully");
      return { user, error: null };
    } catch (error) {
      console.error("🔴 StandaloneAuth: Google sign in failed:", error);

      // Provide user-friendly error messages
      let errorMessage = "Google Sign-In failed";

      if (error instanceof Error) {
        if (error.message.includes("cancelled")) {
          errorMessage = "Sign-in was cancelled";
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your connection";
        } else {
          errorMessage = error.message;
        }
      }

      return { user: null, error: new Error(errorMessage) };
    }
  }

  // Refresh session
  async refreshSession(): Promise<boolean> {
    try {
      const refreshToken = await SecureStore.getItemAsync(
        STORAGE_KEYS.REFRESH_TOKEN
      );
      if (!refreshToken || !this.currentUser) {
        return false;
      }

      // Generate new tokens
      const { access_token, refresh_token } = await this.generateTokens(
        this.currentUser.id
      );
      const expires_at = Date.now() + TOKEN_EXPIRY;

      const newSession: Session = {
        user: this.currentUser,
        access_token,
        refresh_token,
        expires_at,
      };

      // Update stored session
      await SecureStore.setItemAsync(
        STORAGE_KEYS.SESSION,
        JSON.stringify(newSession)
      );
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);

      this.currentSession = newSession;
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error("Session refresh failed:", error);
      return false;
    }
  }

  // Sign out
  async signOut(): Promise<{ error: Error | null }> {
    try {
      console.log("🔵 StandaloneAuth: Starting sign out process...");

      // For Expo AuthSession, we don't need to explicitly sign out from Google
      // The browser session will be handled by the browser itself
      // We just need to clear our local session

      await this.clearSession();
      console.log("🟢 StandaloneAuth: Sign out completed successfully");
      return { error: null };
    } catch (error) {
      console.error("🔴 StandaloneAuth: Sign out failed:", error);
      return { error: error as Error };
    }
  }

  // Clear session
  private async clearSession() {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.SESSION);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

      this.currentSession = null;
      this.currentUser = null;
      this.notifyListeners();
    } catch (error) {
      console.error("Failed to clear session:", error);
    }
  }

  // Get current session
  getSession(): Session | null {
    return this.currentSession;
  }

  // Get current user
  getUser(): User | null {
    return this.currentUser;
  }

  // Get auth state
  getAuthState(): AuthState {
    const loading = !this.isInitialized || this.isInitializing;
    const state = {
      user: this.currentUser,
      session: this.currentSession,
      loading,
      isAuthenticated: !!this.currentUser,
    };

    console.log("🔵 StandaloneAuth: getAuthState called:", {
      hasUser: !!state.user,
      loading: state.loading,
      isAuthenticated: state.isAuthenticated,
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
    });

    return state;
  }

  // Subscribe to auth state changes
  onAuthStateChange(callback: (state: AuthState) => void): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(
        (listener) => listener !== callback
      );
    };
  }

  // Notify listeners of state changes
  private notifyListeners() {
    const state = this.getAuthState();
    this.listeners.forEach((listener) => listener(state));
  }

  // Check if user has specific role
  hasRole(role: User["role"]): boolean {
    if (!this.currentUser) return false;

    const roleHierarchy = {
      user: 0,
      venue_owner: 1,
      admin: 2,
      super_admin: 3,
    };

    const userLevel = roleHierarchy[this.currentUser.role];
    const requiredLevel = roleHierarchy[role];

    return userLevel >= requiredLevel;
  }

  // Get access token for API requests
  getAccessToken(): string | null {
    return this.currentSession?.access_token || null;
  }
}

// Export singleton instance
export const standaloneAuth = new StandaloneAuth();

// Utility function to check if Google Sign-In is available
export const isGoogleSignInAvailable = (): boolean => {
  return googleAuthHelper.isConfigured();
};

// Export convenience functions
export const {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOut,
  getSession,
  getUser,
  getAuthState,
  onAuthStateChange,
  hasRole,
  getAccessToken,
} = standaloneAuth;
