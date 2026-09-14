"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";

const THEMES = [
  {
    name: "light",
    Icon: SunMedium,
  },
  {
    name: "dark",
    Icon: MoonStar,
  },
];

export function ThemeToggleSwitch() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="theme-toggle group rounded-full bg-gray-3 p-[5px] text-blue-900 outline-1 outline-blue-900 focus-visible:outline dark:bg-[#020D1A] dark:text-white"
    >
      <span className="sr-only">
        Switch to {theme === "light" ? "dark" : "light"} mode
      </span>

      <span aria-hidden className="relative flex gap-2.5">
        {/* Indicator */}
        <span className="theme-toggle-indicator absolute size-[38px] rounded-full border border-gray-200 bg-white transition-all dark:translate-x-[48px] dark:border-none dark:bg-dark-2 dark:group-hover:bg-dark-3" />

        {THEMES.map(({ name, Icon }) => (
          <span
            key={name}
            className={cn(
              "relative grid size-[38px] place-items-center rounded-full",
              name === "dark" && "dark:text-white",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        ))}
      </span>
    </button>
  );
}
