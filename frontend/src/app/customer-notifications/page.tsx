'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/Auth/user-context';
import CustomerLayout from '../../components/Layouts/CustomerLayout';

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
  const { user } = useUser();
  
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      if (!token) {
        setMessage('❌ Please log in to view notifications');
        setLoading(false);
        return;
      }
      
      // Fetch notifications from API
      const response = await fetch('/api/notifications/recent?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const notificationsData = await response.json();
      
      // Transform API response to match our interface
      const transformedNotifications: Notification[] = notificationsData.map((notif: any) => {
        // Extract orderId - prefer orderNumber, then orderId, then entityId
        // Try to extract order number from message if it contains "ORD-"
        let orderId = notif.data?.orderNumber || notif.data?.orderId || notif.data?.entityId;
        
        // If orderId is an ObjectId format (24 hex chars), try to get orderNumber from message
        if (orderId && orderId.length === 24 && /^[0-9a-fA-F]{24}$/.test(orderId)) {
          // It's an ObjectId, try to extract order number from message
          const orderNumberMatch = notif.message.match(/ORD-[\w-]+/i);
          if (orderNumberMatch) {
            orderId = orderNumberMatch[0];
          }
        }
        
        return {
          _id: notif._id,
          title: notif.title,
          message: notif.message,
          type: notif.type === 'order' || notif.type === 'delivery' || notif.type === 'invoice' || notif.type === 'payment' || notif.type === 'item_approval_status'
            ? 'order_update' 
            : notif.type,
          isRead: notif.read_by && user && notif.read_by.some((read: any) => read.user_id === user.user_id),
          createdAt: notif.createdAt,
          orderId: orderId
        };
      });
      
      // Filter to only show order-related notifications (already filtered by backend, but ensure client-side too)
      const orderRelatedNotifications = transformedNotifications.filter((notif: Notification) => 
        notif.type === 'order_update' || 
        notif.type === 'order' || 
        notif.type === 'delivery' || 
        notif.type === 'invoice' || 
        notif.type === 'payment' ||
        notif.orderId
      );
      
      // Deduplicate notifications - keep only unique notifications based on orderId + title + message
      // Use a Map for O(1) lookup performance
      const notificationMap = new Map<string, Notification>();
      
      orderRelatedNotifications.forEach((notif: Notification) => {
        // Normalize orderId - handle both order number and order ID formats
        const normalizedOrderId = notif.orderId || 'no-order';
        
        // Create a unique key: orderId + title + first 100 chars of message
        // This helps identify duplicates even if they have slight variations
        const messageKey = notif.message.substring(0, 100).toLowerCase().trim();
        const key = `${normalizedOrderId}_${notif.title.toLowerCase().trim()}_${messageKey}`;
        
        const existing = notificationMap.get(key);
        
        if (!existing) {
          // New unique notification, add it
          notificationMap.set(key, notif);
        } else {
          // Duplicate found, keep the most recent one (or keep the unread one if one is unread)
          const existingDate = new Date(existing.createdAt);
          const currentDate = new Date(notif.createdAt);
          
          // If current is more recent, or if current is unread and existing is read, replace
          if (currentDate > existingDate || (!notif.isRead && existing.isRead)) {
            notificationMap.set(key, notif);
          }
        }
      });
      
      // Convert map back to array
      const deduplicatedNotifications = Array.from(notificationMap.values());
      
      // Sort by date (most recent first)
      deduplicatedNotifications.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      
      setNotifications(deduplicatedNotifications);
      setMessage('✅ Notifications loaded successfully!');
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setMessage('❌ Error loading notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };


  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_update': return '📦';
      case 'product_update': return '🆕';
      case 'welcome': return '👋';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order_update': return 'bg-blue-50 border-blue-200';
      case 'product_update': return 'bg-green-50 border-green-200';
      case 'welcome': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading Notifications...</h2>
        </div>
      </div>
    );
  }

  return (
    <CustomerLayout>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="max-w-5xl">
          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.startsWith('✅') 
                ? 'bg-green-100 border border-green-400 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300' 
                : 'bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300'
            }`}>
              {message}
            </div>
          )}

          {/* Notifications List */}
          {notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div 
                  key={notification._id} 
                  className={`border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
                    getNotificationColor(notification.type)
                  } dark:bg-gray-800/50 dark:border-gray-700 ${
                    !notification.isRead ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className={`text-base font-semibold ${
                          !notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {!notification.isRead && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              New
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {new Date(notification.createdAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {notification.message}
                      </p>
                      {notification.orderId && (
                        <div className="mt-3">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            Order: {notification.orderId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-gray-400 dark:text-gray-600 text-6xl mb-4">🔔</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Notifications</h3>
              <p className="text-gray-500 dark:text-gray-400">You don't have any notifications yet.</p>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
