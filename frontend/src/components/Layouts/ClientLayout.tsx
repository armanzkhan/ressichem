'use client';

import { Providers } from "@/app/providers";
import ConditionalLayout from "./ConditionalLayout";
import PWAProvider from "@/components/PWAProvider";
import AIChatbotFloatingButton from "@/components/AIChatbotFloatingButton";
import WhatsAppMessenger from "@/components/chat/WhatsAppMessenger";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <PWAProvider>
      <Providers>
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
        <WhatsAppMessenger />
        <AIChatbotFloatingButton />
      </Providers>
    </PWAProvider>
  );
}
