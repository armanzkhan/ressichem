"use client";

import WhatsAppMessenger from "@/components/chat/WhatsAppMessenger";

/** Full-page entry that still uses the floating WhatsApp-style messenger. */
export default function MessagesPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-50">Messages</h1>
      <p className="text-sm text-blue-700 dark:text-blue-200 max-w-md">
        Use the green chat button (bottom-right) to open WhatsApp-style messaging — 1:1 chats, groups,
        and Ressichem AI.
      </p>
      <WhatsAppMessenger />
    </div>
  );
}
