"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { assignUserRole, auth, getUserRole } from "../auth/better-auth-server";

export async function signInWithEmailAction(email: string, password: string) {
  try {
    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });

    // If we get here, authentication was successful
    redirect("/dashboard");
  } catch (error) {
    console.error("Sign in error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to sign in",
    };
  }
}

export async function signUpWithEmailAction(
  email: string,
  password: string,
  name?: string
) {
  try {
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: name || email.split("@")[0],
      },
    });

    // If we get here, sign up was successful
    redirect("/dashboard");
  } catch (error) {
    console.error("Sign up error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to sign up",
    };
  }
}

export async function signOutAction() {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });

    redirect("/login");
  } catch (error) {
    console.error("Sign out error:", error);
    return { error: "Failed to sign out" };
  }
}

export async function getCurrentUserAction() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { user: null };
    }

    const role = await getUserRole(session.user.id);

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        role,
      },
    };
  } catch (error) {
    console.error("Get current user error:", error);
    return { user: null };
  }
}

export async function updateUserRoleAction(userId: string, roleName: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { error: "Unauthorized" };
    }

    // Check if current user is admin
    const currentUserRole = await getUserRole(session.user.id);
    if (
      !currentUserRole ||
      !["admin", "super_admin"].includes(currentUserRole)
    ) {
      return { error: "Insufficient permissions" };
    }

    const success = await assignUserRole(userId, roleName, session.user.id);

    if (!success) {
      return { error: "Failed to update user role" };
    }

    return { success: true };
  } catch (error) {
    console.error("Update user role error:", error);
    return { error: "Failed to update user role" };
  }
}
