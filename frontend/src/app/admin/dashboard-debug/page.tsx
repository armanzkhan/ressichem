"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function AdminDashboardDebug() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [htmlClass, setHtmlClass] = useState("");

  useEffect(() => {
    setMounted(true);
    setHtmlClass(document.documentElement.className);
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setHtmlClass(document.documentElement.className);
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-4">
            Dark Mode Debug Information
          </h1>
          
          <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-lg mb-4">
            <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Debug Information:
            </h2>
            <p className="text-yellow-700 dark:text-yellow-300">
              <strong>Theme from useTheme:</strong> {theme}
            </p>
            <p className="text-yellow-700 dark:text-yellow-300">
              <strong>HTML class:</strong> {htmlClass}
            </p>
            <p className="text-yellow-700 dark:text-yellow-300">
              <strong>Has 'dark' class:</strong> {htmlClass.includes('dark') ? 'YES' : 'NO'}
            </p>
          </div>
          
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Toggle Theme
          </button>
        </div>

        {/* Test the exact admin dashboard structure */}
        <div className="space-y-6">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="px-4 py-6 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">🛡️</div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Super Admin Dashboard
                </h1>
              </div>
              <p className="text-gray-6 dark:text-dark-6">
                System-wide administration and monitoring tools.
              </p>
            </div>
          </div>

          {/* Test stats cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-6 dark:text-dark-6">
                      Total Companies
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
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
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      1,234
                    </p>
                  </div>
                  <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
                    <div className="text-2xl">👥</div>
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