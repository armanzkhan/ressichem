"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Layouts/sidebar";
import { Header } from "@/components/Layouts/header";
import SimpleNotificationManager from "@/components/Notifications/SimpleNotificationManager";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

  // Check if current path is an auth route
  const isAuthRoute = pathname?.startsWith('/auth/');

  // If it's an auth route, don't show dashboard layout
  if (isAuthRoute) {
    return <>{children}</>;
  }

  // For non-auth routes, show the dashboard layout
  return (
    <SimpleNotificationManager>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 w-full min-w-0 overflow-x-hidden">
            <div className="w-full min-w-0 px-2 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-2 sm:py-4 md:py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SimpleNotificationManager>
  );
}
