"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";

export default function ProductionHubLoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-100 p-4 dark:bg-slate-950">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggleSwitch />
      </div>
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-blue-100 bg-white/90 p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-6 flex justify-center">
          <Image src="/images/logo/logo.png" alt="Ressichem" width={200} height={48} className="h-12 w-auto object-contain" priority />
        </div>
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-bold text-blue-900 dark:text-blue-50">Production Hub Login</h2>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-blue-800 dark:text-blue-200">
            <span className="rounded-full bg-blue-100 px-3 py-1 font-medium dark:border dark:border-slate-600 dark:bg-slate-800">Hub</span>
          </div>
        </div>
        <p className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-50">
          Production Hub will be added later. Use Production Site Login for Reactor Area, LMS, and BFS.
        </p>
        <Link href="/auth/sign-in" className="mt-4 block w-full rounded-xl bg-blue-600 p-4 text-center text-sm font-semibold text-white">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
