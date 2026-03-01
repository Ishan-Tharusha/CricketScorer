"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook to require authentication on a page
 * Automatically redirects to login if user is not authenticated
 */
export function useRequireAuth(redirectTo: string = "/login") {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(redirectTo);
    }
  }, [status, router, redirectTo]);

  return { session, status, isLoading: status === "loading" };
}

/**
 * Hook to get current user or redirect to login
 */
export function useUser() {
  const { session, status, isLoading } = useRequireAuth();
  return {
    user: session?.user,
    isLoading,
    isAuthenticated: status === "authenticated",
  };
}
