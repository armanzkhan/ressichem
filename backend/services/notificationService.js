//services/notificationService.js
const Notification = require('../models/Notification');
const NotificationSubscription = require('../models/NotificationSubscription');
const User = require('../models/User');
const Role = require('../models/Role');
const PermissionGroup = require('../models/PermissionGroup');
const webPushService = require('./webPushService');
const mobilePushService = require('./mobilePushService');
const realtimeService = require('./realtimeService');

class NotificationService {
  
  /**
   * Create a new notification
   */
async createNotification(data) {
    const notification = new Notification(data);
    return await notification.save();
  }

async getUserNotifications(userId, companyId, limit = 10) {
  try {
    const notifications = await Notification.find({
      $or: [
        { targetIds: { $in: [String(userId)] } },
        { targetIds: { $in: [String(companyId)] } }
      ],
      company_id: String(companyId),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return notifications;
  } catch (err) {
    console.error("Error fetching notifications:", err);
    throw err;
  }
}
  /**
   * Get target users based on notification target configuration
   */
  async getTargetUsers(notification) {
    const { targetType, targetIds, company_id } = notification;
    
    let targetUsers = [];
    
    switch (targetType) {
      case 'user':
        // Specific users
        targetUsers = await User.find({ 
          user_id: { $in: targetIds },
          company_id: company_id 
        });
        break;
        
      case 'customer':
        // Specific customers - find users associated with these customer IDs
        const Customer = require('../models/Customer');
        const customers = await Customer.find({ 
          _id: { $in: targetIds },
          company_id: company_id 
        });
        
        // Find users with matching emails
        const customerEmails = customers.map(customer => customer.email);
        targetUsers = await User.find({ 
          email: { $in: customerEmails },
          company_id: company_id 
        });
        break;
        
      case 'role':
        // Users with specific roles
        const roles = await Role.find({ 
          _id: { $in: targetIds },
          company_id: company_id 
        });
        const roleIds = roles.map(role => role._id);
        targetUsers = await User.find({ 
          roles: { $in: roleIds },
          company_id: company_id 
        });
        break;
        
      case 'permission_group':
        // Users with specific permission groups
        const groups = await PermissionGroup.find({ 
          _id: { $in: targetIds },
          company_id: company_id 
        });
        const groupIds = groups.map(group => group._id);
        const rolesWithGroups = await Role.find({ 
          permissionGroups: { $in: groupIds },
          company_id: company_id 
        });
        const roleIdsFromGroups = rolesWithGroups.map(role => role._id);
        targetUsers = await User.find({ 
          roles: { $in: roleIdsFromGroups },
          company_id: company_id 
        });
        break;
        
      case 'company':
        // All users in company
        targetUsers = await User.find({ company_id: company_id });
        break;
        
      case 'all':
        // All users across all companies (super admin only)
        targetUsers = await User.find({});
        break;
        
      default:
        throw new Error(`Invalid target type: ${targetType}`);
    }
    
    return targetUsers;
  }

  /**
   * Get active subscriptions for users
   */
  async getActiveSubscriptions(userIds, channels = ['in_app', 'web_push', 'mobile_push']) {
    return await NotificationSubscription.find({
      user_id: { $in: userIds },
      isActive: true
    });
  }

  /**
   * Send notification to target users
   */
  async sendNotification(notificationId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      // Update status to sending
      notification.status = 'sending';
      await notification.save();

      // Get target users
      const targetUsers = await this.getTargetUsers(notification);
      const userIds = targetUsers.map(user => user.user_id);
      
      // Update delivery stats
      notification.delivery_stats.total_recipients = userIds.length;
      await notification.save();

      // Send real-time notification only to the users this notice is for.
      try {
        const recipientIds = targetUsers.flatMap((user) => [user.user_id, user._id].filter(Boolean).map(String));
        realtimeService.sendToUsers(recipientIds, {
          type: 'notification',
          notification: {
            _id: notification._id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            priority: notification.priority,
            createdAt: notification.createdAt,
            data: notification.data,
            sender_name: notification.sender_name
          }
        });
      } catch (realtimeError) {
        console.error('❌ Real-time notification error:', realtimeError);
      }

      // Get active subscriptions for target users
      const subscriptions = await this.getActiveSubscriptions(userIds);
      
      // Group subscriptions by user
      const userSubscriptions = {};
      subscriptions.forEach(sub => {
        if (!userSubscriptions[sub.user_id]) {
          userSubscriptions[sub.user_id] = [];
        }
        userSubscriptions[sub.user_id].push(sub);
      });

      // Send notifications through each channel
      const results = {
        in_app: await this.sendInAppNotifications(notification, userSubscriptions),
        web_push: await this.sendWebPushNotifications(notification, userSubscriptions),
        mobile_push: await this.sendMobilePushNotifications(notification, userSubscriptions)
      };

      // Update notification status and stats
      const totalDelivered = Object.values(results).reduce((sum, result) => sum + result.delivered, 0);
      const totalFailed = Object.values(results).reduce((sum, result) => sum + result.failed, 0);
      
      notification.delivery_stats.delivered = totalDelivered;
      notification.delivery_stats.failed = totalFailed;
      notification.status = totalFailed > 0 ? 'sent' : 'sent';
      await notification.save();

      return results;
    } catch (error) {
      // Update notification status to failed
      const notification = await Notification.findById(notificationId);
      if (notification) {
        notification.status = 'failed';
        await notification.save();
      }
      throw error;
    }
  }

  /**
   * Send in-app notifications
   */
  async sendInAppNotifications(notification, userSubscriptions) {
    let delivered = 0;
    let failed = 0;

    for (const [userId, subscriptions] of Object.entries(userSubscriptions)) {
      try {
        // Check if user has in-app notifications enabled
        // If no subscriptions exist, assume in-app is enabled by default
        let hasInAppEnabled = true;
        
        if (subscriptions && subscriptions.length > 0) {
          hasInAppEnabled = subscriptions.some(sub => 
            sub.preferences && 
            sub.preferences.in_app && 
            sub.preferences.types && 
            sub.preferences.types[notification.type] &&
            sub.preferences.priorities && 
            sub.preferences.priorities[notification.priority]
          );
        }

        if (hasInAppEnabled) {
          // In-app notifications are stored in the notification model
          // The frontend will fetch and display them
          delivered++;
        }
      } catch (error) {
        console.error(`Failed to send in-app notification to user ${userId}:`, error);
        failed++;
      }
    }

    return { delivered, failed };
  }

  /**
   * Send web push notifications
   */
  async sendWebPushNotifications(notification, userSubscriptions) {
    let delivered = 0;
    let failed = 0;

    for (const [userId, subscriptions] of Object.entries(userSubscriptions)) {
      try {
        const webPushSubscriptions = subscriptions.filter(sub => 
          sub.platform === 'web' && 
          sub.preferences.web_push && 
          sub.endpoint &&
          sub.preferences.types[notification.type] &&
          sub.preferences.priorities[notification.priority]
        );

        for (const subscription of webPushSubscriptions) {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh_key,
              auth: subscription.auth_key
            }
          };

          const result = await webPushService.sendNotification(pushSubscription, notification);
          if (result.success) {
            delivered++;
          } else {
            failed++;
          }
        }
      } catch (error) {
        console.error(`Failed to send web push to user ${userId}:`, error);
        failed++;
      }
    }

    return { delivered, failed };
  }

  /**
   * Send mobile push notifications
   */
  async sendMobilePushNotifications(notification, userSubscriptions) {
    let delivered = 0;
    let failed = 0;

    // Group tokens by platform for batch sending
    const androidTokens = [];
    const iosTokens = [];

    for (const [userId, subscriptions] of Object.entries(userSubscriptions)) {
      try {
        const mobileSubscriptions = subscriptions.filter(sub => 
          ['ios', 'android'].includes(sub.platform) && 
          sub.preferences.mobile_push && 
          (sub.fcm_token || sub.apns_token) &&
          sub.preferences.types[notification.type] &&
          sub.preferences.priorities[notification.priority]
        );

        for (const subscription of mobileSubscriptions) {
          if (subscription.platform === 'android' && subscription.fcm_token) {
            androidTokens.push(subscription.fcm_token);
          } else if (subscription.platform === 'ios' && subscription.apns_token) {
            iosTokens.push(subscription.apns_token);
          }
        }
      } catch (error) {
        console.error(`Failed to process mobile subscriptions for user ${userId}:`, error);
        failed++;
      }
    }

    // Send to Android devices
    if (androidTokens.length > 0) {
      try {
        const result = await mobilePushService.sendToMultipleTokens(androidTokens, notification, 'android');
        if (result.success) {
          delivered += result.successCount;
          failed += result.failureCount;
        } else {
          failed += androidTokens.length;
        }
      } catch (error) {
        console.error('Failed to send Android push notifications:', error);
        failed += androidTokens.length;
      }
    }

    // Send to iOS devices
    if (iosTokens.length > 0) {
      try {
        const result = await mobilePushService.sendToMultipleTokens(iosTokens, notification, 'ios');
        if (result.success) {
          delivered += result.successCount;
          failed += result.failureCount;
        } else {
          failed += iosTokens.length;
        }
      } catch (error) {
        console.error('Failed to send iOS push notifications:', error);
        failed += iosTokens.length;
      }
    }

    return { delivered, failed };
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId, companyId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      type,
      priority,
      unreadOnly = false,
      since
    } = options;

    // Get user's roles and permission groups to determine which notifications they should see
    const user = await User.findOne({ user_id: userId, company_id: companyId })
      .populate('roles')
      .populate('roles.permissionGroups');

    if (!user) {
      return [];
    }

    const userRoleIds = user.roles.map(role => role._id.toString());
    const userGroupIds = user.roles.flatMap(role => 
      role.permissionGroups ? role.permissionGroups.map(group => group._id.toString()) : []
    );

    // Build query
    const query = {
      company_id: companyId,
      isActive: true,
      $or: [
        { targetType: 'all' },
        { targetType: 'company' },
        { targetType: 'user', targetIds: userId },
        { targetType: 'role', targetIds: { $in: userRoleIds } },
        { targetType: 'permission_group', targetIds: { $in: userGroupIds } }
      ]
    };

    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (since) query.createdAt = { $gte: new Date(since) };

    let notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);

    // Filter out read notifications if requested
    if (unreadOnly) {
      notifications = notifications.filter(notification => 
        !notification.read_by.some(read => read.user_id === userId)
      );
    }

    return notifications;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    // Check if already read
    const alreadyRead = notification.read_by.some(read => read.user_id === userId);
    if (!alreadyRead) {
      notification.read_by.push({
        user_id: userId,
        read_at: new Date()
      });
      notification.delivery_stats.opened++;
      await notification.save();
    }

    return notification;
  }

  /**
   * Create or update notification subscription
   */
  async createOrUpdateSubscription(subscriptionData) {
    const { user_id, endpoint, fcm_token, apns_token } = subscriptionData;
    
    // Find existing subscription
    let subscription = await NotificationSubscription.findOne({
      user_id,
      $or: [
        { endpoint },
        { fcm_token },
        { apns_token }
      ]
    });

    if (subscription) {
      // Update existing subscription
      Object.assign(subscription, subscriptionData);
      subscription.last_seen = new Date();
    } else {
      // Create new subscription
      subscription = new NotificationSubscription({
        ...subscriptionData,
        last_seen: new Date()
      });
    }

    await subscription.save();
    return subscription;
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(companyId, dateRange = {}) {
    const query = { company_id: companyId };
    
    if (dateRange.start) {
      query.createdAt = { $gte: new Date(dateRange.start) };
    }
    if (dateRange.end) {
      query.createdAt = { ...query.createdAt, $lte: new Date(dateRange.end) };
    }

    const stats = await Notification.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          totalRecipients: { $sum: '$delivery_stats.total_recipients' },
          totalDelivered: { $sum: '$delivery_stats.delivered' },
          totalOpened: { $sum: '$delivery_stats.opened' },
          totalClicked: { $sum: '$delivery_stats.clicked' }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      sent: 0,
      failed: 0,
      totalRecipients: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0
    };
  }
}

module.exports = new NotificationService();
