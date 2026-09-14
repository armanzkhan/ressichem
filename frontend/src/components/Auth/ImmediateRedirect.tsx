"use client";

import { useUser } from "./user-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ImmediateRedirect() {
  const { user, loading, hasToken } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If we know there's no token, immediately redirect to sign-in
    if (hasToken === false) {
      window.location.href = "/auth/sign-in";
      return;
    }
    
    // If not loading and no user, redirect to sign-in
    if (!loading && !user && !hasToken) {
      window.location.href = "/auth/sign-in";
    }
    // If user exists, redirect to appropriate dashboard
    else if (!loading && user) {
      if (user.isSuperAdmin) {
        window.location.href = "/admin-dashboard";
      } else if (user.roles && user.roles.length > 0) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/profile";
      }
    }
  }, [user, loading, hasToken]);

  // Show minimal loading during redirect
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
    </div>
  );
}
