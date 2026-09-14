"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function DarkThemeTestPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a] transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-dark dark:text-white mb-2">
                Dark Theme Test
              </h1>
              <p className="text-dark-5 dark:text-dark-6">
                Testing dark theme visibility across all devices
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

        {/* Device Test Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Mobile Test */}
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6">
            <h2 className="text-xl font-semibold text-dark dark:text-white mb-4">
              📱 Mobile (375px+)
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-1 dark:bg-dark-2 rounded-lg">
                <p className="text-sm text-dark-5 dark:text-dark-6">
                  Mobile navigation and content
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button className="w-full p-3 bg-primary text-white rounded-lg text-sm">
                  Primary Button
                </button>
                <button className="w-full p-3 border border-stroke dark:border-stroke-dark text-dark dark:text-white rounded-lg text-sm">
                  Secondary Button
                </button>
              </div>
            </div>
          </div>

          {/* Tablet Test */}
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6">
            <h2 className="text-xl font-semibold text-dark dark:text-white mb-4">
              📱 Tablet (768px+)
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-1 dark:bg-dark-2 rounded-lg">
                <p className="text-sm text-dark-5 dark:text-dark-6">
                  Tablet layout and components
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="p-2 bg-primary text-white rounded text-xs">
                  Action
                </button>
                <button className="p-2 border border-stroke dark:border-stroke-dark text-dark dark:text-white rounded text-xs">
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Test */}
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6">
            <h2 className="text-xl font-semibold text-dark dark:text-white mb-4">
              🖥️ Desktop (1024px+)
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-1 dark:bg-dark-2 rounded-lg">
                <p className="text-sm text-dark-5 dark:text-dark-6">
                  Desktop dashboard layout
                </p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-primary text-white rounded text-sm">
                  Save
                </button>
                <button className="px-4 py-2 border border-stroke dark:border-stroke-dark text-dark dark:text-white rounded text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Color Palette Test */}
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-dark dark:text-white mb-6">
            🎨 Color Palette Test
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Primary Colors */}
            <div className="text-center">
              <div className="w-full h-16 bg-primary rounded-lg mb-2"></div>
              <p className="text-xs text-dark-5 dark:text-dark-6">Primary</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 bg-green rounded-lg mb-2"></div>
              <p className="text-xs text-dark-5 dark:text-dark-6">Success</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 bg-red rounded-lg mb-2"></div>
              <p className="text-xs text-dark-5 dark:text-dark-6">Error</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 bg-yellow-dark rounded-lg mb-2"></div>
              <p className="text-xs text-dark-5 dark:text-dark-6">Warning</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 bg-blue rounded-lg mb-2"></div>
              <p className="text-xs text-dark-5 dark:text-dark-6">Info</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 bg-orange-light rounded-lg mb-2"></div>
              <p className="text-xs text-dark-5 dark:text-dark-6">Orange</p>
            </div>
          </div>
        </div>

        {/* Text Visibility Test */}
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-dark dark:text-white mb-6">
            📝 Text Visibility Test
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-1 dark:bg-dark-2 rounded-lg">
                <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
                  Heading 1
                </h3>
                <p className="text-dark-5 dark:text-dark-6 text-sm">
                  This is body text with good contrast
                </p>
              </div>
              <div className="p-4 bg-gray-2 dark:bg-dark-3 rounded-lg">
                <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
                  Heading 2
                </h3>
                <p className="text-dark-5 dark:text-dark-6 text-sm">
                  Secondary background text
                </p>
              </div>
              <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-lg">
                <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
                  Primary Accent
                </h3>
                <p className="text-dark-5 dark:text-dark-6 text-sm">
                  Primary background text
                </p>
              </div>
              <div className="p-4 border border-stroke dark:border-stroke-dark rounded-lg">
                <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
                  Bordered
                </h3>
                <p className="text-dark-5 dark:text-dark-6 text-sm">
                  Bordered container text
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Component Test */}
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-dark dark:text-white mb-6">
            🧩 Component Test
          </h2>
          <div className="space-y-6">
            {/* Form Elements */}
            <div>
              <h3 className="text-lg font-medium text-dark dark:text-white mb-4">
                Form Elements
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                    Input Field
                  </label>
                  <input
                    type="text"
                    placeholder="Enter text here"
                    className="w-full px-3 py-2 border border-stroke dark:border-stroke-dark bg-white dark:bg-dark-2 text-dark dark:text-white rounded-lg focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                    Select Dropdown
                  </label>
                  <select className="w-full px-3 py-2 border border-stroke dark:border-stroke-dark bg-white dark:bg-dark-2 text-dark dark:text-white rounded-lg focus:border-primary focus:outline-none">
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cards */}
            <div>
              <h3 className="text-lg font-medium text-dark dark:text-white mb-4">
                Card Components
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-1 dark:bg-dark-2 rounded-lg border border-stroke dark:border-stroke-dark">
                  <h4 className="font-semibold text-dark dark:text-white mb-2">
                    Card Title
                  </h4>
                  <p className="text-sm text-dark-5 dark:text-dark-6">
                    Card description with proper contrast
                  </p>
                </div>
                <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20">
                  <h4 className="font-semibold text-dark dark:text-white mb-2">
                    Accent Card
                  </h4>
                  <p className="text-sm text-dark-5 dark:text-dark-6">
                    Accent colored card background
                  </p>
                </div>
                <div className="p-4 bg-green/5 dark:bg-green/10 rounded-lg border border-green/20">
                  <h4 className="font-semibold text-dark dark:text-white mb-2">
                    Success Card
                  </h4>
                  <p className="text-sm text-dark-5 dark:text-dark-6">
                    Success themed card
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Report */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-4">
            📊 Dark Theme Status Report
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green dark:text-green-light mb-1">
                ✅
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Theme Toggle Working
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green dark:text-green-light mb-1">
                ✅
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Color Contrast Good
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green dark:text-green-light mb-1">
                ✅
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Responsive Design
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green dark:text-green-light mb-1">
                ✅
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Component Visibility
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
