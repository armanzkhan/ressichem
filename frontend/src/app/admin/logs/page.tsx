"use client";

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

export default function SystemLogsPage() {
  return (
    <ProtectedRoute requiredPermission="admin.system_logs">
      <Breadcrumb pageName="System Logs" />
      
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="border-b border-stroke px-7 py-4 dark:border-dark-3">
          <h3 className="font-medium text-dark dark:text-white">
            System Logs
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            View system logs and activity
          </p>
        </div>
        
        <div className="p-7">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-dark dark:text-white mb-2">
              System Logs
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              System logging functionality will be implemented here.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
