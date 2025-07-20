"use client";

import { useAuthContext } from "./AuthProvider";
import { AuthLoading } from "./AuthLoading";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type UserRole = "user" | "venue_owner" | "admin" | "super_admin";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  venueId?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  venueId,
}: ProtectedRouteProps) {
  const { user, role, loading, isAuthenticated } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    console.log("ProtectedRoute check:", {
      loading,
      isAuthenticated,
      requiredRole,
      currentRole: role,
      user: user?.email
    });
    
    if (!loading && !isAuthenticated) {
      console.log("Not authenticated, redirecting to login");
      router.push("/login");
      return;
    }

    if (!loading && isAuthenticated && requiredRole) {
      // Check role-based access
      if (
        requiredRole === "admin" &&
        !["admin", "super_admin"].includes(role || "")
      ) {
        console.log(`Access denied: Required role 'admin', but user has role '${role}'`);
        router.push("/unauthorized");
        return;
      }

      if (
        requiredRole === "venue_owner" &&
        !["venue_owner", "admin", "super_admin"].includes(role || "")
      ) {
        console.log(`Access denied: Required role 'venue_owner', but user has role '${role}'`);
        router.push("/unauthorized");
        return;
      }

      console.log(`Access granted: User has required role '${requiredRole}'`);

      // TODO: Check venue-specific access
      // This would require an API call to check if the user owns this specific venue
      if (venueId && !["admin", "super_admin"].includes(role || "")) {
        if (role !== "venue_owner") {
          console.log(`Access denied: Venue access requires venue_owner role, but user has role '${role}'`);
          router.push("/unauthorized");
          return;
        }
        // Additional venue ownership check would go here
      }
    }
  }, [user, role, loading, isAuthenticated, requiredRole, venueId, router]);

  if (loading) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  if (requiredRole) {
    if (
      requiredRole === "admin" &&
      !["admin", "super_admin"].includes(role || "")
    ) {
      return null; // Will redirect to unauthorized
    }

    if (
      requiredRole === "venue_owner" &&
      !["venue_owner", "admin", "super_admin"].includes(role || "")
    ) {
      return null; // Will redirect to unauthorized
    }
  }

  if (venueId && !["admin", "super_admin"].includes(role || "")) {
    if (role !== "venue_owner") {
      return null; // Will redirect to unauthorized
    }
    // Additional venue ownership check would go here
  }

  return <>{children}</>;
}
