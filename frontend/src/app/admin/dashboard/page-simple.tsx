"use client";

import { useUser } from "@/components/Auth/user-context";
import { PermissionGate } from "@/components/Auth/PermissionGate";

export default function AdminDashboard() {
  const { user, loading, isSuperAdmin } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionGate requireSuperAdmin fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-8xl mb-6">🛡️</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            This page requires super administrator privileges.
          </p>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            Super Admin Dashboard
          </h1>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-gray-400">
              Welcome to the Super Admin Dashboard. This is a simplified version for testing.
            </p>
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}
