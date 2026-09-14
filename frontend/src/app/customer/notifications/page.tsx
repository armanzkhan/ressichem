'use client';

import React, { useState, useEffect } from 'react';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  orderId?: string;
}

export default function CustomerNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // For now, we'll create some mock notifications
      // In a real app, this would fetch from an API
      const mockNotifications: Notification[] = [
        {
          _id: '1',
          title: 'Order Status Update',
          message: 'Your order #ORD-001 has been approved and is now being processed. You will receive tracking information once it ships.',
          type: 'order_update',
          isRead: false,
          createdAt: typeof window !== 'undefined' ? new Date().toISOString() : new Date('2024-01-01').toISOString(),
          orderId: 'ORD-001'
        },
        {
          _id: '2',
          title: 'New Product Available',
          message: 'A new product from your assigned manager is now available in your product catalog. Check it out!',
          type: 'product_update',
          isRead: true,
          createdAt: typeof window !== 'undefined' ? new Date(Date.now() - 86400000).toISOString() : new Date('2024-01-01').toISOString()
        },
        {
          _id: '3',
          title: 'Welcome to Ressichem!',
          message: 'Welcome to the customer portal. You can now browse products, place orders, and track your shipments.',
          type: 'welcome',
          isRead: true,
          createdAt: typeof window !== 'undefined' ? new Date(Date.now() - 172800000).toISOString() : new Date('2024-01-01').toISOString()
        },
        {
          _id: '4',
          title: 'Order Shipped',
          message: 'Your order #ORD-002 has been shipped and is on its way. Expected delivery: 3-5 business days.',
          type: 'order_update',
          isRead: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          orderId: 'ORD-002'
        },
        {
          _id: '5',
          title: 'Price Update',
          message: 'Some products in your catalog have been updated with new pricing. Check the latest prices.',
          type: 'product_update',
          isRead: true,
          createdAt: new Date(Date.now() - 259200000).toISOString()
        }
      ];
      
      setNotifications(mockNotifications);
      setMessage('✅ Notifications loaded successfully!');
    } catch (error) {
      setMessage('❌ Error loading notifications');
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_update': return '📦';
      case 'product_update': return '🆕';
      case 'welcome': return '👋';
      case 'shipping': return '🚚';
      case 'payment': return '💳';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order_update': return 'from-blue-500 to-blue-600';
      case 'product_update': return 'from-green-500 to-green-600';
      case 'welcome': return 'from-purple-500 to-purple-600';
      case 'shipping': return 'from-orange-500 to-orange-600';
      case 'payment': return 'from-emerald-500 to-emerald-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'order_update': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700';
      case 'product_update': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
      case 'welcome': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700';
      case 'shipping': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700';
      case 'payment': return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700';
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700';
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif._id === notificationId 
          ? { ...notif, isRead: true }
          : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  // Filter and sort notifications
  const filteredNotifications = notifications
    .filter(notification => {
      const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           notification.message.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'all' || 
        (filter === 'unread' && !notification.isRead) ||
        (filter === 'read' && notification.isRead) ||
        notification.type === filter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'unread':
          return Number(a.isRead) - Number(b.isRead);
        default:
          return 0;
      }
    });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Loading Notifications</h2>
          <p className="text-gray-600 dark:text-gray-400">Fetching your latest updates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header Section */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-white/30 dark:border-gray-700/50 sticky top-0 z-30">
        <div className="px-4 py-6">
          <div className="flex flex-col space-y-4">
            {/* Title */}
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Notifications
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Stay updated with your latest activities
              </p>
            </div>

            {/* Search and Filters */}
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/90 dark:bg-gray-700/90 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Filter Dropdown */}
                <div className="flex-1 relative">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-white/90 dark:bg-gray-700/90 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white appearance-none pr-10"
                  >
                    <option value="all">All Notifications</option>
                    <option value="unread">Unread Only</option>
                    <option value="read">Read Only</option>
                    <option value="order_update">Order Updates</option>
                    <option value="product_update">Product Updates</option>
                    <option value="welcome">Welcome</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Sort Dropdown */}
                <div className="flex-1 relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-3 bg-white/90 dark:bg-gray-700/90 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white appearance-none pr-10"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="unread">Unread First</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Mark All Read Button */}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Mark All Read
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-2xl border-l-4 ${
            message.startsWith('✅') 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-400 text-green-800 dark:text-green-200' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-400 text-red-800 dark:text-red-200'
          }`}>
            <div className="flex items-center">
              <span className="text-lg mr-2">{message.startsWith('✅') ? '✅' : '❌'}</span>
              <span className="font-medium">{message.substring(2)}</span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </p>
            {unreadCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  {unreadCount} unread
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length > 0 ? (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div 
                key={notification._id} 
                className={`group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/30 dark:border-gray-700/50 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] overflow-hidden ${
                  !notification.isRead ? 'ring-2 ring-blue-200 dark:ring-blue-700' : ''
                }`}
                onClick={() => !notification.isRead && markAsRead(notification._id)}
              >
                <div className={`p-6 ${getNotificationBgColor(notification.type)}`}>
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 bg-gradient-to-r ${getNotificationColor(notification.type)} rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                      <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className={`text-lg font-bold ${
                              !notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {notification.title}
                            </h3>
                            {!notification.isRead && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 animate-pulse">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                            {notification.message}
                          </p>
                          
                          {/* Order ID if available */}
                          {notification.orderId && (
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                              <span className="mr-2">📦</span>
                              Order: {notification.orderId}
                            </div>
                          )}
                        </div>

                        {/* Time and Actions */}
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {new Date(notification.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {!notification.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification._id);
                              }}
                              className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/30 dark:border-gray-700/50 rounded-3xl p-12 shadow-lg">
              <div className="text-8xl mb-6">🔔</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {searchTerm || filter !== 'all' ? 'No Notifications Found' : 'No Notifications Yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {searchTerm || filter !== 'all' 
                  ? 'Try adjusting your search or filter criteria to find notifications.'
                  : 'You don\'t have any notifications yet. We\'ll notify you when there are updates about your orders, products, or account.'
                }
              </p>
              {(searchTerm || filter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilter('all');
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl font-medium hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}