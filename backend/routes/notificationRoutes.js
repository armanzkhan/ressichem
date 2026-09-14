const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');
const NotificationSubscription = require('../models/NotificationSubscription');
const notificationService = require('../services/notificationService');
const notificationTriggerService = require('../services/notificationTriggerService');

// Get recent notifications
router.get('/recent', authMiddleware, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user.user_id;
    const User = require('../models/User');
    const Customer = require('../models/Customer');
    const Order = require('../models/Order');

    console.log('Fetching notifications for user:', userId);
    console.log('User company_id:', req.user.company_id);
    console.log('User roles:', req.user.roles);
    console.log('User isCustomer:', req.user.isCustomer);

    // Get notifications for the user
    const query = {
      $or: [
        { targetType: 'all' },
        ...(userId
          ? [
              { targetType: 'user', targetIds: userId },
              { targetType: 'role', targetIds: { $in: req.user.roles || [] } },
              { targetType: 'company', targetIds: req.user.company_id },
              { targetType: 'company', targetIds: { $in: [req.user.company_id, 'RESSICHEM'] } },
            ]
          : []),
      ],
      company_id: { $in: [req.user.company_id, 'system', 'RESSICHEM'] }
    };

    // If user is a customer, filter to only show order-related notifications
    if (req.user.isCustomer) {
      console.log('🔍 Customer detected - filtering to order-related notifications only');
      
      // Find customer record
      const currentUser = await User.findById(req.user._id).select('email');
      if (currentUser) {
        const customer = await Customer.findOne({ 
          email: currentUser.email,
          company_id: req.user.company_id || 'RESSICHEM'
        });
        
        if (customer) {
          // Get customer's order IDs
          const customerOrders = await Order.find({ 
            customer: customer._id,
            company_id: req.user.company_id || 'RESSICHEM'
          }).select('_id orderNumber');
          
          const customerOrderIds = customerOrders.map(order => order._id.toString());
          const customerOrderNumbers = customerOrders.map(order => order.orderNumber);
          
          console.log('🔍 Customer order IDs:', customerOrderIds);
          console.log('🔍 Customer order numbers:', customerOrderNumbers);
          
          // Filter notifications: only order-related types AND must be for customer's orders
          query = {
            $and: [
              { company_id: { $in: [req.user.company_id, 'system', 'RESSICHEM'] } },
              // Only order-related notification types
              { type: { $in: ['order', 'delivery', 'invoice', 'payment', 'item_approval_status', 'discount_updated'] } },
              // AND must be for this customer's orders OR directly targeted to customer
              {
                $or: [
                  // Check if notification data.entityId matches customer's order IDs
                  { 'data.entityId': { $in: customerOrderIds } },
                  // Check if notification data.entityId matches customer's order numbers
                  { 'data.entityId': { $in: customerOrderNumbers } },
                  // Check if notification data.orderId matches customer's order IDs
                  { 'data.orderId': { $in: customerOrderIds } },
                  // Check if notification data.orderId matches customer's order numbers
                  { 'data.orderId': { $in: customerOrderNumbers } },
                  // Check if notification data.orderNumber matches customer's order numbers
                  { 'data.orderNumber': { $in: customerOrderNumbers } },
                  // Also include notifications directly targeted to this customer
                  { targetType: 'customer', targetIds: customer._id.toString() },
                  { targetType: 'user', targetIds: userId }
                ]
              }
            ]
          };
        } else {
          console.log('⚠️ Customer record not found for user:', userId);
          // Return empty array if customer not found
          return res.json([]);
        }
      }
    }

    console.log('Notification query:', JSON.stringify(query, null, 2));

    const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    console.log('Found notifications:', notifications.length);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching recent notifications:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.post('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.user_id;

    await Notification.findByIdAndUpdate(
      notificationId,
      { $addToSet: { read_by: { user_id: userId, read_at: new Date() } } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Subscribe to web push notifications
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    const userId = req.user.user_id;

    // Check if subscription already exists
    const existingSubscription = await NotificationSubscription.findOne({
      user_id: userId,
      endpoint: endpoint
    });

    if (existingSubscription) {
      // Update existing subscription
      existingSubscription.keys = keys;
      existingSubscription.isActive = true;
      existingSubscription.updated_at = new Date();
      await existingSubscription.save();
    } else {
      // Create new subscription
      const subscription = new NotificationSubscription({
        user_id: userId,
        endpoint: endpoint,
        keys: keys,
        isActive: true,
        company_id: req.user.company_id
      });
      await subscription.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    res.status(500).json({ error: 'Failed to subscribe to notifications' });
  }
});

// Unsubscribe from web push notifications
router.post('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user.user_id;

    await NotificationSubscription.findOneAndUpdate(
      { user_id: userId, endpoint: endpoint },
      { isActive: false, updated_at: new Date() }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from notifications' });
  }
});

// Server-Sent Events stream for real-time notifications (with token in query)
router.get('/stream', async (req, res) => {
  // Handle token authentication for SSE
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  // Verify token manually
  const jwt = require('jsonwebtoken');
  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const userId = user.user_id;
  const companyId = user.company_id;

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to notification stream' })}\n\n`);

  // Set up interval to check for new notifications
  const checkInterval = setInterval(async () => {
    try {
      // Get unread notifications for this user
      const notifications = await Notification.find({
        $or: [
          { targetType: 'all' },
          { targetType: 'user', targetIds: userId },
          { targetType: 'role', targetIds: { $in: user.roles || [] } },
          { targetType: 'company', targetIds: { $in: [companyId, userId] } }
        ],
        company_id: { $in: [companyId, 'system'] },
        'read_by.user_id': { $ne: userId },
        createdAt: { $gte: new Date(Date.now() - 30000) } // Last 30 seconds
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('sender_id', 'name email');

      // Send each notification
      for (const notification of notifications) {
        const notificationData = {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          createdAt: notification.createdAt,
          data: notification.data,
          sender_name: notification.sender_id?.name || notification.sender_name
        };

        res.write(`data: ${JSON.stringify(notificationData)}\n\n`);
      }
    } catch (error) {
      console.error('Error in notification stream:', error);
    }
  }, 2000); // Check every 2 seconds

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(checkInterval);
  });

  req.on('aborted', () => {
    clearInterval(checkInterval);
  });
});

// Get notification statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const companyId = req.user.company_id;

    const stats = await Notification.aggregate([
      {
        $match: {
          $or: [
            { targetType: 'all' },
            { targetType: 'user', targetIds: userId },
            { targetType: 'role', targetIds: { $in: req.user.roles } },
            { targetType: 'company', targetIds: companyId }
          ],
          company_id: { $in: [companyId, 'system'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: {
              $cond: [
                { $not: { $in: [userId, '$read_by.user_id'] } },
                1,
                0
              ]
            }
          },
          byType: {
            $push: {
              type: '$type',
              priority: '$priority'
            }
          }
        }
      }
    ]);

    res.json(stats[0] || { total: 0, unread: 0, byType: [] });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ error: 'Failed to fetch notification stats' });
  }
});

// Send test notification (for testing purposes)
router.post('/test', authMiddleware, async (req, res) => {
  try {
    const { title, message, type = 'info', priority = 'medium' } = req.body;

    const notification = await notificationTriggerService.sendSystemAnnouncement(
      title || 'Test Notification',
      message || 'This is a test notification',
      priority,
      ['admin', 'super_admin']
    );

    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Test customer creation notification
router.post('/test-customer-notification', authMiddleware, async (req, res) => {
  try {
    console.log('Testing customer creation notification...');
    
    const testCustomer = {
      _id: 'test_customer_123',
      companyName: 'Test Customer',
      company_id: 'RESSICHEM'
    };
    
    const testCreatedBy = {
      _id: req.user.user_id,
      name: req.user.name || 'Admin',
      email: req.user.email || 'admin@example.com'
    };
    
    console.log('Test customer:', testCustomer);
    console.log('Test created by:', testCreatedBy);
    
    const notification = await notificationTriggerService.triggerCustomerCreated(testCustomer, testCreatedBy);
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error testing customer notification:', error);
    res.status(500).json({ error: 'Failed to test customer notification', details: error.message });
  }
});

// Store real-time notification in database
router.post('/store-realtime', authMiddleware, async (req, res) => {
  try {
    console.log('💾 Storing real-time notification in database:', req.body);
    
    const { title, message, type, priority, targetType, targetIds, company_id, sender_id, sender_name, data, timestamp } = req.body;
    
    // Create notification in database
    const notification = await notificationTriggerService.createNotification({
      title,
      message,
      type: type || 'system',
      priority: priority || 'medium',
      targetType: targetType || 'company',
      targetIds: targetIds || [company_id],
      company_id: company_id || 'RESSICHEM',
      sender_id: sender_id || 'system',
      sender_name: sender_name || 'System',
      data: data || {},
      timestamp: timestamp || new Date().toISOString()
    });

    console.log('✅ Real-time notification stored in database:', notification._id);
    
    res.json({ 
      success: true, 
      notification: {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        createdAt: notification.createdAt
      }
    });
  } catch (error) {
    console.error('Error storing real-time notification:', error);
    res.status(500).json({ error: 'Failed to store real-time notification', details: error.message });
  }
});

// Manual push notification test
router.post('/test-push', authMiddleware, async (req, res) => {
  try {
    console.log('Testing manual push notification...');
    
    // Create a simple notification
    const notification = await notificationTriggerService.createNotification({
      title: 'Manual Push Test',
      message: 'This is a manual push notification test',
      type: 'info',
      priority: 'medium',
      targetType: 'company',
      targetIds: [req.user.company_id],
      company_id: req.user.company_id,
      sender_id: req.user.user_id,
      sender_name: req.user.name || 'Admin',
      data: {
        entityType: 'test',
        action: 'manual_test',
        url: '/admin/notifications'
      }
    });

    // Send the notification
    await notificationService.sendNotification(notification._id);
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error testing manual push notification:', error);
    res.status(500).json({ error: 'Failed to test manual push notification', details: error.message });
  }
});

module.exports = router;