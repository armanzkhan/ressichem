"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function WhiteBackgroundTestPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
                White Background Text Visibility Test
              </h1>
              <p className="text-dark-5 dark:text-dark-6">
                Testing text visibility on white backgrounds in dark mode
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-dark-5 dark:text-dark-6">
                Current: <span className="font-semibold capitalize">{theme}</span>
              </div>
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Toggle Theme
              </button>
            </div>
          </div>
        </div>

        {/* Test Cases */}
        <div className="space-y-8">
          {/* Test 1: White Background with Dark Text */}
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6">
            <h2 className="text-xl font-semibold text-dark dark:text-white mb-6">
              ✅ Test 1: White Background with Proper Dark Text
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-gray-dark rounded-lg border border-stroke dark:border-stroke-dark">
                <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
                  This is a heading with proper contrast
                </h3>
                <p className="text-dark-5 dark:text-dark-6 mb-3">
                  This is body text with good contrast on white background in light mode and dark background in dark mode.
                </p>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-primary text-white rounded text-sm">
                    Primary Button
                  </button>
                  <button className="px-3 py-1 border border-stroke dark:border-stroke-dark text-dark dark:text-white rounded text-sm">
                    Secondary Button
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Test 2: White Background with Wrong Text Colors (PROBLEM) */}
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6">
            <h2 className="text-xl font-semibold text-dark dark:text-white mb-6">
              ❌ Test 2: White Background with Wrong Text Colors (PROBLEM)
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-gray-dark rounded-lg border border-stroke dark:border-stroke-dark">
                <h3 className="text-lg font-semibold mb-2">
                  This heading has NO dark mode text color - INVISIBLE in dark mode!
                </h3>
                <p className="text-gray-600 mb-3">
                  This text has NO dark mode color - INVISIBLE in dark mode!
                </p>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-primary text-white rounded text-sm">
                    This button is OK
                  </button>
                  <button className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-sm">
                    This button has NO dark mode colors - INVISIBLE in dark mode!
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Test 3: Fixed White Background with Proper Colors */}
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6">
            <h2 className="text-xl font-semibold text-dark dark:text-white mb-6">
              ✅ Test 3: Fixed White Background with Proper Dark Text
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-gray-dark rounded-lg border border-stroke dark:border-stroke-dark">
                <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
                  This heading has proper dark mode text color - VISIBLE in both modes!
                </h3>
                <p className="text-dark-5 dark:text-dark-6 mb-3">
                  This text has proper dark mode color - VISIBLE in both modes!
                </p>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-primary text-white rounded text-sm">
                    This button is OK
                  </button>
                  <button className="px-3 py-1 border border-stroke dark:border-stroke-dark text-dark dark:text-white rounded text-sm">
                    This button has proper dark mode colors - VISIBLE in both modes!
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Test 4: Form Elements */}
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6">
            <h2 className="text-xl font-semibold text-dark dark:text-white mb-6">
              📝 Test 4: Form Elements on White Background
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-gray-dark rounded-lg border border-stroke dark:border-stroke-dark">
                <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">
                  Form with Proper Dark Mode Colors
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-dark dark:text-white mb-1">
                      Input Field (Proper Colors)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter text here"
                      className="w-full px-3 py-2 border border-stroke dark:border-stroke-dark bg-white dark:bg-dark-2 text-dark dark:text-white rounded-lg focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark dark:text-white mb-1">
                      Select Dropdown (Proper Colors)
                    </label>
                    <select className="w-full px-3 py-2 border border-stroke dark:border-stroke-dark bg-white dark:bg-dark-2 text-dark dark:text-white rounded-lg focus:border-primary focus:outline-none">
                      <option>Option 1</option>
                      <option>Option 2</option>
                      <option>Option 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark dark:text-white mb-1">
                      Textarea (Proper Colors)
                    </label>
                    <textarea
                      placeholder="Enter description here"
                      rows={3}
                      className="w-full px-3 py-2 border border-stroke dark:border-stroke-dark bg-white dark:bg-dark-2 text-dark dark:text-white rounded-lg focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Test 5: Cards and Components */}
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6">
            <h2 className="text-xl font-semibold text-dark dark:text-white mb-6">
              🎴 Test 5: Cards and Components on White Background
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-1 dark:bg-dark-2 rounded-lg border border-stroke dark:border-stroke-dark">
                <h3 className="font-semibold text-dark dark:text-white mb-2">Card Title</h3>
                <p className="text-sm text-dark-5 dark:text-dark-6 mb-3">
                  Card content with proper contrast
                </p>
                <div className="flex gap-2">
                  <button className="px-2 py-1 bg-primary text-white rounded text-xs">
                    Action
                  </button>
                  <button className="px-2 py-1 border border-stroke dark:border-stroke-dark text-dark dark:text-white rounded text-xs">
                    Cancel
                  </button>
                </div>
              </div>

              <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20">
                <h3 className="font-semibold text-dark dark:text-white mb-2">Accent Card</h3>
                <p className="text-sm text-dark-5 dark:text-dark-6 mb-3">
                  Accent colored card with proper contrast
                </p>
                <div className="flex gap-2">
                  <button className="px-2 py-1 bg-primary text-white rounded text-xs">
                    Primary
                  </button>
                  <button className="px-2 py-1 border border-primary/30 text-primary dark:text-primary-light rounded text-xs">
                    Accent
                  </button>
                </div>
              </div>

              <div className="p-4 bg-green/5 dark:bg-green/10 rounded-lg border border-green/20">
                <h3 className="font-semibold text-dark dark:text-white mb-2">Success Card</h3>
                <p className="text-sm text-dark-5 dark:text-dark-6 mb-3">
                  Success themed card with proper contrast
                </p>
                <div className="flex gap-2">
                  <button className="px-2 py-1 bg-green text-white rounded text-xs">
                    Success
                  </button>
                  <button className="px-2 py-1 border border-green/30 text-green dark:text-green-light rounded text-xs">
                    Info
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Test 6: Status Indicators */}
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6">
            <h2 className="text-xl font-semibold text-dark dark:text-white mb-6">
              🚦 Test 6: Status Indicators on White Background
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-gray-dark rounded-lg border border-stroke dark:border-stroke-dark">
                <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">
                  Status Indicators with Proper Colors
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-dark dark:text-white">Online - Good contrast</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-dark dark:text-white">Warning - Good contrast</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-dark dark:text-white">Error - Good contrast</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-dark dark:text-white">Info - Good contrast</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-4">
            📋 White Background Text Visibility Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">✅ Correct Implementation</h3>
              <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                <li>• Use <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">text-dark dark:text-white</code></li>
                <li>• Use <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">text-dark-5 dark:text-dark-6</code></li>
                <li>• Use <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">border-stroke dark:border-stroke-dark</code></li>
                <li>• Use <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">bg-white dark:bg-gray-dark</code></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-red-700 dark:text-red-300 mb-2">❌ Common Mistakes</h3>
              <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                <li>• Using <code className="bg-red-100 dark:bg-red-800 px-1 rounded">text-gray-600</code> without dark mode</li>
                <li>• Using <code className="bg-red-100 dark:bg-red-800 px-1 rounded">text-gray-700</code> without dark mode</li>
                <li>• Using <code className="bg-red-100 dark:bg-red-800 px-1 rounded">border-gray-300</code> without dark mode</li>
                <li>• Using <code className="bg-red-100 dark:bg-red-800 px-1 rounded">bg-white</code> without dark background</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
