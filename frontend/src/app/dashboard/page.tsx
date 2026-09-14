"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Dashboard() {
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

    console.log('🔍 Dashboard - Auth Check:', { token: !!token, userType, userRole });

    if (!token) {
      console.log('❌ No token found, redirecting to sign-in');
      router.push("/auth/sign-in");
      return;
    }

    // Redirect based on user type/role
    if (userType === 'customer' || userRole === 'customer') {
      console.log('👤 Customer user, redirecting to orders/create page');
      router.push("/orders/create");
    } else if (userType === 'admin' || userRole === 'admin' || userRole === 'super_admin') {
      console.log('👑 Admin user, redirecting to admin dashboard');
      router.push("/admin-dashboard");
    } else if (userType === 'company_admin' || userRole === 'Company Admin') {
      console.log('🏢 Company admin user, redirecting to company dashboard');
      router.push("/company-dashboard");
    } else if (userType === 'manager' || userRole === 'manager') {
      console.log('👨‍💼 Manager user, redirecting to manager dashboard');
      router.push("/manager-dashboard");
    } else {
      console.log('📊 Regular user, showing dashboard');
      // Stay on dashboard for regular users
    }
  }, [isClient, router]);

  // Show loading during redirect
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
      </div>
    </div>
  );
}