"use client";

import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { ThemeProvider } from "next-themes";
import React from "react";
import { Toaster } from "sonner";

// --- UserProvider scaffold ---
import { UserProvider } from "../components/Auth/user-context"
import RealtimeNotificationProvider from "@/components/RealtimeNotificationProvider";
import SimpleNotificationManager from "@/components/Notifications/SimpleNotificationManager";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider 
      defaultTheme="dark" 
      attribute="class"
      enableSystem={false}
      disableTransitionOnChange
    >
      <UserProvider>
        <RealtimeNotificationProvider>
          <SimpleNotificationManager>
            <SidebarProvider>{children}</SidebarProvider>
          </SimpleNotificationManager>
        </RealtimeNotificationProvider>
      </UserProvider>
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  );
}