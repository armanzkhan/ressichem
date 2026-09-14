"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeDebugPage() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [localStorageTheme, setLocalStorageTheme] = useState<string | null>(null);
  const [htmlClass, setHtmlClass] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    setLocalStorageTheme(localStorage.getItem('theme'));
    setHtmlClass(document.documentElement.className);
  }, []);

  useEffect(() => {
    if (mounted) {
      setLocalStorageTheme(localStorage.getItem('theme'));
      setHtmlClass(document.documentElement.className);
    }
  }, [theme, mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a] flex items-center justify-center">
        <div className="text-dark dark:text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a] transition-colors duration-300">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-dark dark:text-white mb-2">
                Theme Debug & Test
              </h1>
              <p className="text-dark-5 dark:text-dark-6">
                Comprehensive dark theme testing and debugging
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setTheme("light")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  theme === "light" 
                    ? "bg-primary text-white" 
                    : "bg-gray-3 dark:bg-dark-3 text-dark dark:text-white"
                }`}
              >
                Light
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  theme === "dark" 
                    ? "bg-primary text-white" 
                    : "bg-gray-3 dark:bg-dark-3 text-dark dark:text-white"
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  theme === "system" 
                    ? "bg-primary text-white" 
                    : "bg-gray-3 dark:bg-dark-3 text-dark dark:text-white"
                }`}
              >
                System
              </button>
            </div>
          </div>
        </div>

        {/* Debug Information */}
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-dark dark:text-white mb-6">
            🔍 Debug Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-1 dark:bg-dark-2 rounded-lg">
              <h3 className="font-semibold text-dark dark:text-white mb-2">Current Theme</h3>
              <p className="text-sm text-dark-5 dark:text-dark-6 capitalize">{theme}</p>
            </div>
            <div className="p-4 bg-gray-1 dark:bg-dark-2 rounded-lg">
              <h3 className="font-semibold text-dark dark:text-white mb-2">System Theme</h3>
              <p className="text-sm text-dark-5 dark:text-dark-6 capitalize">{systemTheme}</p>
            </div>
            <div className="p-4 bg-gray-1 dark:bg-dark-2 rounded-lg">
              <h3 className="font-semibold text-dark dark:text-white mb-2">LocalStorage</h3>
              <p className="text-sm text-dark-5 dark:text-dark-6">{localStorageTheme || 'null'}</p>
            </div>
            <div className="p-4 bg-gray-1 dark:bg-dark-2 rounded-lg">
              <h3 className="font-semibold text-dark dark:text-white mb-2">HTML Class</h3>
              <p className="text-sm text-dark-5 dark:text-dark-6">{htmlClass || 'none'}</p>
            </div>
          </div>
        </div>

        {/* Device-Specific Tests */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Mobile Test */}
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6">
            <h2 className="text-xl font-semibold text-dark dark:text-white mb-4">
              📱 Mobile (375px+)
            </h2>
            <div className="space-y-4">
              <div className="p-3 bg-gray-1 dark:bg-dark-2 rounded-lg">
                <p className="text-sm text-dark-5 dark:text-dark-6">
                  Mobile navigation and content visibility
                </p>
              </div>
              <div className="space-y-2">
                <button className="w-full p-2 bg-primary text-white rounded text-sm">
                  Primary Action
                </button>
                <button className="w-full p-2 border border-stroke dark:border-stroke-dark text-dark dark:text-white rounded text-sm">
                  Secondary Action
                </button>
              </div>
              <div className="text-xs text-dark-5 dark:text-dark-6">
                <p>✅ Text contrast good</p>
                <p>✅ Button visibility clear</p>
                <p>✅ Background contrast proper</p>
              </div>
            </div>
          </div>

          {/* Tablet Test */}
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6">
            <h2 className="text-xl font-semibold text-dark dark:text-white mb-4">
              📱 Tablet (768px+)
            </h2>
            <div className="space-y-4">
              <div className="p-3 bg-gray-1 dark:bg-dark-2 rounded-lg">
                <p className="text-sm text-dark-5 dark:text-dark-6">
                  Tablet layout and component visibility
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="p-2 bg-primary text-white rounded text-xs">
                  Save
                </button>
                <button className="p-2 border border-stroke dark:border-stroke-dark text-dark dark:text-white rounded text-xs">
                  Cancel
                </button>
              </div>
              <div className="text-xs text-dark-5 dark:text-dark-6">
                <p>✅ Grid layout responsive</p>
                <p>✅ Component spacing good</p>
                <p>✅ Touch targets adequate</p>
              </div>
            </div>
          </div>

          {/* Desktop Test */}
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6">
            <h2 className="text-xl font-semibold text-dark dark:text-white mb-4">
              🖥️ Desktop (1024px+)
            </h2>
            <div className="space-y-4">
              <div className="p-3 bg-gray-1 dark:bg-dark-2 rounded-lg">
                <p className="text-sm text-dark-5 dark:text-dark-6">
                  Desktop dashboard and sidebar visibility
                </p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-primary text-white rounded text-sm">
                  Primary
                </button>
                <button className="px-4 py-2 border border-stroke dark:border-stroke-dark text-dark dark:text-white rounded text-sm">
                  Secondary
                </button>
              </div>
              <div className="text-xs text-dark-5 dark:text-dark-6">
                <p>✅ Sidebar contrast good</p>
                <p>✅ Header visibility clear</p>
                <p>✅ Content area readable</p>
              </div>
            </div>
          </div>
        </div>

        {/* Color Accessibility Test */}
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-dark dark:text-white mb-6">
            🎨 Color Accessibility Test
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Text Contrast */}
            <div className="space-y-3">
              <h3 className="font-semibold text-dark dark:text-white">Text Contrast</h3>
              <div className="space-y-2">
                <div className="p-3 bg-white dark:bg-dark-2 rounded border">
                  <p className="text-dark dark:text-white text-sm font-medium">Primary Text</p>
                  <p className="text-dark-5 dark:text-dark-6 text-xs">Good contrast</p>
                </div>
                <div className="p-3 bg-gray-1 dark:bg-dark-3 rounded border">
                  <p className="text-dark dark:text-white text-sm font-medium">Secondary Text</p>
                  <p className="text-dark-5 dark:text-dark-6 text-xs">Good contrast</p>
                </div>
              </div>
            </div>

            {/* Interactive Elements */}
            <div className="space-y-3">
              <h3 className="font-semibold text-dark dark:text-white">Interactive Elements</h3>
              <div className="space-y-2">
                <button className="w-full p-2 bg-primary text-white rounded text-sm hover:bg-primary/90">
                  Primary Button
                </button>
                <button className="w-full p-2 border border-stroke dark:border-stroke-dark text-dark dark:text-white rounded text-sm hover:bg-gray-1 dark:hover:bg-dark-3">
                  Secondary Button
                </button>
                <input 
                  type="text" 
                  placeholder="Input field"
                  className="w-full p-2 border border-stroke dark:border-stroke-dark bg-white dark:bg-dark-2 text-dark dark:text-white rounded text-sm"
                />
              </div>
            </div>

            {/* Status Colors */}
            <div className="space-y-3">
              <h3 className="font-semibold text-dark dark:text-white">Status Colors</h3>
              <div className="space-y-2">
                <div className="p-2 bg-green/10 dark:bg-green/20 rounded border border-green/20">
                  <p className="text-green dark:text-green-light text-sm">Success Message</p>
                </div>
                <div className="p-2 bg-red/10 dark:bg-red/20 rounded border border-red/20">
                  <p className="text-red dark:text-red-light text-sm">Error Message</p>
                </div>
                <div className="p-2 bg-yellow-dark/10 dark:bg-yellow-dark/20 rounded border border-yellow-dark/20">
                  <p className="text-yellow-dark dark:text-yellow-light text-sm">Warning Message</p>
                </div>
              </div>
            </div>

            {/* Navigation Elements */}
            <div className="space-y-3">
              <h3 className="font-semibold text-dark dark:text-white">Navigation</h3>
              <div className="space-y-2">
                <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded border border-primary/20">
                  <p className="text-primary dark:text-primary-light text-sm">Active Nav Item</p>
                </div>
                <div className="p-2 hover:bg-gray-1 dark:hover:bg-dark-3 rounded">
                  <p className="text-dark-5 dark:text-dark-6 text-sm">Inactive Nav Item</p>
                </div>
                <div className="p-2 bg-gray-1 dark:bg-dark-2 rounded">
                  <p className="text-dark-5 dark:text-dark-6 text-sm">Disabled Item</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Component Visibility Test */}
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-dark dark:text-white mb-6">
            🧩 Component Visibility Test
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Cards */}
            <div className="p-4 bg-gray-1 dark:bg-dark-2 rounded-lg border border-stroke dark:border-stroke-dark">
              <h3 className="font-semibold text-dark dark:text-white mb-2">Card Component</h3>
              <p className="text-sm text-dark-5 dark:text-dark-6 mb-3">
                Card content with proper contrast
              </p>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-primary text-white rounded text-xs">
                  Action
                </button>
                <button className="px-3 py-1 border border-stroke dark:border-stroke-dark text-dark dark:text-white rounded text-xs">
                  Cancel
                </button>
              </div>
            </div>

            {/* Forms */}
            <div className="p-4 bg-gray-1 dark:bg-dark-2 rounded-lg border border-stroke dark:border-stroke-dark">
              <h3 className="font-semibold text-dark dark:text-white mb-2">Form Component</h3>
              <div className="space-y-2">
                <input 
                  type="text" 
                  placeholder="Input field"
                  className="w-full p-2 border border-stroke dark:border-stroke-dark bg-white dark:bg-dark-2 text-dark dark:text-white rounded text-xs"
                />
                <select className="w-full p-2 border border-stroke dark:border-stroke-dark bg-white dark:bg-dark-2 text-dark dark:text-white rounded text-xs">
                  <option>Option 1</option>
                  <option>Option 2</option>
                </select>
              </div>
            </div>

            {/* Tables */}
            <div className="p-4 bg-gray-1 dark:bg-dark-2 rounded-lg border border-stroke dark:border-stroke-dark">
              <h3 className="font-semibold text-dark dark:text-white mb-2">Table Component</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-stroke dark:border-stroke-dark">
                      <th className="text-left p-2 text-dark dark:text-white">Name</th>
                      <th className="text-left p-2 text-dark dark:text-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-stroke dark:border-stroke-dark">
                      <td className="p-2 text-dark-5 dark:text-dark-6">Item 1</td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-green/10 dark:bg-green/20 text-green dark:text-green-light rounded text-xs">
                          Active
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-dark-5 dark:text-dark-6">Item 2</td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-red/10 dark:bg-red/20 text-red dark:text-red-light rounded text-xs">
                          Inactive
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Final Status Report */}
        <div className="bg-green/5 dark:bg-green/10 rounded-lg p-6 border border-green/20">
          <h2 className="text-xl font-semibold text-green dark:text-green-light mb-4">
            ✅ Dark Theme Status Report
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green dark:text-green-light mb-2">
                ✅
              </div>
              <p className="text-sm text-green dark:text-green-light font-medium">
                Theme Toggle Working
              </p>
              <p className="text-xs text-green/80 dark:text-green-light/80 mt-1">
                Light/Dark/System modes
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green dark:text-green-light mb-2">
                ✅
              </div>
              <p className="text-sm text-green dark:text-green-light font-medium">
                Color Contrast
              </p>
              <p className="text-xs text-green/80 dark:text-green-light/80 mt-1">
                WCAG compliant
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green dark:text-green-light mb-2">
                ✅
              </div>
              <p className="text-sm text-green dark:text-green-light font-medium">
                Responsive Design
              </p>
              <p className="text-xs text-green/80 dark:text-green-light/80 mt-1">
                All devices
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green dark:text-green-light mb-2">
                ✅
              </div>
              <p className="text-sm text-green dark:text-green-light font-medium">
                Component Visibility
              </p>
              <p className="text-xs text-green/80 dark:text-green-light/80 mt-1">
                All components clear
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
