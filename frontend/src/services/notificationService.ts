import PushNotificationService from './pushNotificationService';

interface NotificationData {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'order' | 'delivery' | 'invoice' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  data?: any;
  sender_name?: string;
  read?: boolean;
}

interface NotificationSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class NotificationService {
  private static instance: NotificationService;
  private eventSource: EventSource | null = null;
  private listeners: ((notification: NotificationData) => void)[] = [];
  private isConnected = false;
  private pushService: PushNotificationService;
  private pollingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.pushService = PushNotificationService.getInstance();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Initialize real-time connection
  async initialize(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping notification stream initialization');
        return;
      }

      // Temporarily disable notification stream to prevent connection errors
      console.log('Notification stream temporarily disabled to prevent connection errors');
      console.log('Using polling-based notifications instead...');
      
      // Start polling for notifications instead
      this.startPolling();
      return;

    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  // Subscribe to notifications
  subscribe(callback: (notification: NotificationData) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private notifyListeners(notification: NotificationData): void {
    this.listeners.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  // Get recent notifications
  async getRecentNotifications(limit = 10): Promise<NotificationData[]> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return [];

      const response = await fetch(
        `/api/notifications/recent?limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const notifications = await response.json();
      console.log('🔔 Fetched notifications from API:', notifications);
      console.log('🔔 First notification details:', notifications[0]);
      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch(
        `/api/notifications/${notificationId}/read`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Subscribe to web push notifications
  async subscribeToWebPush(): Promise<boolean> {
    try {
      // Import push notification service dynamically to avoid circular dependencies
      const pushService = await import('./pushNotificationService');
      const pushNotificationService = pushService.pushNotificationService;
      
      if (!pushNotificationService.isPushSupported()) {
        console.warn('Push messaging is not supported');
        return false;
      }

      // Check if already subscribed
      const existingSubscription = await pushNotificationService.getCurrentSubscription();
      if (existingSubscription) {
        console.log('Already subscribed to push notifications');
        return true;
      }

      // Request permission if needed
      const permissionState = pushNotificationService.getPermissionState();
      if (permissionState.default) {
        const granted = await pushNotificationService.requestPermission();
        if (!granted) {
          console.warn('Push notification permission not granted');
          return false;
        }
      }

      // Initialize push notifications
      const success = await pushNotificationService.initialize();
      if (!success) {
        console.warn('Failed to initialize push notifications');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error subscribing to web push:', error);
      return false;
    }
  }


  // Start polling for notifications
  private startPolling(): void {
    console.log('🔄 Starting notification polling...');
    this.isConnected = true;
    
    // Poll every 30 seconds for new notifications
    this.pollingInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('/api/notifications/recent', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const notifications = await response.json();
          // Process new notifications
          notifications.forEach((notification: NotificationData) => {
            this.notifyListeners(notification);
          });
        }
      } catch (error) {
        console.error('Error polling notifications:', error);
      }
    }, 30000); // Poll every 30 seconds
  }

  // Disconnect
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isConnected = false;
    this.listeners = [];
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export default NotificationService;
export type { NotificationData };
