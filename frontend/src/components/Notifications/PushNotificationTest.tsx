"use client";

import { useState } from 'react';
import { pushNotificationService } from '@/services/pushNotificationService';

export function PushNotificationTest() {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const testPushNotification = async () => {
    setIsTesting(true);
    setTestResult('');

    try {
      // Check if push notifications are supported
      if (!pushNotificationService.isPushSupported()) {
        setTestResult('❌ Push notifications are not supported in this browser');
        return;
      }

      // Check permission state
      const permissionState = pushNotificationService.getPermissionState();
      if (!permissionState.granted) {
        setTestResult('❌ Push notification permission not granted');
        return;
      }

      // Test service worker registration
      const registration = await pushNotificationService.registerServiceWorker();
      if (!registration) {
        setTestResult('❌ Service worker registration failed');
        return;
      }

      // Test push subscription
      const subscription = await pushNotificationService.subscribeToPush();
      if (!subscription) {
        setTestResult('❌ Push subscription failed');
        return;
      }

      setTestResult('✅ Push notifications are working correctly!');
    } catch (error) {
      console.error('Push notification test failed:', error);
      setTestResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('Test Notification', {
          body: 'This is a test push notification from the admin dashboard',
          icon: '/favicon.ico',
          tag: 'test-notification',
          requireInteraction: true
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        setTestResult('✅ Test notification sent successfully!');
      } else {
        setTestResult('❌ Notification permission not granted');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      setTestResult(`❌ Failed to send test notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-dark rounded-lg border border-stroke dark:border-dark-3 p-6 shadow-1">
      <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">
        Push Notification Test
      </h3>
      
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={testPushNotification}
            disabled={isTesting}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Testing...
              </>
            ) : (
              'Test Push Setup'
            )}
          </button>

          <button
            onClick={sendTestNotification}
            className="inline-flex items-center justify-center px-4 py-2 border border-stroke dark:border-dark-3 text-sm font-medium rounded-md text-dark dark:text-white bg-transparent hover:bg-gray-50 dark:hover:bg-dark-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Send Test Notification
          </button>
        </div>

        {testResult && (
          <div className={`p-3 rounded-md text-sm ${
            testResult.startsWith('✅') 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {testResult}
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p><strong>Browser Support:</strong> Chrome, Firefox, Safari, Edge</p>
          <p><strong>Mobile Support:</strong> Chrome Mobile, Safari Mobile, Firefox Mobile</p>
          <p><strong>Requirements:</strong> HTTPS or localhost, Service Worker support</p>
        </div>
      </div>
    </div>
  );
}
