"use client";

import React, { useEffect, useState } from 'react';
import PushNotificationService from '@/services/pushNotificationService';

interface ServiceWorkerManagerProps {
  autoInitialize?: boolean;
  onInitialized?: (success: boolean) => void;
}

const ServiceWorkerManager: React.FC<ServiceWorkerManagerProps> = ({
  autoInitialize = true,
  onInitialized
}) => {
  const [pushService] = useState(() => PushNotificationService.getInstance());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const initializeServiceWorker = async () => {
      try {
        // Check if push notifications are supported
        const supported = pushService.isPushSupported();
        setIsSupported(supported);

        if (!supported) {
          console.warn('Push notifications not supported in this browser');
          onInitialized?.(false);
          return;
        }

        // Check if we're in a secure context (required for push notifications)
        if (!window.isSecureContext) {
          console.warn('Push notifications require HTTPS or localhost');
          onInitialized?.(false);
          return;
        }

      if (autoInitialize) {
        // Check if user is authenticated
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('User not authenticated, skipping push notification initialization');
          onInitialized?.(false);
          return;
        }

        // Check if push notifications are already enabled
        const permissionState = pushService.getPermissionState();
        if (permissionState.granted) {
          // Initialize push notifications
          const success = await pushService.initialize();
          setIsInitialized(success);
          onInitialized?.(success);
          
          if (success) {
            console.log('Push notifications initialized successfully');
          } else {
            console.warn('Failed to initialize push notifications');
          }
        } else {
          console.log('Push notification permission not granted, skipping initialization');
          onInitialized?.(false);
        }
      }
    } catch (error) {
      console.error('Error initializing service worker:', error);
      onInitialized?.(false);
    }
  };

    // Initialize after a short delay to ensure the app is fully loaded
    const timer = setTimeout(initializeServiceWorker, 1000);

    return () => clearTimeout(timer);
  }, [pushService, autoInitialize, onInitialized]);

  // Handle visibility change to reinitialize if needed
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isSupported && !isInitialized) {
        const token = localStorage.getItem('token');
        if (token) {
          const permissionState = pushService.getPermissionState();
          if (permissionState.granted) {
            const success = await pushService.initialize();
            setIsInitialized(success);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pushService, isSupported, isInitialized]);

  // Handle authentication state changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (e.newValue && isSupported && !isInitialized) {
          // User logged in, try to initialize push notifications
          const permissionState = pushService.getPermissionState();
          if (permissionState.granted) {
            pushService.initialize().then(success => {
              setIsInitialized(success);
            });
          }
        } else if (!e.newValue && isInitialized) {
          // User logged out, reset state
          setIsInitialized(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [pushService, isSupported, isInitialized]);

  // This component doesn't render anything visible
  return null;
};

export default ServiceWorkerManager;
