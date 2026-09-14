"use client";

import { useUser } from "./user-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function RedirectGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, hasToken } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (loading || isRedirecting) return;

    const isAuthRoute = pathname?.startsWith('/auth/');
    const isCustomerPublicRoute = pathname?.startsWith('/customer') || pathname === '/customer-login' || pathname === '/customer-login-success';
    const isAdminRoute = pathname?.startsWith('/admin/');
    const isDashboardRoute = pathname === '/dashboard';
    const isProfileRoute = pathname === '/profile';
    const isHomeRoute = pathname === '/';

    // If we know there's no token and not on auth route, redirect to sign-in
    if (hasToken === false && !isAuthRoute && !isCustomerPublicRoute) {
      setIsRedirecting(true);
      window.location.href = "/auth/sign-in";
      return;
    }

    // If user is not authenticated and not on auth route, redirect to sign-in
    if (!user && !isAuthRoute && !isCustomerPublicRoute && hasToken !== true) {
      setIsRedirecting(true);
      window.location.href = "/auth/sign-in";
      return;
    }

    // If user is authenticated and on auth route, redirect to appropriate dashboard
    if (user && isAuthRoute) {
      setIsRedirecting(true);
      // Use immediate redirect with window.location
      if (user.isSuperAdmin) {
        window.location.href = "/admin-dashboard";
      } else if (user.isCustomer || user.role === 'customer' || localStorage.getItem('userType') === 'customer') {
        console.log('👤 Customer user detected, redirecting to orders/create');
        window.location.href = "/orders/create";
      } else if (user.isManager || user.role === 'manager' || localStorage.getItem('userType') === 'manager') {
        window.location.href = "/manager-approvals";
      } else if (user.roles && user.roles.length > 0) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/profile";
      }
      return;
    }

    // If user is not super admin and trying to access admin routes
    if (user && isAdminRoute && !user.isSuperAdmin) {
      setIsRedirecting(true);
      if (user.isCustomer || user.role === 'customer' || localStorage.getItem('userType') === 'customer') {
        window.location.href = "/orders/create";
      } else if (user.roles && user.roles.length > 0) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/profile";
      }
      return;
    }

    // If user is super admin and on regular dashboard, redirect to admin dashboard
    if (user && user.isSuperAdmin && isDashboardRoute) {
      setIsRedirecting(true);
      window.location.href = "/admin-dashboard";
      return;
    }

    // If user is on home route, redirect to appropriate dashboard
    if (user && isHomeRoute) {
      setIsRedirecting(true);
      if (user.isSuperAdmin) {
        window.location.href = "/admin-dashboard";
      } else if (user.isCustomer || user.role === 'customer' || localStorage.getItem('userType') === 'customer') {
        console.log('👤 Customer user on home route, redirecting to orders/create');
        window.location.href = "/orders/create";
      } else if (user.isManager || user.role === 'manager' || localStorage.getItem('userType') === 'manager') {
        window.location.href = "/manager-approvals";
      } else if (user.roles && user.roles.length > 0) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/profile";
      }
      return;
    }

  }, [user, loading, pathname, router, isRedirecting, hasToken]);

  // Show loading during redirect
  if (loading || isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
