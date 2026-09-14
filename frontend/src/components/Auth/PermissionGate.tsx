"use client";

import React from "react";
import { useUser } from "./user-context";

interface PermissionGateProps {
  children: React.ReactNode;
  permission?: string;
  role?: string;
  requireSuperAdmin?: boolean;
  fallback?: React.ReactNode;
}

export function PermissionGate({ 
  children, 
  permission, 
  role, 
  requireSuperAdmin = false,
  fallback = null 
}: PermissionGateProps) {
  const { hasPermission, hasRole, isSuperAdmin } = useUser();

  // Check super admin requirement
  if (requireSuperAdmin && !isSuperAdmin()) {
    return <>{fallback}</>;
  }

  // Check specific permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Check specific role
  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Higher-order component version
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<PermissionGateProps, 'children'>
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGate {...options}>
        <Component {...props} />
      </PermissionGate>
    );
  };
}
