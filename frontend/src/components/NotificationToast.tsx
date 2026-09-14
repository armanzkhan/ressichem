'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface NotificationToastProps {
  notification: {
    type: string;
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    timestamp: string;
    data?: any;
  };
  onClose: () => void;
}

export default function NotificationToast({ notification, onClose }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds

  useEffect(() => {
    // Auto-hide after 60 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for animation to complete
    }, 60000);

    // Countdown timer
    const countdown = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(countdown);
    };
  }, [onClose]);

  const getIcon = () => {
    switch (notification.priority) {
      case 'urgent':
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'medium':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'low':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBgColor = () => {
    switch (notification.priority) {
      case 'urgent':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'high':
        return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800';
      case 'medium':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'low':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (notification.data?.openMessenger || notification.type === "chat_message") {
          window.dispatchEvent(
            new CustomEvent("open-whatsapp-messenger", {
              detail: { conversationId: notification.data?.conversationId },
            })
          );
        }
        setIsVisible(false);
        setTimeout(onClose, 300);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.currentTarget.click();
        }
      }}
      className={`fixed top-4 right-4 z-50 max-w-sm w-full cursor-pointer transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`rounded-lg border p-4 shadow-lg ${getBgColor()}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {notification.type === "chat_message" ? (
              <Info className="w-5 h-5 text-emerald-500" />
            ) : (
              getIcon()
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              {notification.title}
            </h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {notification.message}
            </p>
            {notification.type === "chat_message" ? (
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                Tap to open chat
              </p>
            ) : null}
            
            {/* Countdown timer */}
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Auto-hide in {timeLeft}s
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVisible(false);
                  setTimeout(onClose, 300);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
