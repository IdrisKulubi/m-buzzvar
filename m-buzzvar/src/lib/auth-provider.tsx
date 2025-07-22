import React, { createContext, useContext, useEffect, useState } from "react";
import {
  standaloneAuth,
  type User,
  type AuthState,
} from "@/lib/auth/standalone-auth";

// Auth context
interface AuthContextType {
  session: any | null;
  user: User | null;
  loading: boolean;
  role: string | null;
  isAdmin: boolean;
  isVenueOwner: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<{ error: any }>;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ user: User | null; error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ user: User | null; error: Error | null }>;
  signInWithGoogle: () => Promise<{ user: User | null; error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider component using Standalone Auth
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    console.log("🔵 AuthProvider: Initializing auth provider...");

    // Subscribe to auth state changes
    const unsubscribe = standaloneAuth.onAuthStateChange((state) => {
      console.log("🔵 AuthProvider: Auth state changed:", {
        hasUser: !!state.user,
        loading: state.loading,
        isAuthenticated: state.isAuthenticated,
        userEmail: state.user?.email,
      });
      setAuthState(state);
    });

    // Get initial auth state - this might still be loading
    const initialState = standaloneAuth.getAuthState();
    console.log("🔵 AuthProvider: Initial auth state:", {
      hasUser: !!initialState.user,
      loading: initialState.loading,
      isAuthenticated: initialState.isAuthenticated,
      userEmail: initialState.user?.email,
    });
    setAuthState(initialState);

    // Force a check after a short delay to ensure initialization is complete
    const timeoutId = setTimeout(() => {
      const currentState = standaloneAuth.getAuthState();
      console.log("🔵 AuthProvider: Auth state after timeout:", {
        hasUser: !!currentState.user,
        loading: currentState.loading,
        isAuthenticated: currentState.isAuthenticated,
        userEmail: currentState.user?.email,
      });
      setAuthState(currentState);
    }, 1000);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      console.log("🔵 Standalone Auth: Starting sign out...");

      const result = await standaloneAuth.signOut();

      if (result.error) {
        console.error("🔴 Standalone Auth: Sign out error:", result.error);
        return { error: result.error };
      }

      console.log("🟢 Standalone Auth: Sign out successful");
      return { error: null };
    } catch (error) {
      console.error("🔴 Standalone Auth: Sign out failed:", error);
      return { error };
    }
  };

  const handleSignInWithEmail = async (email: string, password: string) => {
    try {
      console.log("🔵 Standalone Auth: Starting email sign in...");
      return await standaloneAuth.signInWithEmail(email, password);
    } catch (error) {
      console.error("🔴 Standalone Auth: Email sign in failed:", error);
      return { user: null, error: error as Error };
    }
  };

  const handleSignUpWithEmail = async (
    email: string,
    password: string,
    name: string
  ) => {
    try {
      console.log("🔵 Standalone Auth: Starting email sign up...");
      return await standaloneAuth.signUpWithEmail(email, password, name);
    } catch (error) {
      console.error("🔴 Standalone Auth: Email sign up failed:", error);
      return { user: null, error: error as Error };
    }
  };

  const handleSignInWithGoogle = async () => {
    try {
      console.log("🔵 Standalone Auth: Starting Google sign in...");
      return await standaloneAuth.signInWithGoogle();
    } catch (error) {
      console.error("🔴 Standalone Auth: Google sign in failed:", error);
      return { user: null, error: error as Error };
    }
  };

  const value: AuthContextType = {
    session: authState.session,
    user: authState.user,
    loading: authState.loading,
    role: authState.user?.role || null,
    isAdmin: standaloneAuth.hasRole("admin"),
    isVenueOwner: standaloneAuth.hasRole("venue_owner"),
    isAuthenticated: authState.isAuthenticated,
    signOut: handleSignOut,
    signInWithEmail: handleSignInWithEmail,
    signUpWithEmail: handleSignUpWithEmail,
    signInWithGoogle: handleSignInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Auth hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
