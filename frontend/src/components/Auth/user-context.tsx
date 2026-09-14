"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { getBackendUrl } from "@/lib/getBackendUrl";
import {
  clearAuthSession,
  getStoredQcToken,
  hasQcPortalSession,
  hasValidProcurementSession,
  hasValidQcSession,
  isJwtValid,
  isPortalUserType,
  repairQcSessionIfNeeded,
} from "@/lib/portalSession";

type User = {
  user_id: string;
  company_id: string;
  email: string;
  department?: string;
  isSuperAdmin: boolean;
  isCompanyAdmin?: boolean;
  isCustomer?: boolean;
  isManager?: boolean;
  managerProfile?: {
    manager_id?: string;
    assignedCategories?: string[];
    managerLevel?: string;
    canAssignCategories?: boolean;
    notificationPreferences?: any;
  };
  customerProfile?: {
    customer_id?: string;
    companyName?: string;
    customerType?: string;
    assignedManager?: any;
    preferences?: any;
  };
  roles: string[];
  permissions: string[];
  permissionGroups: string[];
  notifications?: any[];
  [key: string]: any;
};

type UserContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  isSuperAdmin: () => boolean;
  isCompanyAdmin: () => boolean;
  isCustomer: () => boolean;
  isManager: () => boolean;
  loading: boolean;
  hasToken: boolean | null;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

function isPortalPath(path: string) {
  return path.startsWith("/qc") || path.startsWith("/procurement");
}

function portalLoginHref(path: string) {
  if (path.startsWith("/procurement")) {
    const next = `${path}${typeof window !== "undefined" ? window.location.search || "" : ""}`;
    return `/procurement/login?next=${encodeURIComponent(next)}`;
  }
  if (path.startsWith("/qc/hub")) return "/qc/hub-login";
  const portal = ((typeof window !== "undefined" ? localStorage.getItem("qcPortal") : "") || "").toLowerCase();
  return portal === "hub" ? "/qc/hub-login" : "/qc/site-login";
}

function redirectToLoginForPath(path: string) {
  if (isPortalPath(path)) return;
  window.location.href = "/auth/sign-in";
}

function initUserFromToken(token: string): User | null {
  try {
    if (!isJwtValid(token)) return null;
    const decoded: any = jwtDecode(token);
    return {
      user_id: decoded.user_id,
      company_id: decoded.company_id,
      firstName: decoded.firstName || "",
      lastName: decoded.lastName || "",
      roles: [...new Set((decoded.roles || []) as string[])],
      permissions: [],
      permissionGroups: [],
      isSuperAdmin: decoded.isSuperAdmin || false,
      isCompanyAdmin: decoded.isCompanyAdmin || false,
      isCustomer: decoded.isCustomer || false,
      isManager: decoded.isManager || false,
      email: decoded.email || "",
    };
  } catch {
    return null;
  }
}

function extractPermissionKeys(permissions: unknown): string[] {
  if (!Array.isArray(permissions)) return [];
  return permissions
    .map((p: unknown) => (typeof p === "string" ? p : (p as { key?: string; _id?: string })?.key || String(p)))
    .filter(Boolean);
}

function extractRoleNames(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((r: unknown) => (typeof r === "string" ? r : (r as { name?: string; _id?: string })?.name || String(r)))
    .filter(Boolean);
}

function mergeUserFromApi(prevUser: User | null, freshUser: Record<string, unknown>): User {
  const permissions = extractPermissionKeys(freshUser.permissions);
  const roles = extractRoleNames(freshUser.roles);
  const permissionGroups = extractRoleNames(freshUser.permissionGroups);

  return {
    ...(prevUser || ({} as User)),
    ...freshUser,
    isSuperAdmin: Boolean(freshUser.isSuperAdmin),
    isCompanyAdmin: Boolean(freshUser.isCompanyAdmin),
    isCustomer: Boolean(freshUser.isCustomer),
    isManager: Boolean(freshUser.isManager),
    roles: [...new Set(roles)],
    permissions: [...new Set(permissions)],
    permissionGroups: [...new Set(permissionGroups)],
  } as User;
}

function finishPortalSessionInit(
  path: string,
  setUser: (u: User | null) => void,
  setHasToken: (v: boolean) => void,
  setLoading: (v: boolean) => void,
  setIsInitialized: (v: boolean) => void
) {
  const isQc = path.startsWith("/qc");
  const isProc = path.startsWith("/procurement");
  const sessionValid = isQc ? hasQcPortalSession() : isProc ? hasValidProcurementSession() : false;

  if (sessionValid) {
    const token =
      isQc && typeof window !== "undefined"
        ? localStorage.getItem("qc_token") || localStorage.getItem("token")
        : localStorage.getItem("token");
    const portalUser = token ? initUserFromToken(token) : null;
    setUser(portalUser);
    setHasToken(true);
  } else {
    // Portal layouts handle their own login redirects — do not clear storage here
    // (avoids races that bounce QC users to /auth/sign-in or wipe a fresh login).
    setUser(null);
    setHasToken(false);
  }
  setLoading(false);
  setIsInitialized(true);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [isClient, setIsClient] = useState(false);

  const refreshUser = async () => {
    if (!isClient) return;

    const path = typeof window !== "undefined" ? window.location.pathname || "" : "";
    const userType = localStorage.getItem("userType");
    const isQcPortal = path.startsWith("/qc") || userType === "qc";
    const isProcPortal = path.startsWith("/procurement") || userType === "procurement";

    // Procurement portal keeps its own session handling for now.
    if (isProcPortal) return;

    const token = isQcPortal
      ? getStoredQcToken() || localStorage.getItem("token")
      : localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    const companyId =
      typeof window !== "undefined" ? localStorage.getItem("company_id") || "RESSICHEM" : "RESSICHEM";

    try {
      const apiUrl = getBackendUrl();
      const response = await axios.get(`${apiUrl}/api/auth/current-user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-company-id": companyId,
        },
      });

      const responseData = response.data as { data?: Record<string, unknown> };
      const freshUser = (responseData.data || responseData) as Record<string, unknown>;
      setUser((prevUser) => mergeUserFromApi(prevUser, freshUser));
    } catch (error: any) {
      console.error("Failed to refresh user:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        const activeUserType = localStorage.getItem("userType");
        if (!isPortalPath(path) && !isPortalUserType(activeUserType)) {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("userType");
          localStorage.removeItem("userRole");
          setUser(null);
          setHasToken(false);
          if (typeof window !== "undefined") {
            redirectToLoginForPath(window.location.pathname || "");
          }
        }
      } else if (!isPortalPath(path) && !isPortalUserType(localStorage.getItem("userType"))) {
        localStorage.removeItem("token");
        setUser(null);
      }
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || isInitialized) return;

    const path = typeof window !== "undefined" ? window.location.pathname || "" : "";
    const isQcPath = path.startsWith("/qc");
    if (isQcPath) repairQcSessionIfNeeded();

    const token = isQcPath ? getStoredQcToken() || localStorage.getItem("token") : localStorage.getItem("token");
    const userType = localStorage.getItem("userType");
    setHasToken(!!token);

    if (token && (isPortalPath(path) || isPortalUserType(userType))) {
      const isQcPortal = isQcPath || userType === "qc";
      if (isQcPortal && hasQcPortalSession()) {
        const portalUser = initUserFromToken(token);
        setUser(portalUser);
        setHasToken(true);
        setIsInitialized(true);
        setLoading(true);
        refreshUser();
        return;
      }
      finishPortalSessionInit(path, setUser, setHasToken, setLoading, setIsInitialized);
      return;
    }

    if (token) {
      const initialUser = initUserFromToken(token);
      if (!initialUser) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userType");
        localStorage.removeItem("userRole");
        setUser(null);
        setLoading(false);
        setIsInitialized(true);
        setHasToken(false);
        redirectToLoginForPath(path);
        return;
      }
      setUser(initialUser);
      setIsInitialized(true);
      setLoading(false);
      refreshUser();
    } else {
      setLoading(false);
      setIsInitialized(true);
      setHasToken(false);
    }
    
    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (!isInitialized) {
        console.warn("User initialization timeout - forcing completion");
        setLoading(false);
        setIsInitialized(true);
      }
    }, 10000); // 10 second timeout
    
    return () => clearTimeout(timeout);
  }, [isClient, isInitialized]);

  const logout = () => {
    if (isClient) {
      localStorage.removeItem("token");
    }
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    
    // Company Admins should have access to most admin functions
    if (user.isCompanyAdmin) {
      // Allow access to all user management permissions
      if (permission.startsWith('users.')) return true;
      // Allow access to other common admin permissions
      const adminPermissions = [
        'customers.read', 'customers.create', 'customers.update', 'customers.delete',
        'orders.read', 'orders.create', 'orders.update', 'orders.delete', 'orders.hold', 'orders.dispatch',
        'products.read', 'products.create', 'products.update', 'products.delete',
        'managers.read', 'managers.create', 'managers.update', 'managers.delete',
        'categories.read', 'categories.create', 'categories.update', 'categories.delete',
        'invoices.read', 'invoices.create', 'invoices.update', 'invoices.delete',
        'notifications.read', 'notifications.create', 'notifications.update', 'notifications.delete',
        'dashboard.view', 'admin.dashboard', 'admin.settings'
      ];
      if (adminPermissions.includes(permission)) return true;
    }
    
    // For customer users, allow basic permissions even if not loaded yet
    if (user.isCustomer) {
      const customerPermissions = ['orders.read', 'orders.create', 'products.read', 'invoices.read', 'notifications.read'];
      if (customerPermissions.includes(permission)) return true;
    }
    
    return user.permissions?.includes(permission) || false;
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.roles?.includes(role) || false;
  };

  const isSuperAdmin = (): boolean => {
    return user?.isSuperAdmin || false;
  };

  const isCompanyAdmin = (): boolean => {
    return user?.isCompanyAdmin || false;
  };

  const isCustomer = (): boolean => {
    return user?.isCustomer || false;
  };

  const isManager = (): boolean => {
    return user?.isManager || false;
  };

  return (
    <UserContext.Provider 
      value={{ 
        user, 
        setUser, 
        logout, 
        refreshUser, 
        hasPermission, 
        hasRole, 
        isSuperAdmin, 
        isCompanyAdmin,
        isCustomer,
        isManager,
        loading,
        hasToken
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
}