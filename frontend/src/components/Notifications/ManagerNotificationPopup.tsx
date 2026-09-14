"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/Auth/user-context';

interface ManagerNotificationPopupProps {
  notification: {
    id: string;
    title: string;
    message: string;
    type: 'order' | 'status' | 'info';
    data?: {
      orderId?: string;
      orderNumber?: string;
      categories?: string[];
      entityType?: string;
      entityId?: string;
      action?: string;
      url?: string;
    };
    timestamp: string;
  };
  onClose: () => void;
  onNavigate: (orderId: string) => void;
}

export default function ManagerNotificationPopup({ 
  notification, 
  onClose, 
  onNavigate 
}: ManagerNotificationPopupProps) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [isVisible, setIsVisible] = useState(true);
  const router = useRouter();
  const { user, isCustomer } = useUser();

  // Auto-dismiss timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsVisible(false);
          setTimeout(() => onClose(), 300); // Allow fade out animation
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose]);

  // Handle notification click
  const handleNotificationClick = () => {
    // For customers, always redirect to customer notifications page
    if (user && isCustomer()) {
      router.push('/customer-notifications');
      onClose();
      return;
    }
    
    if (notification.data?.orderId) {
      // Navigate to orders page with order highlighted
      onNavigate(notification.data.orderId);
      onClose();
    } else if (notification.data?.url) {
      // Navigate to specific URL
      router.push(notification.data.url);
      onClose();
    } else {
      // Default: go to orders page
      router.push('/orders');
      onClose();
    }
  };

  // Handle close button
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  // Get notification icon based on type
  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'order':
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'status':
        return (
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Get notification color based on type
  const getNotificationColor = () => {
    switch (notification.type) {
      case 'order':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'status':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div 
        className={`
          ${getNotificationColor()}
          border-l-4 border border-gray-200 dark:border-gray-700 
          rounded-lg shadow-lg p-4 cursor-pointer
          transform transition-all duration-300 ease-in-out
          hover:shadow-xl hover:scale-105
          ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        `}
        onClick={handleNotificationClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-3">
            {getNotificationIcon()}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                {notification.title}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Manager Notification
              </p>
            </div>
          </div>
          
          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          {notification.message}
        </p>

        {/* Order info if available */}
        {notification.data?.orderNumber && (
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            Order: {notification.data.orderNumber}
          </div>
        )}

        {/* Categories info if available */}
        {notification.data?.categories && notification.data.categories.length > 0 && (
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            Categories: {notification.data.categories.join(', ')}
          </div>
        )}

        {/* Manager categories info */}
        {user?.isManager && user?.managerProfile?.assignedCategories && (
          <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
            Your Categories: {user.managerProfile.assignedCategories.join(', ')}
          </div>
        )}

        {/* Footer with timer and action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Auto-dismiss in {timeLeft}s
            </span>
          </div>
          
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            Click to view →
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
          <div 
            className="bg-blue-500 h-1 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 60) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
