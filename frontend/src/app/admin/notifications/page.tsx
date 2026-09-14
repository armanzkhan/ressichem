"use client";

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect } from "react";
import NotificationService, { NotificationData } from "@/services/notificationService";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationService] = useState(() => NotificationService.getInstance());

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const recentNotifications = await notificationService.getRecentNotifications(20);
      setNotifications(recentNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'order': return '📦';
      case 'delivery': return '🚚';
      case 'invoice': return '🧾';
      case 'system': return '⚙️';
      default: return '📢';
    }
  };

  return (
    <ProtectedRoute requiredPermission="admin.notifications" fallbackPermission="notification.manage">
      <Breadcrumb pageName="Notification Settings" />
      
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="border-b border-stroke px-7 py-4 dark:border-dark-3">
          <h3 className="font-medium text-dark dark:text-white">
            System Notifications
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage and view system notifications
          </p>
        </div>
        
        <div className="p-7">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🔔</div>
                  <h3 className="text-lg font-medium text-dark dark:text-white mb-2">
                    No Notifications
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    You don't have any notifications yet.
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className="border border-stroke rounded-lg p-4 hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-2 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="text-2xl">
                          {getTypeIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-dark dark:text-white">
                              {notification.title}
                            </h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                              {notification.priority}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>
                              {new Date(notification.createdAt).toLocaleString()}
                            </span>
                            {notification.sender_name && (
                              <span>by {notification.sender_name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => markAsRead(notification._id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Mark as read"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
