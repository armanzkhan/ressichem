'use client';

import { useState } from 'react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

export default function RealtimeNotificationTest() {
  const { notifications, isConnected, connectionStatus } = useRealtimeNotifications();
  const [showDetails, setShowDetails] = useState(false);

  if (!isConnected) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-sm font-medium">Real-time Disconnected</span>
        </div>
        <div className="text-xs mt-1">
          Attempts: {connectionStatus.reconnectAttempts}/{connectionStatus.maxReconnectAttempts}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-w-sm">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Real-time Connected
            </span>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>
        
        {showDetails && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            <div>Notifications: {notifications.length}</div>
            <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
          </div>
        )}
      </div>
      
      {notifications.length > 0 && (
        <div className="p-3">
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Recent Notifications ({notifications.length})
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {notifications.slice(0, 3).map((notification, index) => (
              <div key={index} className="text-xs p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="font-medium text-gray-900 dark:text-white">
                  {notification.title}
                </div>
                <div className="text-gray-600 dark:text-gray-400 mt-1">
                  {notification.message}
                </div>
                <div className="text-gray-500 dark:text-gray-500 mt-1">
                  {typeof window !== 'undefined' ? new Date(notification.timestamp).toLocaleTimeString() : 'Loading...'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
