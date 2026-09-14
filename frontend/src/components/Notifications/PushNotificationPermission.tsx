"use client";

import { useState, useEffect } from 'react';

interface PushNotificationPermissionProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

export function PushNotificationPermission({ 
  onPermissionGranted, 
  onPermissionDenied 
}: PushNotificationPermissionProps) {
  const [permissionState, setPermissionState] = useState<'default' | 'granted' | 'denied'>('default');
  const [isRequesting, setIsRequesting] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Dynamically import the service to avoid SSR issues
    import('@/services/pushNotificationService').then((module) => {
      const { pushNotificationService } = module;
      
      // Check if push notifications are supported
      const supported = pushNotificationService.isPushSupported();
      setIsSupported(supported);

      if (supported) {
        // Check current permission state
        const state = pushNotificationService.getPermissionState();
        if (state.granted) {
          setPermissionState('granted');
        } else if (state.denied) {
          setPermissionState('denied');
        } else {
          setPermissionState('default');
        }
      }
    });
  }, []);

  const requestPermission = async () => {
    if (!isSupported || typeof window === 'undefined') {
      console.warn('Push notifications are not supported');
      return;
    }

    setIsRequesting(true);
    try {
      const { pushNotificationService } = await import('@/services/pushNotificationService');
      const granted = await pushNotificationService.requestPermission();
      if (granted) {
        setPermissionState('granted');
        onPermissionGranted?.();
        
        // Initialize push notifications
        await pushNotificationService.initialize();
      } else {
        setPermissionState('denied');
        onPermissionDenied?.();
      }
    } catch (error) {
      console.error('Error requesting push notification permission:', error);
      setPermissionState('denied');
      onPermissionDenied?.();
    } finally {
      setIsRequesting(false);
    }
  };

  // Don't show if not supported or already granted
  if (!isSupported || permissionState === 'granted') {
    return null;
  }

  // Don't show if permission was denied
  if (permissionState === 'denied') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-800">
              Push notifications are disabled. You can enable them in your browser settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Enable Push Notifications
            </h3>
            <p className="text-sm text-blue-700">
              Get notified about important updates and new messages.
            </p>
          </div>
        </div>
        <div className="ml-4">
          <button
            onClick={requestPermission}
            disabled={isRequesting}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRequesting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enabling...
              </>
            ) : (
              'Enable'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}