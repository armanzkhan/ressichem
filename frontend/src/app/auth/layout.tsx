import "@/css/satoshi.css";
import "@/css/style.css";

import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";

import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { Providers } from "../providers";

export const metadata: Metadata = {
  title: "Authentication | Ressichem Admin",
  description: "Sign in to your Ressichem Admin account",
};

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <Providers>
      <NextTopLoader color="#5750F1" showSpinner={false} />
      <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a]">
        {children}
      </div>
    </Providers>
  );
}