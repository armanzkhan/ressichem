"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SimpleRedirect() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    // Check if user is logged in
    const token = localStorage.getItem("token");
    const userType = localStorage.getItem("userType");
    const userRole = localStorage.getItem("userRole");

    console.log('🔍 SimpleRedirect - Auth Check:', { token: !!token, userType, userRole });

    if (!token) {
      console.log('❌ No token found, redirecting to sign-in');
      router.push("/auth/sign-in");
      return;
    }

    // Redirect based on user type/role
    if (userType === 'customer' || userRole === 'customer') {
      console.log('👤 Customer user, redirecting to orders/create');
      router.push("/orders/create");
    } else if (userType === 'admin' || userRole === 'admin' || userRole === 'super_admin') {
      console.log('👑 Admin user, redirecting to admin dashboard');
      router.push("/admin-dashboard");
    } else {
      console.log('📊 Regular user, redirecting to dashboard');
      router.push("/dashboard");
    }
  }, [isClient, router]);

  // Show loading during redirect
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}
