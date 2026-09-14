"use client";

import { SearchIcon } from "@/assets/icons";
import Image from "next/image";
import Link from "next/link";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { Notification } from "./notification";
import { ThemeToggleSwitch } from "./theme-toggle";
import { UserInfo } from "./user-info";
import { Logo } from "@/components/logo";

export function Header() {
  const { toggleSidebar, isMobile } = useSidebarContext();

  return (
    <>
      {/* Mobile Header */}
      <div className="sm:hidden bg-white dark:bg-gray-800 border-b border-blue-900/20 dark:border-blue-900/30 px-3 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg bg-blue-900/5 dark:bg-gray-700 hover:bg-blue-900/10 dark:hover:bg-gray-600 transition-colors flex-shrink-0 text-blue-900 dark:text-white"
            >
              <MenuIcon />
            </button>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <ThemeToggleSwitch />
            <Notification />
            <UserInfo />
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <header className="hidden sm:block sticky top-0 z-30 w-full flex items-end justify-end border-b border-blue-900/20 bg-white dark:border-blue-900/30 dark:bg-gray-800 py-4 pr-4 md:pr-6">
        <div className="flex justify-end gap-4 ml-auto">
          <button
            onClick={toggleSidebar}
            className="rounded-lg border border-blue-900/20 px-2 py-1 text-blue-900 dark:border-blue-900/30 dark:bg-gray-700 dark:text-white hover:bg-blue-900/10 dark:hover:bg-gray-600 lg:hidden"
          >
            <MenuIcon />
          </button>

          <div className="relative hidden md:block">
            <input
              type="search"
              placeholder="Search..."
              className="w-64 rounded-lg border border-blue-900/20 bg-white px-4 py-2 text-sm text-blue-900 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 focus:outline-none dark:border-blue-900/30 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
            />
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-900 dark:text-blue-400" />
          </div>

          <ThemeToggleSwitch />
          <Notification />
          <UserInfo />
        </div>
      </header>
    </>
  );
}
