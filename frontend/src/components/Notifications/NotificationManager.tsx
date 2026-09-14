"use client";

import { useState, useEffect, useCallback } from 'react';
import NotificationToast from './NotificationToast';
import NotificationService, { NotificationData } from '@/services/notificationService';

interface NotificationManagerProps {
  children: React.ReactNode;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [notificationService] = useState(() => NotificationService.getInstance());

  // Handle new notifications
  const handleNewNotification = useCallback((notification: NotificationData) => {
    setNotifications(prev => {
      // Avoid duplicates
      const exists = prev.some(n => n._id === notification._id);
      if (exists) return prev;
      
      // Add new notification to the beginning
      return [notification, ...prev.slice(0, 4)]; // Keep only 5 notifications max
    });

    // Show browser notification if permission is granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification._id,
        requireInteraction: notification.priority === 'urgent',
      });
    }
  }, []);

  // Remove notification
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n._id !== notificationId));
  }, []);

  // Initialize notification service
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Initialize real-time notifications
        await notificationService.initialize();
        
        // Subscribe to new notifications
        const unsubscribe = notificationService.subscribe(handleNewNotification);
        
      // Enable web push notifications
      try {
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            await notificationService.subscribeToWebPush();
          }
        } else if (Notification.permission === 'granted') {
          await notificationService.subscribeToWebPush();
        }
      } catch (pushError) {
        console.warn('Web push notifications not available:', pushError);
        // Continue without push notifications - the app will still work
      }

        // Load recent notifications
        const recentNotifications = await notificationService.getRecentNotifications(5);
        setNotifications(recentNotifications);

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
  }, [notificationService, handleNewNotification]);

  // Clean up notifications on unmount
  useEffect(() => {
    return () => {
      notificationService.disconnect();
    };
  }, [notificationService]);

  return (
    <>
      {children}
      
      {/* Render notification toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification, index) => (
          <div
            key={notification._id}
            style={{
              transform: `translateY(${index * 10}px)`,
              zIndex: 50 - index,
            }}
          >
            <NotificationToast
              notification={notification}
              onClose={() => removeNotification(notification._id)}
              autoClose={notification.priority !== 'urgent'}
              duration={notification.priority === 'urgent' ? 10000 : 5000}
            />
          </div>
        ))}
      </div>
    </>
  );
};

export default NotificationManager;
