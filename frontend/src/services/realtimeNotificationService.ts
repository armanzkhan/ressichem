'use client';

import { pushNotificationService } from './pushNotificationService';
import { getBackendUrl } from '@/lib/getBackendUrl';

interface RealtimeNotification {
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: string;
  data?: any;
}

interface WebSocketMessage {
  type: string;
  message?: string;
  order?: any;
  customer?: any;
  manager?: any;
  product?: any;
  action?: string;
  notification?: {
    _id: string;
    title: string;
    message: string;
    type: string;
    priority: string;
    createdAt: string;
    data?: any;
    sender_name?: string;
  };
}

class RealtimeNotificationService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private isConnected = false;
  private listeners: ((notification: RealtimeNotification) => void)[] = [];
  private chatListeners: ((payload: any) => void)[] = [];
  private token: string | null = null;
  private userType: string | null = null;
  private userId: string | null = null;

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
      this.userType = localStorage.getItem('userType');
      this.userId = localStorage.getItem('userId');
    }
  }

  connect() {
    if (this.isConnected || !this.token) {
      return;
    }

    try {
      const backendUrl = getBackendUrl();
      const wsUrl = backendUrl.replace(/^http(s?):\/\//, "ws$1://").replace(/\/$/, "") + "/ws";
      
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.authenticate();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('🔔 WebSocket message received:', message);        
          console.log('🔔 Message type:', message.type);
          console.log('🔔 Full message data:', JSON.stringify(message, null, 2));
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.isConnected = false;
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.reconnect();
    }
  }

  private authenticate() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const userIds = new Set<string>();
      if (this.userId) userIds.add(String(this.userId));
      try {
        if (this.token) {
          const payload = JSON.parse(atob(this.token.split('.')[1] || '')) as {
            user_id?: string;
            _id?: string;
            id?: string;
          };
          if (payload.user_id) userIds.add(String(payload.user_id));
          if (payload._id) userIds.add(String(payload._id));
          if (payload.id) userIds.add(String(payload.id));
        }
      } catch {
        /* ignore jwt decode */
      }
      this.ws.send(JSON.stringify({
        type: 'authenticate',
        token: this.token,
        userType: this.userType,
        userId: this.userId,
        userIds: [...userIds],
      }));
    }
  }

  private handleMessage(message: WebSocketMessage) {
    console.log('🔔 Processing WebSocket message:', message.type);
    console.log('🔔 Full message:', message);
    let notification: RealtimeNotification | null = null;

    switch (message.type) {
      case 'authenticated':
        console.log('✅ WebSocket authenticated');
        this.subscribeToUpdates();
        break;

      case 'category_assignment':
        console.log('🔔 Category assignment notification received');
        // Use the actual notification data from the backend
        if (message.notification) {
          notification = {
            type: message.notification.type || 'category_assignment',
            title: message.notification.title || 'Categories Assigned',
            message: message.notification.message || 'You have been assigned new categories',
            priority: (message.notification.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
            timestamp: message.notification.createdAt || new Date().toISOString(),
            data: message.notification.data || {}
          };
        } else {
          // Fallback for old format
          notification = {
            type: 'category_assignment',
            title: 'Categories Assigned',
            message: 'You have been assigned new categories',
            priority: 'medium',
            timestamp: new Date().toISOString(),
            data: {}
          };
        }
        
        // Show popup notification
        this.showPopupNotification(notification);
        break;

      case 'notification':
        console.log('🔔 Processing notification message:', message);
        console.log('🔔 Message notification field:', message.notification);
        
        // Use the actual notification data from the backend
        if (message.notification) {
          console.log('🔔 Using detailed notification data from backend');
          notification = {
            type: message.notification.type || 'info',
            title: message.notification.title || 'Notification',
            message: message.notification.message || 'You have a new notification',
            priority: (message.notification.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
            timestamp: message.notification.createdAt || new Date().toISOString(),
            data: message.notification.data || {}
          };
        } else {
          console.log('🔔 No notification data found, using fallback');
          // Fallback for old format
          notification = {
            type: 'info',
            title: 'Notification',
            message: 'You have a new notification',
            priority: 'medium',
            timestamp: new Date().toISOString(),
            data: {}
          };
        }
        
        console.log('🔔 Final notification object:', notification);
        // Show popup notification
        this.showPopupNotification(notification);
        break;

      case 'order_status_update':
        // Use the actual notification data from the backend
        if (message.notification) {
          notification = {
            type: message.notification.type || 'order_update',
            title: message.notification.title || 'Order Status Updated',
            message: message.notification.message || 'Order status has been updated',
            priority: (message.notification.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
            timestamp: message.notification.createdAt || new Date().toISOString(),
            data: message.notification.data || {}
          };
        } else {
          // Fallback for old format
          notification = {
            type: 'order_update',
            title: 'Order Status Updated',
            message: 'Order status has been updated',
            priority: 'medium',
            timestamp: new Date().toISOString(),
            data: {}
          };
        }
        
        // Show popup notification
        this.showPopupNotification(notification);
        break;

      case 'new_order':
        // Use the actual notification data from the backend
        if (message.notification) {
          notification = {
            type: message.notification.type || 'new_order',
            title: message.notification.title || 'New Order Received',
            message: message.notification.message || 'A new order has been placed',
            priority: (message.notification.priority as 'low' | 'medium' | 'high' | 'urgent') || 'high',
            timestamp: message.notification.createdAt || new Date().toISOString(),
            data: message.notification.data || {}
          };
        } else {
          // Fallback for old format
          notification = {
            type: 'new_order',
            title: 'New Order Received',
            message: 'A new order has been placed',
            priority: 'high',
            timestamp: new Date().toISOString(),
            data: {}
          };
        }
        
        // Show popup notification
        this.showPopupNotification(notification);
        break;

      case 'customer_assignment':
        // Use the actual notification data from the backend
        if (message.notification) {
          notification = {
            type: message.notification.type || 'customer_assignment',
            title: message.notification.title || 'Customer Assigned',
            message: message.notification.message || 'A customer has been assigned to you',
            priority: (message.notification.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
            timestamp: message.notification.createdAt || new Date().toISOString(),
            data: message.notification.data || {}
          };
        } else {
          // Fallback for old format
          notification = {
            type: 'customer_assignment',
            title: 'Customer Assigned',
            message: 'A customer has been assigned to you',
            priority: 'medium',
            timestamp: new Date().toISOString(),
            data: {}
          };
        }
        
        // Show popup notification
        this.showPopupNotification(notification);
        break;

      case 'product_update':
        // Use the actual notification data from the backend
        if (message.notification) {
          notification = {
            type: message.notification.type || 'product_update',
            title: message.notification.title || 'Product Updated',
            message: message.notification.message || 'A product has been updated',
            priority: (message.notification.priority as 'low' | 'medium' | 'high' | 'urgent') || 'low',
            timestamp: message.notification.createdAt || new Date().toISOString(),
            data: message.notification.data || {}
          };
        } else {
          // Fallback for old format
          notification = {
            type: 'product_update',
            title: 'Product Updated',
            message: 'A product has been updated',
            priority: 'low',
            timestamp: new Date().toISOString(),
            data: {}
          };
        }
        
        // Show popup notification
        this.showPopupNotification(notification);
        break;

      case 'customer_created':
        // Use the actual notification data from the backend
        if (message.notification) {
          notification = {
            type: message.notification.type || 'customer_created',
            title: message.notification.title || 'New Customer Added',
            message: message.notification.message || 'A new customer has been created',
            priority: (message.notification.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
            timestamp: message.notification.createdAt || new Date().toISOString(),
            data: message.notification.data || {}
          };
        } else {
          // Fallback for old format
          notification = {
            type: 'customer_created',
            title: 'New Customer Added',
            message: 'A new customer has been created',
            priority: 'medium',
            timestamp: new Date().toISOString(),
            data: {}
          };
        }
        
        // Show popup notification
        this.showPopupNotification(notification);
        break;

      case 'user_created':
        // Use the actual notification data from the backend
        if (message.notification) {
          notification = {
            type: message.notification.type || 'user_created',
            title: message.notification.title || 'New User Added',
            message: message.notification.message || 'A new user has been created',
            priority: (message.notification.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
            timestamp: message.notification.createdAt || new Date().toISOString(),
            data: message.notification.data || {}
          };
        } else {
          // Fallback for old format
          notification = {
            type: 'user_created',
            title: 'New User Added',
            message: 'A new user has been created',
            priority: 'medium',
            timestamp: new Date().toISOString(),
            data: {}
          };
        }
        
        // Show popup notification
        this.showPopupNotification(notification);
        break;

      case 'order_approved':
        // Use the actual notification data from the backend
        if (message.notification) {
          notification = {
            type: message.notification.type || 'order_approved',
            title: message.notification.title || 'Order Approved',
            message: message.notification.message || 'An order has been approved',
            priority: (message.notification.priority as 'low' | 'medium' | 'high' | 'urgent') || 'high',
            timestamp: message.notification.createdAt || new Date().toISOString(),
            data: message.notification.data || {}
          };
        } else {
          // Fallback for old format
          notification = {
            type: 'order_approved',
            title: 'Order Approved',
            message: 'An order has been approved',
            priority: 'high',
            timestamp: new Date().toISOString(),
            data: {}
          };
        }
        
        // Show popup notification
        this.showPopupNotification(notification);
        break;

      case 'order_rejected':
        // Use the actual notification data from the backend
        if (message.notification) {
          notification = {
            type: message.notification.type || 'order_rejected',
            title: message.notification.title || 'Order Rejected',
            message: message.notification.message || `Order ${message.order?.orderNumber} has been rejected`,
            priority: (message.notification.priority as 'low' | 'medium' | 'high' | 'urgent') || 'high',
            timestamp: message.notification.createdAt || new Date().toISOString(),
            data: message.notification.data || {}
          };
        } else {
          // Fallback for old format
          notification = {
            type: 'order_rejected',
            title: 'Order Rejected',
            message: `Order ${message.order?.orderNumber} has been rejected`,
            priority: 'high',
            timestamp: new Date().toISOString(),
            data: {}
          };
        }
        
        // Show popup notification
        this.showPopupNotification(notification);
        break;

      case 'item_approval_status':
        // Use the actual notification data from the backend
        if (message.notification) {
          notification = {
            type: message.notification.type || 'item_approval_status',
            title: message.notification.title || 'Item Approval Status Changed',
            message: message.notification.message || 'An item approval status has been updated',
            priority: (message.notification.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
            timestamp: message.notification.createdAt || new Date().toISOString(),
            data: message.notification.data || {}
          };
        } else {
          // Fallback for old format
          notification = {
            type: 'item_approval_status',
            title: 'Item Approval Status Changed',
            message: 'An item approval status has been updated',
            priority: 'medium',
            timestamp: new Date().toISOString(),
            data: {}
          };
        }
        
        // Show popup notification
        this.showPopupNotification(notification);
        break;

      case 'system_alert':
        // Use the actual notification data from the backend
        if (message.notification) {
          notification = {
            type: message.notification.type || 'system_alert',
            title: message.notification.title || 'System Alert',
            message: message.notification.message || 'System notification',
            priority: (message.notification.priority as 'low' | 'medium' | 'high' | 'urgent') || 'high',
            timestamp: message.notification.createdAt || new Date().toISOString(),
            data: message.notification.data || {}
          };
        } else {
          // Fallback for old format
          notification = {
            type: 'system_alert',
            title: 'System Alert',
            message: 'System notification',
            priority: 'high',
            timestamp: new Date().toISOString(),
            data: {}
          };
        }
        
        // Show popup notification
        this.showPopupNotification(notification);
        break;

      case 'invoice':
        // Use the actual notification data from the backend
        if (message.notification) {
          notification = {
            type: message.notification.type || 'invoice',
            title: message.notification.title || 'Invoice Notification',
            message: message.notification.message || 'Invoice notification',
            priority: (message.notification.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
            timestamp: message.notification.createdAt || new Date().toISOString(),
            data: message.notification.data || {}
          };
        } else {
          // Fallback for old format
          notification = {
            type: 'invoice',
            title: 'Invoice Notification',
            message: 'Invoice notification',
            priority: 'medium',
            timestamp: new Date().toISOString(),
            data: {}
          };
        }
        
        // Show popup notification
        this.showPopupNotification(notification);
        break;

      case 'payment':
        // Use the actual notification data from the backend
        if (message.notification) {
          notification = {
            type: message.notification.type || 'payment',
            title: message.notification.title || 'Payment Notification',
            message: message.notification.message || 'Payment notification',
            priority: (message.notification.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
            timestamp: message.notification.createdAt || new Date().toISOString(),
            data: message.notification.data || {}
          };
        } else {
          // Fallback for old format
          notification = {
            type: 'payment',
            title: 'Payment Notification',
            message: 'Payment notification',
            priority: 'medium',
            timestamp: new Date().toISOString(),
            data: {}
          };
        }
        
        // Show popup notification
        this.showPopupNotification(notification);
        break;

      case 'chat_message':
      case 'chat_message_status':
      case 'chat_conversation_updated':
        this.notifyChatListeners(message);
        if (message.type === 'chat_message' && (message as any).message) {
          const msg = (message as any).message as {
            senderUserId?: string;
            senderMongoId?: string;
            senderName?: string;
            text?: string;
            conversationId?: string;
          };
          const myIds = new Set<string>();
          if (this.userId) myIds.add(String(this.userId));
          try {
            if (this.token) {
              const payload = JSON.parse(atob(this.token.split('.')[1] || '')) as {
                user_id?: string;
                _id?: string;
              };
              if (payload.user_id) myIds.add(String(payload.user_id));
              if (payload._id) myIds.add(String(payload._id));
            }
          } catch {
            /* ignore */
          }
          const isOwn =
            (msg.senderUserId && myIds.has(String(msg.senderUserId))) ||
            (msg.senderMongoId && myIds.has(String(msg.senderMongoId)));
          if (!isOwn) {
            const chatNotification: RealtimeNotification = {
              type: 'chat_message',
              title: msg.senderName || 'New message',
              message: String(msg.text || '').slice(0, 160) || 'You have a new chat message',
              priority: 'high',
              timestamp: new Date().toISOString(),
              data: {
                conversationId: msg.conversationId,
                openMessenger: true,
              },
            };
            void this.showPopupNotification(chatNotification);
            try {
              // Short WhatsApp-style ping (no external asset required)
              const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioCtx) {
                const ctx = new AudioCtx();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = 880;
                gain.gain.value = 0.05;
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.12);
                setTimeout(() => ctx.close().catch(() => null), 300);
              }
            } catch {
              /* ignore audio errors */
            }
          }
        }
        break;

      default:
        console.log('Unknown notification type:', message.type);
    }

    if (notification) {
      this.notifyListeners(notification);
    }
  }

  private subscribeToUpdates() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Subscribe to relevant channels based on user type
      const channels = ['notifications'];
      
      if (this.userType === 'manager') {
        channels.push('orders', 'customers');
      } else if (this.userType === 'customer') {
        channels.push('orders', 'products');
      } else if (this.userType === 'admin') {
        channels.push('orders', 'customers', 'products', 'system');
      }

      channels.forEach(channel => {
        this.ws!.send(JSON.stringify({
          type: 'subscribe',
          channel: channel
        }));
      });
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  private notifyListeners(notification: RealtimeNotification) {
    this.listeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Public methods
  addListener(listener: (notification: RealtimeNotification) => void) {
    this.listeners.push(listener);
  }

  removeListener(listener: (notification: RealtimeNotification) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  addChatListener(listener: (payload: any) => void) {
    this.chatListeners.push(listener);
  }

  removeChatListener(listener: (payload: any) => void) {
    this.chatListeners = this.chatListeners.filter((l) => l !== listener);
  }

  private notifyChatListeners(payload: any) {
    this.chatListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error("Error in chat listener:", error);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.listeners = [];
    this.chatListeners = [];
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }

  // Update authentication when user logs in/out
  updateAuth(token: string | null, userType: string | null, userId: string | null) {
    this.token = token;
    this.userType = userType;
    this.userId = userId;
    
    if (token && userType && userId) {
      this.connect();
    } else {
      this.disconnect();
    }
  }

  /**
   * Show popup notification for all events
   */
  private async showPopupNotification(notification: RealtimeNotification) {
    try {
      console.log('🔔 showPopupNotification called with:', notification);
      console.log('🔔 Number of listeners:', this.listeners.length);
      
      // First, notify all React listeners (this triggers the popup in the UI)
      console.log('🔔 Notifying React listeners:', notification);
      this.listeners.forEach((listener, index) => {
        try {
          console.log(`🔔 Calling listener ${index}:`, listener);
          listener(notification);
          console.log(`✅ Listener ${index} called successfully`);
        } catch (error) {
          console.error(`❌ Error in listener ${index}:`, error);
        }
      });

      // Request notification permission if not already granted
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      if (Notification.permission === 'granted') {
        // Show browser notification popup
        await pushNotificationService.showNotification(notification.title, {
          body: notification.message,
          icon: '/images/logo/logo-icon.svg',
          badge: '/images/logo/logo-icon.svg',
          tag: notification.type,
          requireInteraction: true, // Keep notification visible for 60 seconds
          silent: notification.priority === 'low',
          data: notification.data
        });

        console.log('🔔 Browser notification shown:', notification.title);
      } else {
        console.warn('Notification permission not granted');
      }
    } catch (error) {
      console.error('Error showing popup notification:', error);
    }
  }
}

// Create singleton instance
const realtimeNotificationService = new RealtimeNotificationService();

export default realtimeNotificationService;
