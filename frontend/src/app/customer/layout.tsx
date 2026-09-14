'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check authentication
  useEffect(() => {
    if (!isClient) return;
    
    const token = localStorage.getItem("token");
    const userType = localStorage.getItem("userType");
    
    if (!token || userType !== 'customer') {
      router.push("/customer-login");
      return;
    }
  }, [router, isClient]);

  // Load dark mode preference
  useEffect(() => {
    if (!isClient) return;
    
    const savedTheme = localStorage.getItem('customer-theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, [isClient]);

  // Apply dark mode to document
  useEffect(() => {
    if (!isClient) return;
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode, isClient]);

  const toggleDarkMode = () => {
    if (!isClient) return;
    
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('customer-theme', newMode ? 'dark' : 'light');
  };

  // Mock user data - replace with actual user data from context/API
  const user = {
    name: 'Customer User',
    email: 'customer@example.com'
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: '/customer/portal',
      icon: '🏠',
      current: pathname === '/customer/portal'
    },
    {
      name: 'Products',
      href: '/customer/products',
      icon: '📦',
      current: pathname === '/customer/products'
    },
    {
      name: 'Orders',
      href: '/customer/orders',
      icon: '📋',
      current: pathname === '/customer/orders'
    },
    {
      name: 'Profile',
      href: '/customer/profile',
      icon: '👤',
      current: pathname === '/customer/profile'
    },
    {
      name: 'Notifications',
      href: '/customer/notifications',
      icon: '🔔',
      current: pathname === '/customer/notifications'
    }
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''} bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex`}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-2xl border-r border-white/30 dark:border-gray-700/50
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Customer Portal</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Welcome back</p>
              </div>
            </div>
            <button 
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                  ${item.current 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="text-lg mr-3">{item.icon}</span>
                <span className="flex-1">{item.name}</span>
                {item.current && (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                )}
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Customer
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <div className="sticky top-0 z-40">
          {/* Mobile stunning curved container */}
          <div className="sm:hidden mx-2 mt-2 rounded-3xl bg-gradient-to-br from-white/95 via-white/90 to-white/95 dark:from-gray-800/95 dark:via-gray-800/90 dark:to-gray-800/95 backdrop-blur-xl shadow-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden">
            {/* Top gradient accent */}
            <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-1 rounded-t-3xl"></div>
            
            {/* Main header content */}
            <div className="px-4 py-3 relative">
              <div className="flex justify-between items-center">
                <div className="flex items-center min-w-0 flex-1">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex-shrink-0 mr-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-sm">👤</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent truncate">
                          {navigation.find(item => item.current)?.name || 'Dashboard'}
                        </h1>
                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate font-medium">
                          {navigation.find(item => item.current)?.name === 'Dashboard' 
                            ? 'Welcome to your customer dashboard' 
                            : `Manage your ${navigation.find(item => item.current)?.name.toLowerCase()}`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  {/* Dark mode toggle */}
                  <button
                    onClick={toggleDarkMode}
                    className="p-2.5 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg"
                    title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    {darkMode ? (
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                      </svg>
                    )}
                  </button>

                  {/* Notifications */}
                  <button 
                    className="p-2.5 rounded-xl bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-700 dark:to-emerald-600 hover:from-green-200 hover:to-emerald-300 dark:hover:from-green-600 dark:hover:to-emerald-500 transition-all duration-300 hover:scale-105 relative shadow-md hover:shadow-lg"
                    title="Notifications"
                  >
                    <svg className="w-4 h-4 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L12.828 7H4.828z" />
                    </svg>
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse shadow-sm"></span>
                  </button>

                  {/* Logout Button */}
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('userType');
                      localStorage.removeItem('userRole');
                      window.location.href = '/customer-login';
                    }}
                    className="p-2.5 rounded-xl bg-gradient-to-br from-red-100 to-red-200 dark:from-red-700 dark:to-red-600 hover:from-red-200 hover:to-red-300 dark:hover:from-red-600 dark:hover:to-red-500 transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg border border-red-200 dark:border-red-500"
                    title="Logout"
                  >
                    <svg className="w-4 h-4 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Bottom gradient accent */}
            <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-1 rounded-b-3xl"></div>
          </div>
          
          {/* Desktop header */}
          <div className="hidden sm:block bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-lg border-b border-white/30 dark:border-gray-700/50">
            <div className="px-4 lg:px-8">
              <div className="flex justify-between items-center py-3 sm:py-4">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white truncate">
                      {navigation.find(item => item.current)?.name || 'Dashboard'}
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                      {navigation.find(item => item.current)?.name === 'Dashboard' 
                        ? 'Welcome to your customer dashboard' 
                        : `Manage your ${navigation.find(item => item.current)?.name.toLowerCase()}`
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-shrink-0">
                  {/* User Profile - Hidden on mobile, shown on larger screens */}
                  <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Customer</span>
                  </div>

                  {/* Dark mode toggle */}
                  <button
                    onClick={toggleDarkMode}
                    className="p-2 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                    title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    {darkMode ? (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                      </svg>
                    )}
                  </button>

                  {/* Notifications */}
                  <button 
                    className="p-2 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 hover:from-green-50 hover:to-emerald-50 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-200 hover:scale-105 relative shadow-sm hover:shadow-md"
                    title="Notifications"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L12.828 7H4.828z" />
                    </svg>
                    <span className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse shadow-sm"></span>
                  </button>

                  {/* Logout Button */}
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('userType');
                      localStorage.removeItem('userRole');
                      window.location.href = '/customer-login';
                    }}
                    className="p-2 rounded-xl bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/20 hover:from-red-200 hover:to-red-300 dark:hover:from-red-800/30 dark:hover:to-red-700/30 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md border border-red-200 dark:border-red-700"
                    title="Logout"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}