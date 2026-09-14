"use client";

import { useUser } from "./user-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  requiredPermission?: string;
  fallbackPermission?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  redirectTo = "/auth/sign-in",
  requiredPermission,
  fallbackPermission
}: ProtectedRouteProps) {
  const { user, loading, hasPermission, isCustomer } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // Check if current path is an auth route
  const isAuthRoute = pathname?.startsWith('/auth/');
  // Allowlist for customer public routes (they manage their own auth)
  const isCustomerRoute = pathname?.startsWith('/customer') || pathname === '/customer-login' || pathname === '/customer-login-success';
  // Check if accessing admin routes
  const isAdminRoute = pathname?.startsWith('/admin/');

  // Map admin routes to customer routes for redirects
  const getCustomerRedirectPath = (adminPath: string | null): string => {
    if (!adminPath) return '/customer-portal';
    
    const routeMap: { [key: string]: string } = {
      '/admin/notifications': '/customer-notifications',
      '/admin/dashboard': '/customer-portal',
      '/admin': '/customer-portal',
    };
    
    // Check exact matches first
    if (routeMap[adminPath]) {
      return routeMap[adminPath];
    }
    
    // Check for partial matches
    for (const [adminRoute, customerRoute] of Object.entries(routeMap)) {
      if (adminPath.startsWith(adminRoute)) {
        return customerRoute;
      }
    }
    
    // Default redirect for customers accessing admin routes
    return '/customer-portal';
  };

  // Redirect customers away from admin routes
  useEffect(() => {
    if (!loading && user && isCustomer() && isAdminRoute) {
      const redirectPath = getCustomerRedirectPath(pathname || null);
      console.log(`🔄 Redirecting customer from ${pathname} to ${redirectPath}`);
      router.replace(redirectPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, isAdminRoute, pathname, router]);

  useEffect(() => {
    if (!loading && requireAuth && !user && !isAuthRoute && !isCustomerRoute) {
      router.replace(redirectTo);
    }
  }, [user, loading, requireAuth, redirectTo, router, isAuthRoute, isCustomerRoute]);

  // If it's an auth route or customer route, don't apply protection here
  if (isAuthRoute || isCustomerRoute) {
    return <>{children}</>;
  }

  // If customer is accessing admin route, show loading while redirecting
  if (!loading && user && isCustomer() && isAdminRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return null; // Will redirect
  }

  // Check permission if required
  if (requiredPermission && user) {
    const hasRequiredPermission = hasPermission(requiredPermission);
    const hasFallbackPermission = fallbackPermission ? hasPermission(fallbackPermission) : false;
    
    if (!hasRequiredPermission && !hasFallbackPermission) {
      // For customers, redirect to their portal instead of showing error
      if (isCustomer() && isAdminRoute) {
        const redirectPath = getCustomerRedirectPath(pathname || null);
        router.replace(redirectPath);
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
            </div>
          </div>
        );
      }
      
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-dark dark:text-white mb-4">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-center font-medium text-white hover:bg-opacity-90"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  // For authenticated users, just return children (layout will be handled by DashboardLayout)
  return <>{children}</>;
}
