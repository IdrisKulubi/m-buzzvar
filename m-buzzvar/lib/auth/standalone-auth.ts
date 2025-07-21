import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: 'user' | 'venue_owner' | 'admin' | 'super_admin';
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
  SESSION: 'buzzvar_session',
  USER: 'buzzvar_user',
  REFRESH_TOKEN: 'buzzvar_refresh_token',
} as const;

const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

// Google Sign-In configuration (lazy loaded to avoid module errors)
let GoogleSignin: any = null;
const initializeGoogleSignIn = async () => {
  if (!GoogleSignin) {
    try {
      const { GoogleSignin: GoogleSigninModule } = await import('@react-native-google-signin/google-signin');
      GoogleSignin = GoogleSigninModule;
      
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
        offlineAccess: true,
        hostedDomain: '',
        forceCodeForRefreshToken: true,
      });
    } catch (error) {
      console.warn('Google Sign-In not available:', error);
      GoogleSignin = null;
    }
  }
  return GoogleSignin;
};

class StandaloneAuth {
  private currentUser: User | null = null;
  private currentSession: Session | null = null;
  private listeners: Array<(state: AuthState) => void> = [];

  constructor() {
    this.initializeAuth();
  }

  // Initialize authentication state
  private async initializeAuth() {
    try {
      const storedSession = await SecureStore.getItemAsync(STORAGE_KEYS.SESSION);
      const storedUser = await SecureStore.getItemAsync(STORAGE_KEYS.USER);

      if (storedSession && storedUser) {
        const session: Session = JSON.parse(storedSession);
        const user: User = JSON.parse(storedUser);

        // Check if session is still valid
        if (session.expires_at > Date.now()) {
          this.currentSession = session;
          this.currentUser = user;
          this.notifyListeners();
          return;
        }

        // Try to refresh the session
        await this.refreshSession();
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      await this.clearSession();
    }
  }

  // Generate secure tokens
  private async generateTokens(userId: string): Promise<{ access_token: string; refresh_token: string }> {
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
    await SecureStore.setItemAsync(STORAGE_KEYS.SESSION, JSON.stringify(session));
    await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user));
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);

    this.currentSession = session;
    this.currentUser = user;
    this.notifyListeners();

    return session;
  }

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      // Hash password for comparison (in real app, this would be done server-side)
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      // For demo purposes, create a mock user
      // In production, this would validate against your database
      const user: User = {
        id: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, email),
        email,
        name: email.split('@')[0],
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await this.createSession(user);
      return { user, error: null };
    } catch (error) {
      console.error('Email sign in failed:', error);
      return { user: null, error: error as Error };
    }
  }

  // Sign up with email and password
  async signUpWithEmail(email: string, password: string, name: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      // Hash password (in real app, this would be done server-side)
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password,
        { encoding: Crypto.CryptoDigestAlgorithm.HEX }
      );

      // Create new user
      const user: User = {
        id: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, email + Date.now()),
        email,
        name,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await this.createSession(user);
      return { user, error: null };
    } catch (error) {
      console.error('Email sign up failed:', error);
      return { user: null, error: error as Error };
    }
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<{ user: User | null; error: Error | null }> {
    try {
      const GoogleSigninModule = await initializeGoogleSignIn();
      
      if (!GoogleSigninModule) {
        throw new Error('Google Sign-In is not available on this platform');
      }

      await GoogleSigninModule.hasPlayServices();
      const userInfo = await GoogleSigninModule.signIn();

      if (!userInfo.user) {
        throw new Error('No user information received from Google');
      }

      const user: User = {
        id: userInfo.user.id,
        email: userInfo.user.email,
        name: userInfo.user.name || userInfo.user.email.split('@')[0],
        avatar_url: userInfo.user.photo || undefined,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await this.createSession(user);
      return { user, error: null };
    } catch (error) {
      console.error('Google sign in failed:', error);
      return { user: null, error: error as Error };
    }
  }

  // Refresh session
  async refreshSession(): Promise<boolean> {
    try {
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken || !this.currentUser) {
        return false;
      }

      // Generate new tokens
      const { access_token, refresh_token } = await this.generateTokens(this.currentUser.id);
      const expires_at = Date.now() + TOKEN_EXPIRY;

      const newSession: Session = {
        user: this.currentUser,
        access_token,
        refresh_token,
        expires_at,
      };

      // Update stored session
      await SecureStore.setItemAsync(STORAGE_KEYS.SESSION, JSON.stringify(newSession));
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);

      this.currentSession = newSession;
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  }

  // Sign out
  async signOut(): Promise<{ error: Error | null }> {
    try {
      // Sign out from Google if available and signed in
      const GoogleSigninModule = await initializeGoogleSignIn();
      if (GoogleSigninModule) {
        try {
          if (await GoogleSigninModule.isSignedIn()) {
            await GoogleSigninModule.signOut();
          }
        } catch (error) {
          console.warn('Google sign out failed:', error);
          // Continue with local sign out even if Google sign out fails
        }
      }

      await this.clearSession();
      return { error: null };
    } catch (error) {
      console.error('Sign out failed:', error);
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
      console.error('Failed to clear session:', error);
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
    return {
      user: this.currentUser,
      session: this.currentSession,
      loading: false,
      isAuthenticated: !!this.currentUser,
    };
  }

  // Subscribe to auth state changes
  onAuthStateChange(callback: (state: AuthState) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify listeners of state changes
  private notifyListeners() {
    const state = this.getAuthState();
    this.listeners.forEach(listener => listener(state));
  }

  // Check if user has specific role
  hasRole(role: User['role']): boolean {
    if (!this.currentUser) return false;
    
    const roleHierarchy = {
      'user': 0,
      'venue_owner': 1,
      'admin': 2,
      'super_admin': 3,
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