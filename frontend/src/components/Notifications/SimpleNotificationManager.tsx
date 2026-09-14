'use client';

import { useEffect, useState } from 'react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useUser } from '@/components/Auth/user-context';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/lib/auth';
import ManagerNotificationPopup from './ManagerNotificationPopup';

interface SimpleNotificationManagerProps {
  children: React.ReactNode;
}

export default function SimpleNotificationManager({ children }: SimpleNotificationManagerProps) {
  const { notifications, isConnected } = useRealtimeNotifications();
  const [showNotification, setShowNotification] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const { user, isCustomer } = useUser();
  const router = useRouter();

  useEffect(() => {
    console.log('🔔 SimpleNotificationManager: notifications changed', {
      count: notifications.length,
      isConnected,
      userType: user?.userType,
      isManager: user?.isManager,
      notifications: notifications.map(n => ({ title: n.title, type: n.type, timestamp: n.timestamp }))
    });

    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      console.log('🔔 Showing notification:', latestNotification);
      setCurrentNotification(latestNotification);
      setShowNotification(true);

      // Store notification in database
      const storeNotification = async () => {
        try {
          console.log('💾 Storing notification in database...');
          const response = await fetch('/api/store-notification', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(latestNotification),
          });
            
          if (response.ok) {
            console.log('✅ Notification stored in database');
          } else {
            console.error('❌ Failed to store notification in database');
          }
        } catch (error) {
          console.error('❌ Error storing notification in database:', error);
        }
      };

      storeNotification();

      // Auto-hide after 60 seconds for managers, 5 seconds for others
      const autoHideDelay = user?.isManager ? 60000 : 5000;
      const timer = setTimeout(() => {
        console.log('🔔 Auto-hiding notification');
        setShowNotification(false);
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [notifications, isConnected]);

  // Add debugging for connection status
  useEffect(() => {
    if (!isClient) return;
    
    console.log('🔔 SimpleNotificationManager: connection status changed', {
      isConnected,
      timestamp: new Date().toISOString()
    });
  }, [isConnected, isClient]);

  // Ensure we're on the client side to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle notification navigation
  const handleNotificationNavigate = (orderId: string) => {
    // For customers, always redirect to customer notifications page
    if (user && isCustomer()) {
      router.push('/customer-notifications');
      return;
    }
    // Navigate to orders page with order highlighted
    router.push(`/orders?highlight=${orderId}`);
  };

  // Handle notification close
  const handleNotificationClose = () => {
    setShowNotification(false);
    setCurrentNotification(null);
  };

  return (
    <>
      {children}
      
      {/* Manager-specific popup or default notification */}
      {isClient && showNotification && currentNotification && (
        <>
          {/* Manager-specific popup */}
          {user?.isManager ? (
            <ManagerNotificationPopup
              notification={currentNotification}
              onClose={handleNotificationClose}
              onNavigate={handleNotificationNavigate}
            />
          ) : (
            /* Default notification for non-managers */
            <div className="fixed top-4 right-4 z-[9999] max-w-sm">
              <div 
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 cursor-pointer hover:shadow-xl transition-shadow"
                onClick={() => {
                  // For customers, redirect to customer notifications page
                  if (user && isCustomer()) {
                    router.push('/customer-notifications');
                    handleNotificationClose();
                  } else {
                    // For non-customers, navigate to orders page if order-related
                    if (currentNotification.data?.orderId) {
                      handleNotificationNavigate(currentNotification.data.orderId);
                    } else {
                      router.push('/orders');
                      handleNotificationClose();
                    }
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${
                        isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                      }`} />
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {currentNotification.title}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {currentNotification.message}
                    </p>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {isClient ? new Date(currentNotification.timestamp).toLocaleTimeString() : 'Loading...'}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNotificationClose();
                    }}
                    className="ml-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
