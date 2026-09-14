"use client";

import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "./icons";
import NotificationService, { NotificationData } from "@/services/notificationService";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useUser } from "@/components/Auth/user-context";

export function Notification() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDotVisible, setIsDotVisible] = useState(true);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [notificationService] = useState(() => NotificationService.getInstance());
  const isMobile = useIsMobile();
  const router = useRouter();
  const { user, isCustomer } = useUser();
  
  // Real-time notifications
  const { 
    notifications: realtimeNotifications, 
    isConnected: isRealtimeConnected,
    connectionStatus 
  } = useRealtimeNotifications();

  // Handle new notifications
  const handleNewNotification = useCallback((notification: NotificationData) => {
    setNotifications(prev => {
      // Avoid duplicates
      const exists = prev.some(n => n._id === notification._id);
      if (exists) return prev;
      
      // Add new notification to the beginning and keep only 5
      return [notification, ...prev.slice(0, 4)];
    });
    setIsDotVisible(true);
  }, []);

  // Handle notification click and navigation
  const handleNotificationClick = useCallback((notification: NotificationData) => {
    // Mark as read
    markAsRead(notification._id);
    
    // Close the dropdown
    setIsOpen(false);
    
    // For customers, always redirect to customer notifications page
    if (user && isCustomer()) {
      router.push('/customer-notifications');
      return;
    }
    
    // Navigate based on notification type and data
    // Priority: entityType logic first, then URL, then type-based fallback
    if (notification.data?.entityType === 'order' && notification.data?.entityId) {
      // Navigate to orders page with order ID parameter to highlight specific order
      router.push(`/orders?highlight=${notification.data.entityId}`);
    } else if (notification.data?.entityType === 'user' && notification.data?.entityId) {
      // Navigate to users page (since there's no individual user detail page)
      router.push('/users');
    } else if (notification.data?.entityType === 'customer' && notification.data?.entityId) {
      // Navigate to customers page (since there's no individual customer detail page)
      router.push('/customers');
    } else if (notification.data?.url) {
      // Use the URL from notification data (but check if it's a valid route)
      const url = notification.data.url;
      if (url.startsWith('/orders/') && url !== '/orders') {
        // Convert old format /orders/{id} to new highlight format
        const orderId = url.replace('/orders/', '');
        router.push(`/orders?highlight=${orderId}`);
      } else {
        router.push(url);
      }
    } else if (notification.type === 'order') {
      // Navigate to orders page
      router.push('/orders');
    } else if (notification.type === 'system') {
      // Navigate to users page
      router.push('/users');
    } else {
      // Default navigation based on notification type
      switch (notification.type) {
        case 'delivery':
          router.push('/orders');
          break;
        case 'invoice':
          router.push('/orders');
          break;
        default:
          router.push('/dashboard');
      }
    }
  }, [router, user, isCustomer]);

  // Handle real-time notifications
  useEffect(() => {
    if (realtimeNotifications.length > 0) {
      // Convert real-time notifications to the format expected by the component
      const convertedNotifications = realtimeNotifications.map(rtNotification => ({
        _id: `rt_${Date.now()}_${Math.random()}`,
        title: rtNotification.title,
        message: rtNotification.message,
        type: rtNotification.type,
        read: false,
        createdAt: rtNotification.timestamp,
        priority: rtNotification.priority,
        data: rtNotification.data,
        sender_name: rtNotification.data?.sender_name
      }));

      setNotifications(prev => {
        // Merge with existing notifications, avoiding duplicates       
        const combined = [...convertedNotifications, ...prev] as NotificationData[];
        return combined.slice(0, 10); // Keep last 10 notifications     
      });
      
      setIsDotVisible(true);
    }
  }, [realtimeNotifications]);

  // Note: Click outside to close is now handled by the generic Dropdown component

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const recentNotifications = await notificationService.getRecentNotifications(5);
      console.log('🔔 Notification component - fetched notifications:', recentNotifications);
      console.log('🔔 Notification component - first notification:', recentNotifications[0]);
      setNotifications(recentNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [notificationService]);

  // Initialize notification service
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Subscribe to new notifications
        const unsubscribe = notificationService.subscribe(handleNewNotification);
        
        // Load recent notifications
        await fetchNotifications();

        return unsubscribe;
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };

    let unsubscribe: (() => void) | undefined;
    initializeNotifications().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [notificationService, handleNewNotification, fetchNotifications]);

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
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="grid size-10 sm:size-12 place-items-center rounded-full border border-blue-900/20 bg-white text-blue-900 outline-none hover:text-blue-900 hover:bg-blue-900/5 focus-visible:border-blue-900 focus-visible:text-blue-900 dark:border-blue-900/30 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:focus-visible:border-blue-400 flex-shrink-0">
        <span className="relative">
          <BellIcon />

          {isDotVisible && (
            <span
              className={cn(
                "absolute right-0 top-0 z-1 size-2 rounded-full bg-red-light ring-2 ring-gray-2 dark:ring-dark-3",
              )}
            >
              <span className="absolute inset-0 -z-1 animate-ping rounded-full bg-red-light opacity-75" />
            </span>
          )}
        </span>
      </DropdownTrigger>

      <DropdownContent
        className={`border border-stroke bg-white px-3.5 py-3 shadow-lg dark:border-dark-3 dark:bg-gray-dark ${
          isMobile 
            ? 'max-w-[calc(100vw-2rem)] w-[calc(100vw-2rem)] max-h-[70vh]' 
            : 'min-[350px]:min-w-[20rem] max-h-[60vh]'
        }`}
        align="end"
      >
        <div className="mb-1 flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-blue-900 dark:text-white">
              Notifications
            </span>
            {/* Real-time connection status */}
            <div className={`w-2 h-2 rounded-full ${
              isRealtimeConnected 
                ? 'bg-green-500 animate-pulse' 
                : 'bg-red-500'
            }`} title={
              isRealtimeConnected 
                ? 'Real-time connected' 
                : 'Real-time disconnected'
            } />
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
            <span className="rounded-md bg-blue-900 px-[9px] py-0.5 text-xs font-medium text-white">
              {notifications.length} new
            </span>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-blue-900 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded-full hover:bg-blue-900/10 dark:hover:bg-gray-700 transition-colors duration-200"
              aria-label="Close notifications"
              title="Close notifications"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Click hint */}
        {notifications.length > 0 && (
          <div className="px-2 py-1 text-xs text-blue-700 dark:text-blue-300 border-b border-blue-900/20 dark:border-blue-900/30">
            💡 Click any notification to navigate to the relevant page
          </div>
        )}

        <ul className={`mb-3 space-y-1.5 overflow-y-auto custom-scrollbar ${
          isMobile ? 'max-h-[12rem]' : 'max-h-[23rem]'
        }`}>
          {notifications.length === 0 ? (
            <li className="px-2 py-4 text-center text-sm text-blue-700 dark:text-blue-300">
              No notifications yet
            </li>
          ) : (
            notifications.map((notification) => {
              console.log('🔔 Rendering notification:', notification);
              return (
              <li key={notification._id} role="menuitem">
                <div
                  onClick={() => handleNotificationClick(notification)}
                  className="flex items-start gap-3 rounded-lg px-2 py-1.5 outline-none hover:bg-blue-900/5 focus-visible:bg-blue-900/5 dark:hover:bg-gray-700 dark:focus-visible:bg-gray-700 cursor-pointer transition-colors duration-200 group"
                >
                  <div className="text-2xl mt-1">
                    {getTypeIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <strong className="block text-sm font-medium text-blue-900 dark:text-white truncate">
                      {notification.title}
                    </strong>

                    <span className={`block text-xs text-blue-700 dark:text-blue-300 ${
                      isMobile ? 'line-clamp-2' : 'truncate'
                    }`}>
                      {notification.message}
                    </span>

                    <div className="flex items-center justify-between mt-1">
                      <span className="block text-xs text-blue-700 dark:text-blue-300 truncate">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                      {(notification.sender_name || notification.data?.sender_name) && (
                        <span className="block text-xs text-blue-900 dark:text-blue-400 truncate ml-2">
                          by {notification.sender_name || notification.data?.sender_name || 'System'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Click indicator */}
                  <div className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg className="w-4 h-4 text-blue-900 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </li>
              );
            })
          )}
        </ul>

        <Link
          href={user && isCustomer() ? "/customer-notifications" : "/admin/notifications"}
          onClick={() => setIsOpen(false)}
          className={`block rounded-lg border border-blue-900 p-2 text-center text-sm font-medium tracking-wide text-blue-900 outline-none transition-colors hover:bg-blue-900/10 focus:bg-blue-900/10 focus:text-blue-900 focus-visible:border-blue-900 dark:border-blue-900/30 dark:text-blue-400 dark:hover:border-blue-900/50 dark:hover:bg-gray-700 dark:hover:text-white dark:focus-visible:border-blue-400 dark:focus-visible:bg-gray-700 dark:focus-visible:text-white ${
            isMobile ? 'text-xs' : ''
          }`}
        >
          {isMobile ? 'View All' : 'See all notifications'}
        </Link>
      </DropdownContent>
    </Dropdown>
  );
}
