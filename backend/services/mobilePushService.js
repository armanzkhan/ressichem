//services/mobilePushService.js
const { getAdmin, isFirebaseConfigured, initializeFirebaseAdmin } = require("./firebaseAdmin");

class MobilePushService {
  constructor() {
    this.initialized = false;
    this.initializeFirebase();
  }

  initializeFirebase() {
    if (!isFirebaseConfigured()) {
      console.warn("Firebase environment variables not set. Mobile push notifications will be disabled.");
      this.initialized = false;
      return;
    }
    this.initialized = initializeFirebaseAdmin();
  }

  get messaging() {
    const admin = getAdmin();
    return admin ? admin.messaging() : null;
  }

  async sendNotification(token, notification, platform = 'android') {
    if (!this.initialized || !this.messaging) {
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message = {
        token: token,
        notification: {
          title: notification.title,
          body: notification.message
        },
        data: {
          notificationId: notification._id,
          type: notification.type,
          priority: notification.priority,
          url: notification.data?.url || '/notifications'
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: this.getNotificationColor(notification.type),
            priority: this.getAndroidPriority(notification.priority),
            sound: notification.priority === 'urgent' ? 'default' : 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.message
              },
              badge: 1,
              sound: notification.priority === 'urgent' ? 'default' : 'default',
              category: notification.type
            }
          }
        }
      };

      const response = await this.messaging.send(message);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('Error sending mobile push notification:', error);
      return { success: false, error: error.message };
    }
  }

  async sendToMultipleTokens(tokens, notification, platform = 'android') {
    if (!this.initialized || !this.messaging) {
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message = {
        tokens: tokens,
        notification: {
          title: notification.title,
          body: notification.message
        },
        data: {
          notificationId: notification._id,
          type: notification.type,
          priority: notification.priority,
          url: notification.data?.url || '/notifications'
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: this.getNotificationColor(notification.type),
            priority: this.getAndroidPriority(notification.priority)
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.message
              },
              badge: 1,
              sound: 'default',
              category: notification.type
            }
          }
        }
      };

      const response = await this.messaging.sendMulticast(message);
      return { 
        success: true, 
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses
      };
    } catch (error) {
      console.error('Error sending multicast mobile push notification:', error);
      return { success: false, error: error.message };
    }
  }

  getNotificationColor(type) {
    const colors = {
      info: '#3B82F6',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      order: '#8B5CF6',
      delivery: '#6366F1',
      invoice: '#EC4899',
      system: '#6B7280'
    };
    return colors[type] || '#3B82F6';
  }

  getAndroidPriority(priority) {
    const priorities = {
      low: 'low',
      medium: 'normal',
      high: 'high',
      urgent: 'high'
    };
    return priorities[priority] || 'normal';
  }

  async validateToken(token) {
    if (!this.initialized || !this.messaging) {
      return false;
    }

    try {
      await this.messaging.send(
        {
          token: token,
          data: { test: "true" },
        },
        true
      );
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new MobilePushService();
