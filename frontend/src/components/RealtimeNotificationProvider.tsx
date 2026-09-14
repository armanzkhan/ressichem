'use client';

import { useEffect, useState } from 'react';
import realtimeNotificationService from '@/services/realtimeNotificationService';
import NotificationToast from './NotificationToast';

interface RealtimeNotification {
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: string;
  data?: any;
}

interface RealtimeNotificationProviderProps {
  children: React.ReactNode;
}

export default function RealtimeNotificationProvider({ children }: RealtimeNotificationProviderProps) {
  const [isClient, setIsClient] = useState(false);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    // Request notification permission
    const requestNotificationPermission = async () => {
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          console.log('🔔 Notification permission:', permission);
        } else {
          console.log('🔔 Notification permission already:', Notification.permission);
        }
      }
    };
    
    // Initialize real-time notifications when the app loads
    const initializeRealtime = () => {
      const token = localStorage.getItem('token');
      const userType = localStorage.getItem('userType');
      const userId = localStorage.getItem('userId');

      if (token && userType && userId) {
        console.log('🔌 Initializing real-time notifications...');
        realtimeNotificationService.updateAuth(token, userType, userId);
      }
    };
    
    // Request notification permission first
    requestNotificationPermission();

    // Initialize immediately
    initializeRealtime();

    // Listen for notifications
    const handleNotification = (notification: RealtimeNotification) => {
      console.log('🔔 RealtimeNotificationProvider received notification:', notification);
      console.log('🔔 Current notifications count:', notifications.length);
      setNotifications(prev => {
        const newNotifications = [...prev, notification];
        console.log('🔔 Updated notifications count:', newNotifications.length);
        return newNotifications;
      });
    };

    realtimeNotificationService.addListener(handleNotification);

    // Listen for storage changes (login/logout)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'userType' || e.key === 'userId') {
        initializeRealtime();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom auth events
    const handleAuthChange = () => {
      initializeRealtime();
    };

    window.addEventListener('auth-changed', handleAuthChange);

    return () => {
      realtimeNotificationService.removeListener(handleNotification);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleAuthChange);
    };
  }, [isClient]);

  const removeNotification = (index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      {children}
      {notifications.map((notification, index) => (
        <NotificationToast
          key={`${notification.timestamp}-${index}`}
          notification={notification}
          onClose={() => removeNotification(index)}
        />
      ))}
    </>
  );
}
