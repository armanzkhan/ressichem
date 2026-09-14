'use client';

import { useEffect, useState, useCallback } from 'react';
import realtimeNotificationService from '@/services/realtimeNotificationService';

interface RealtimeNotification {
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: string;
  data?: any;
}
import { getAuthHeaders } from '@/lib/auth';

interface UseRealtimeNotificationsReturn {
  notifications: RealtimeNotification[];
  isConnected: boolean;
  connectionStatus: {
    isConnected: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
  };
  clearNotifications: () => void;
  markAsRead: (index: number) => void;
}

export const useRealtimeNotifications = (): UseRealtimeNotificationsReturn => {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const handleNotification = useCallback(async (notification: RealtimeNotification) => {
    console.log('🔔 useRealtimeNotifications: notification received:', notification);
    
    // Store notification in database
    try {
      console.log('💾 Storing real-time notification in database...');
      const response = await fetch('/api/store-notification', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(notification),
      });
        
      if (response.ok) {
        console.log('✅ Real-time notification stored in database');
      } else {
        console.error('❌ Failed to store notification in database:', await response.text());
      }
    } catch (error) {
      console.error('❌ Error storing notification in database:', error);
    }
    
    setNotifications(prev => {
      // Add new notification at the beginning
      const newNotifications = [notification, ...prev];
      
      // Keep only last 50 notifications to prevent memory issues
      const result = newNotifications.slice(0, 50);
      console.log('🔔 useRealtimeNotifications: updated notifications array:', result.length);
      return result;
    });

    // Show browser notification if permission is granted and supported
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.type,
          requireInteraction: notification.priority === 'urgent' || notification.priority === 'high'
        });
        console.log('🔔 Browser notification shown');
      } catch (error) {
        console.log('Browser notification failed:', error);
      }
    } else {
      console.log('🔔 Browser notifications not available or permission not granted');
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAsRead = useCallback((index: number) => {
    setNotifications(prev => 
      prev.map((notification, i) => 
        i === index ? { ...notification, read: true } : notification
      )
    );
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    console.log('🔔 useRealtimeNotifications: Setting up notification system...');
    
    // Add notification listener
    realtimeNotificationService.addListener(handleNotification);
    console.log('🔔 useRealtimeNotifications: Notification listener added');

    // Connect to WebSocket
    console.log('🔔 useRealtimeNotifications: Attempting to connect to WebSocket...');
    realtimeNotificationService.connect();

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      const status = realtimeNotificationService.getConnectionStatus();
      // Only log when connection status changes
      if (status.isConnected !== isConnected) {
        console.log('🔔 useRealtimeNotifications: Connection status changed:', status);
      }
      setIsConnected(status.isConnected);
    }, 5000); // Check every 5 seconds instead of every second

    return () => {
      console.log('🔔 useRealtimeNotifications: Cleaning up notification system...');
      realtimeNotificationService.removeListener(handleNotification);
      clearInterval(statusInterval);
    };
  }, [handleNotification, isClient]);

  const connectionStatus = realtimeNotificationService.getConnectionStatus();

  return {
    notifications,
    isConnected,
    connectionStatus,
    clearNotifications,
    markAsRead
  };
};
