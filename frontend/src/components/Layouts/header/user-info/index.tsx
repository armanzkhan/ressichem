"use client";

import { ChevronUpIcon } from "@/assets/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { useUser } from "@/components/Auth/user-context";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOutIcon, SettingsIcon, UserIcon } from "./icons";

export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useUser();
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  const getDisplayUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith('/uploads')) return `${backendUrl}${url}`;
    return url;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;
        const resp = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
        if (resp.ok) {
          const data = await resp.json();
          setAvatarUrl(data.user?.avatarUrl || "");
        }
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    router.push("/auth/sign-in");
  };

  if (!user) {
    return (
      <Link
        href="/auth/sign-in"
        className="flex items-center gap-2 rounded-lg border border-blue-900/20 bg-white px-4 py-2 text-blue-900 hover:bg-blue-900/5 dark:border-blue-900/30 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
      >
        <UserIcon className="size-5 text-blue-900 dark:text-white" />
        <span className="text-sm font-medium">Sign In</span>
      </Link>
    );
  }

  const displayName = user.email?.split('@')[0] || 'User';
  const userInitials = displayName.charAt(0).toUpperCase();

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="rounded align-middle outline-none ring-blue-900 ring-offset-2 focus-visible:ring-1 dark:ring-offset-gray-dark">
        <span className="sr-only">My Account</span>

        <figure className="flex items-center gap-2">
          {avatarUrl ? (
            <img
              src={getDisplayUrl(avatarUrl)}
              alt="Avatar"
              className="size-10 sm:size-12 rounded-full object-cover border border-blue-900/20 dark:border-blue-900/30 flex-shrink-0"
            />
          ) : (
            <div className="flex size-10 sm:size-12 items-center justify-center rounded-full bg-blue-900 text-white font-semibold flex-shrink-0">
              {userInitials}
            </div>
          )}
          <figcaption className="flex items-center gap-1 font-medium text-blue-900 dark:text-white min-w-0">
            <span className="text-sm sm:text-base truncate">{displayName}</span>
            {user.isSuperAdmin && (
              <span className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 flex-shrink-0">
                Super Admin
              </span>
            )}

            <ChevronUpIcon
              aria-hidden
              className={cn(
                "rotate-180 transition-transform flex-shrink-0",
                isOpen && "rotate-0",
              )}
              strokeWidth={1.5}
            />
          </figcaption>
        </figure>
      </DropdownTrigger>

      <DropdownContent
        className="border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-gray-dark min-[230px]:min-w-[17.5rem] max-w-[calc(100vw-2rem)]"
        align="end"
      >
        <h2 className="sr-only">User information</h2>

        <figure className="flex items-center gap-2.5 px-5 py-3.5">
          {avatarUrl ? (
            <img
              src={getDisplayUrl(avatarUrl)}
              alt="Avatar"
              className="size-12 rounded-full object-cover border border-blue-900/20 dark:border-blue-900/30"
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-blue-900 text-white font-semibold">
              {userInitials}
            </div>
          )}

          <figcaption className="space-y-1 text-base font-medium">
            <div className="mb-2 leading-none text-blue-900 dark:text-white">
              {displayName}
            </div>

            <div className="leading-none text-blue-700 dark:text-blue-300">{user.email}</div>
            {user.department && (
              <div className="text-sm text-blue-700 dark:text-blue-300">
                {user.department}
              </div>
            )}
            {user.roles && user.roles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {user.roles.map((role, index) => (
                  <span
                    key={`${role}-${index}`}
                    className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {role}
                  </span>
                ))}
              </div>
            )}
          </figcaption>
        </figure>

        <hr className="border-blue-900/20 dark:border-blue-900/30" />

        <div className="p-2 text-base text-blue-900 dark:text-white [&>*]:cursor-pointer">
          <Link
            href={"/profile"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-blue-900/5 hover:text-blue-900 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
          >
            <UserIcon className="text-blue-900 dark:text-white" />

            <span className="mr-auto text-base font-medium">View profile</span>
          </Link>

          <Link
            href={"/pages/settings"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-blue-900/5 hover:text-blue-900 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
          >
            <SettingsIcon className="text-blue-900 dark:text-white" />

            <span className="mr-auto text-base font-medium">
              Account Settings
            </span>
          </Link>
        </div>

        <hr className="border-blue-900/20 dark:border-blue-900/30" />

        <div className="p-2 text-base text-blue-900 dark:text-white">
          <button
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-blue-900/5 hover:text-blue-900 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
            onClick={handleLogout}
          >
            <LogOutIcon className="text-blue-900 dark:text-white" />

            <span className="text-base font-medium">Log out</span>
          </button>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
