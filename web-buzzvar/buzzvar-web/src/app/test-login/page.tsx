"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/better-auth-client-web";

export default function TestLoginPage() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const testGoogleSignIn = async () => {
    try {
      setLoading(true);
      setStatus("Starting Google sign-in...");

      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/test-login",
      });

      setStatus("Google sign-in successful!");
      console.log("Sign-in result:", result);
    } catch (error) {
      console.error("Sign-in error:", error);
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const testSession = async () => {
    try {
      setLoading(true);
      setStatus("Checking session...");

      const result = await authClient.getSession();

      if (result.data && result.data.user) {
        // Also fetch role information
        try {
          const roleResponse = await fetch('/api/auth/role', {
            credentials: 'include',
          });
          if (roleResponse.ok) {
            const roleData = await roleResponse.json();
            setStatus(`Session found: ${result.data.user.email} (Role: ${roleData.role}, Admin: ${roleData.isAdmin})`);
          } else {
            setStatus(`Session found: ${result.data.user.email} (Role: unknown)`);
          }
        } catch (roleError) {
          setStatus(`Session found: ${result.data.user.email} (Role fetch failed)`);
        }
      } else if (result.error) {
        setStatus(`Session error: ${result.error.message}`);
      } else {
        setStatus("No session found");
      }
    } catch (error) {
      console.error("Session error:", error);
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const testSignOut = async () => {
    try {
      setLoading(true);
      setStatus("Signing out...");

      await authClient.signOut();
      setStatus("Signed out successfully");
    } catch (error) {
      console.error("Sign-out error:", error);
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Test Better Auth
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Testing Google OAuth integration
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={testGoogleSignIn}
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Test Google Sign In"}
          </button>

          <button
            onClick={testSession}
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Check Session"}
          </button>

          <button
            onClick={testSignOut}
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Sign Out"}
          </button>
        </div>

        {status && (
          <div className="mt-4 p-4 bg-gray-100 rounded-md">
            <p className="text-sm text-gray-700">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
