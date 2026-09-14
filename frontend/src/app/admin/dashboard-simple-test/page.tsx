"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function AdminDashboardSimpleTest() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-4">
            Simple Dark Mode Test
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Current theme: <span className="font-semibold">{theme}</span>
          </p>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Toggle Theme
          </button>
        </div>

        {/* Test with standard Tailwind classes */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
              Standard Tailwind Test
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              This should be dark in light mode, light in dark mode
            </p>
            <div className="mt-4">
              <p className="text-2xl font-bold text-black dark:text-white">1,234</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
            </div>
          </div>

          {/* Test with custom classes */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Custom Classes Test
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Using text-gray-900 dark:text-white
            </p>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">45</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Companies</p>
            </div>
          </div>

          {/* Test with exact admin dashboard structure */}
          <div className="rounded-sm border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="px-4 py-6 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">🛡️</div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Super Admin Dashboard
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                System-wide administration and monitoring tools.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
