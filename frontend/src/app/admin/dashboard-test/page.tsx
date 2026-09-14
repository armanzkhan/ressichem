"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function AdminDashboardTest() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark dark:text-white mb-4">
            Admin Dashboard Dark Mode Test
          </h1>
          <p className="text-gray-6 dark:text-dark-6 mb-4">
            Current theme: <span className="font-semibold">{theme}</span>
          </p>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Toggle Theme
          </button>
        </div>

        {/* Test the exact same structure as admin dashboard */}
        <div className="space-y-6">
          {/* Admin Header */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="px-4 py-6 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">🛡️</div>
                <h1 className="text-2xl font-bold text-dark dark:text-white">
                  Super Admin Dashboard
                </h1>
              </div>
              <p className="text-gray-6 dark:text-dark-6">
                System-wide administration and monitoring tools.
              </p>
            </div>
          </div>

          {/* System Stats */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-6 dark:text-dark-6">
                      Total Companies
                    </p>
                    <p className="text-2xl font-bold text-dark dark:text-white">
                      45
                    </p>
                  </div>
                  <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/20">
                    <div className="text-2xl">🏢</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-6 dark:text-dark-6">
                      Total Users
                    </p>
                    <p className="text-2xl font-bold text-dark dark:text-white">
                      1,234
                    </p>
                  </div>
                  <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
                    <div className="text-2xl">👥</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-6 dark:text-dark-6">
                      Active Sessions
                    </p>
                    <p className="text-2xl font-bold text-dark dark:text-white">
                      89
                    </p>
                  </div>
                  <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/20">
                    <div className="text-2xl">📊</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-6 dark:text-dark-6">
                      System Health
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      99.9%
                    </p>
                  </div>
                  <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
                    <div className="text-2xl">✓</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
