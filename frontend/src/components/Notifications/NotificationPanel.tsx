"use client";

import { useState, useEffect } from 'react';
import NotificationService, { NotificationData } from '@/services/notificationService';

interface NotificationPanelProps {
  className?: string;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ className = "" }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationService] = useState(() => NotificationService.getInstance());

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const recentNotifications = await notificationService.getRecentNotifications(10);
        setNotifications(recentNotifications);
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();

    // Subscribe to new notifications
    const unsubscribe = notificationService.subscribe((notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 9)]);
    });

    return unsubscribe;
  }, [notificationService]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'order':
        return '📦';
      case 'delivery':
        return '🚚';
      case 'invoice':
        return '💰';
      case 'system':
        return '⚙️';
      default:
        return 'ℹ️';
    }
  };

  const getPriorityGradient = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'from-red-500 to-red-600';
      case 'high':
        return 'from-orange-500 to-orange-600';
      case 'medium':
        return 'from-blue-500 to-blue-600';
      case 'low':
        return 'from-gray-500 to-gray-600';
      default:
        return 'from-blue-500 to-blue-600';
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-700';
      case 'high':
        return 'bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-200 dark:border-orange-700';
      case 'medium':
        return 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700';
      case 'low':
        return 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-700/30 border-gray-200 dark:border-gray-600';
      default:
        return 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700';
    }
  };

  const formatTime = (dateString: string) => {
    // Only format on client side to prevent hydration issues
    if (typeof window === 'undefined') return 'Loading...';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20 overflow-hidden ${className}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🔔</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Live Notifications</h3>
          </div>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20 overflow-hidden ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🔔</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Live Notifications</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Real-time system updates</p>
            </div>
          </div>
          {notifications.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-red-500 to-pink-500 px-3 py-1 text-sm font-medium text-white shadow-lg">
                {notifications.length}
              </span>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🔔</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No notifications yet</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-1">
              You'll see real-time updates here when users, orders, or customers are created or updated.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Notifications will appear automatically as system events occur.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`p-4 rounded-xl border ${getPriorityBg(notification.priority)} transition-all duration-200 hover:shadow-lg hover:scale-[1.02] group`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 bg-gradient-to-br ${getPriorityGradient(notification.priority)} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                    <span className="text-xl">{getIcon(notification.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                      {notification.priority === 'urgent' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-sm">
                          URGENT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 bg-gradient-to-r ${getPriorityGradient(notification.priority)} rounded-full`}></div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      {notification.sender_name && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32">
                          From: {notification.sender_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
