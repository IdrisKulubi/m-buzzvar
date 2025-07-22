import React, { createContext, useContext, useEffect, useState } from "react";
import { authClient } from "@/lib/auth/better-auth-client-mobile";
import type { User } from "better-auth/types";

interface UserContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(session?.user || null);
    setLoading(isPending);
  }, [session, isPending]);

  const refreshUser = async () => {
    try {
      setLoading(true);
      const sessionData = await authClient.getSession();

      // Type guard to check if the object has the expected User properties
      const isValidUser = (obj: any): obj is User => {
        return (
          obj &&
          typeof obj.id === "string" &&
          typeof obj.email === "string" &&
          typeof obj.name === "string"
        );
      };

      // Handle the response structure which contains both user and session
      let userData: User | null = null;

      if (
        sessionData &&
        "data" in sessionData &&
        sessionData.data &&
        "user" in sessionData.data
      ) {
        const potentialUser = sessionData.data.user;
        if (isValidUser(potentialUser)) {
          userData = potentialUser;
        }
      } else if (sessionData && "user" in sessionData) {
        const potentialUser = (sessionData as any).user;
        if (isValidUser(potentialUser)) {
          userData = potentialUser;
        }
      }

      setUser(userData);
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    refreshUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
