// Push Notification Service
// Handles push notification registration, subscription, and management

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushPermissionState {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private isSupported: boolean = false;
  private _initialized: boolean = false;

  private constructor() {
    // Don't check support during construction - do it lazily
    this.isSupported = false;
  }
  
  private ensureInitialized() {
    if (this._initialized) return;
    if (typeof window === 'undefined') {
      this.isSupported = false;
      this._initialized = true;
      return;
    }
    this.checkSupport();
    this._initialized = true;
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Check if push notifications are supported
   */
  private checkSupport(): void {
    // Check if we're in a browser environment first
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      this.isSupported = false;
      return;
    }
    
    // Check if push notifications are enabled via environment variable
    const pushEnabled = process.env.NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS !== 'false';
    
    this.isSupported = !!(
      pushEnabled &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      window.isSecureContext // Push notifications require HTTPS
    );

    if (this.isSupported) {
      console.log('✅ Push notifications are supported');
    } else {
      if (!pushEnabled) {
        console.log('ℹ️ Push notifications disabled via environment variable');
      } else if (typeof window !== 'undefined' && !window.isSecureContext) {
        console.log('ℹ️ Push notifications require HTTPS (not supported in HTTP)');
      } else {
        console.log('ℹ️ Push notifications are not supported in this browser');
      }
    }
  }

  /**
   * Get push notification support status
   */
  public isPushSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Get current permission state
   */
  public getPermissionState(): PushPermissionState {
    if (!this.isSupported) {
      return { granted: false, denied: false, default: false };
    }

    const permission = Notification.permission;
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default'
    };
  }

  /**
   * Request push notification permission
   */
  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('Push notification permission:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting push notification permission:', error);
      return false;
    }
  }

  /**
   * Register service worker
   */
  public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported) {
      console.warn('Service worker registration not supported');
      return null;
    }

    try {
      // Check if service worker is already registered
      const existingRegistration = await navigator.serviceWorker.getRegistration('/');
      if (existingRegistration) {
        console.log('Service worker already registered');
        this.registration = existingRegistration;
        return this.registration;
      }

      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });

      console.log('Service worker registered successfully:', this.registration);
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('Service worker is ready');

      return this.registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      // Don't throw the error, just return null to allow the app to continue
      return null;
    }
  }

  /**
   * Subscribe to push notifications
   */
  public async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.isSupported || !this.registration) {
      console.warn('Push subscription not supported or service worker not registered');
      return null;
    }

    try {
      // Check if already subscribed
      this.subscription = await this.registration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('Already subscribed to push notifications');
        return this.subscription;
      }

      // Get VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.warn('VAPID public key not configured - push notifications disabled');
        return null;
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push notifications with error handling
      try {
        this.subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
      } catch (subscribeError) {
        console.error('Push subscription failed:', subscribeError);
        // If subscription fails, don't throw - just return null
        return null;
      }

      console.log('Push subscription created:', this.subscription);

      // Send subscription to backend
      await this.sendSubscriptionToBackend(this.subscription);

      return this.subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  public async unsubscribeFromPush(): Promise<boolean> {
    if (!this.subscription) {
      console.log('No active push subscription to unsubscribe');
      return true;
    }

    try {
      const result = await this.subscription.unsubscribe();
      if (result) {
        console.log('Successfully unsubscribed from push notifications');
        this.subscription = null;
        
        // Notify backend about unsubscription
        await this.removeSubscriptionFromBackend();
      }
      return result;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  /**
   * Get current push subscription
   */
  public async getCurrentSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      return null;
    }

    try {
      this.subscription = await this.registration.pushManager.getSubscription();
      return this.subscription;
    } catch (error) {
      console.error('Error getting current subscription:', error);
      return null;
    }
  }

  /**
   * Send subscription to backend
   */
  private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found, skipping subscription to backend');
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        }
      };

      const response = await fetch(`${backendUrl}/api/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      });

      if (response.ok) {
        console.log('Push subscription sent to backend successfully');
      } else {
        console.error('Failed to send push subscription to backend:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending subscription to backend:', error);
    }
  }

  /**
   * Remove subscription from backend
   */
  private async removeSubscriptionFromBackend(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found, skipping subscription removal from backend');
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/notifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('Push subscription removed from backend successfully');
      } else {
        console.error('Failed to remove push subscription from backend:', response.statusText);
      }
    } catch (error) {
      console.error('Error removing subscription from backend:', error);
    }
  }

  /**
   * Initialize push notifications (register service worker and subscribe)
   */
  public async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.log('ℹ️ Push notifications are not supported in this environment');
      return false;
    }

    try {
      // Register service worker
      const registration = await this.registerServiceWorker();
      if (!registration) {
        return false;
      }

      // Check permission
      const permissionState = this.getPermissionState();
      if (permissionState.denied) {
        console.warn('Push notification permission denied');
        return false;
      }

      if (permissionState.default) {
        // Request permission
        const granted = await this.requestPermission();
        if (!granted) {
          console.warn('Push notification permission not granted');
          return false;
        }
      }

      // Subscribe to push notifications
      const subscription = await this.subscribeToPush();
      return !!subscription;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }

  /**
   * Show a test notification
   */
  public async showTestNotification(): Promise<void> {
    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return;
    }

    const permission = this.getPermissionState();
    if (!permission.granted) {
      console.warn('Push notification permission not granted');
      return;
    }

    try {
      const notification = new Notification('Test Notification', {
        body: 'This is a test notification from the Admin Dashboard',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test-notification',
        requireInteraction: false
      });

      notification.onclick = () => {
        console.log('Test notification clicked');
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    } catch (error) {
      console.error('Error showing test notification:', error);
    }
  }

  /**
   * Convert base64 URL to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Get subscription info for debugging
   */
  public getSubscriptionInfo(): any {
    if (!this.subscription) {
      return null;
    }

    return {
      endpoint: this.subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(this.subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(this.subscription.getKey('auth')!)
      }
    };
  }

  /**
   * Show browser notification popup
   */
  public async showNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (!this.isSupported) {
      console.warn('Notifications not supported');
      return;
    }

    try {
      const defaultOptions: NotificationOptions = {
        body: 'You have a new notification',
        icon: '/images/logo/logo-icon.svg',
        badge: '/images/logo/logo-icon.svg',
        requireInteraction: true, // Keep notification visible until user interacts
        silent: false,
        tag: 'notification',
        ...options
      };

      if (this.registration) {
        await this.registration.showNotification(title, defaultOptions);
      } else {
        await new Notification(title, defaultOptions);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }
}

export default PushNotificationService;

// Export singleton instance (lazy getter to avoid evaluation during build)
let _pushNotificationServiceInstance: PushNotificationService | null = null;

function getServiceInstance(): PushNotificationService {
  if (typeof window === 'undefined') {
    // Return a mock object during SSR
    return {
      isPushSupported: () => false,
      getPermissionState: () => ({ granted: false, denied: false, default: true }),
      getSubscriptionInfo: () => null,
      getCurrentSubscription: async () => null,
      requestPermission: async () => false,
      registerServiceWorker: async () => null,
      subscribeToPush: async () => null,
      unsubscribeFromPush: async () => false,
      initialize: async () => false,
      showTestNotification: async () => {},
      showNotification: async () => {},
    } as any;
  }
  if (!_pushNotificationServiceInstance) {
    _pushNotificationServiceInstance = PushNotificationService.getInstance();
  }
  return _pushNotificationServiceInstance;
}

export const pushNotificationService = {
  // Proxy methods for convenience
  isPushSupported(): boolean {
    return getServiceInstance().isPushSupported();
  },
  getPermissionState() {
    return getServiceInstance().getPermissionState();
  },
  getSubscriptionInfo() {
    return getServiceInstance().getSubscriptionInfo();
  },
  async getCurrentSubscription() {
    return getServiceInstance().getCurrentSubscription();
  },
  async requestPermission() {
    return getServiceInstance().requestPermission();
  },
  async registerServiceWorker() {
    return getServiceInstance().registerServiceWorker();
  },
  async subscribeToPush() {
    return getServiceInstance().subscribeToPush();
  },
  async unsubscribeFromPush() {
    return getServiceInstance().unsubscribeFromPush();
  },
  async initialize() {
    return getServiceInstance().initialize();
  },
  async showTestNotification() {
    return getServiceInstance().showTestNotification();
  },
  async showNotification(title: string, options: NotificationOptions = {}) {
    return getServiceInstance().showNotification(title, options);
  },
};