const WebSocket = require('ws');

class RealtimeService {
  constructor() {
    this.wss = null;
    this.connections = new Map(); // Store user connections
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.wss.on('connection', (ws, req) => {
      console.log('🔌 New WebSocket connection established');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        this.removeConnection(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeConnection(ws);
      });
    });

    console.log('✅ Realtime service initialized');
  }

  handleMessage(ws, data) {
    switch (data.type) {
      case 'authenticate':
        this.authenticateConnection(ws, data);
        break;
      case 'subscribe':
        this.subscribeToUpdates(ws, data);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  authenticateConnection(ws, data) {
    const { token, userType, userId, userIds } = data;
    const idSet = new Set(
      [userId, ...(Array.isArray(userIds) ? userIds : [])]
        .filter(Boolean)
        .map((id) => String(id))
    );

    // Store connection with user info (support mongo _id + business user_id)
    this.connections.set(ws, {
      token,
      userType,
      userId: userId ? String(userId) : null,
      userIds: [...idSet],
      subscriptions: new Set()
    });

    ws.send(JSON.stringify({
      type: 'authenticated',
      message: 'Connection authenticated successfully'
    }));
  }

  subscribeToUpdates(ws, data) {
    const connection = this.connections.get(ws);
    if (!connection) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not authenticated'
      }));
      return;
    }

    const { channel } = data;
    connection.subscriptions.add(channel);
    
    ws.send(JSON.stringify({
      type: 'subscribed',
      channel,
      message: `Subscribed to ${channel}`
    }));
  }

  removeConnection(ws) {
    this.connections.delete(ws);
  }

  // Send updates to specific users (matches primary userId or any alias ids)
  sendToUser(userId, data) {
    const target = String(userId || "");
    console.log(`🔍 Attempting to send realtime message to user ${target}`);
    console.log(`🔍 Active connections:`, this.connections.size);

    let sent = false;
    for (const [ws, connection] of this.connections) {
      const aliases = new Set(
        [connection.userId, ...(connection.userIds || [])]
          .filter(Boolean)
          .map((id) => String(id))
      );
      console.log(`🔍 Checking connection for user ${connection.userId}, state: ${ws.readyState}`);
      if (target && aliases.has(target) && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
        console.log(`📤 Sent realtime message to user ${target}:`, data);
        sent = true;
      }
    }

    if (!sent) {
      console.log(`❌ No active connection found for user ${target}`);
    }

    return sent;
  }

  isUserConnected(userId) {
    const target = String(userId || "");
    for (const [ws, connection] of this.connections) {
      const aliases = new Set(
        [connection.userId, ...(connection.userIds || [])]
          .filter(Boolean)
          .map((id) => String(id))
      );
      if (target && aliases.has(target) && ws.readyState === WebSocket.OPEN) return true;
    }
    return false;
  }

  // Send updates to managers
  sendToManagers(data) {
    for (const [ws, connection] of this.connections) {
      if (connection.userType === 'manager' && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    }
  }

  // Send updates to customers
  sendToCustomers(data) {
    for (const [ws, connection] of this.connections) {
      if (connection.userType === 'customer' && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    }
  }

  // Send updates to all users in a company
  sendToCompany(companyId, data) {
    for (const [ws, connection] of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        // Send to all connected users (company filtering is handled by the frontend)
        ws.send(JSON.stringify(data));
      }
    }
  }

  // Send order status updates
  sendOrderStatusUpdate(order, oldStatus, newStatus, updatedBy) {
    const data = {
      type: 'order_status_update',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: newStatus,
        oldStatus: oldStatus,
        updatedBy: updatedBy,
        updatedAt: new Date().toISOString()
      }
    };

    // Send to customer who placed the order
    if (order.customer) {
      this.sendToUser(order.customer.toString(), data);
    }

    // Send to managers
    this.sendToManagers(data);
  }

  // Send new order notifications
  sendNewOrderNotification(order) {
    const data = {
      type: 'new_order',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt
      }
    };

    this.sendToManagers(data);
  }

  // Send customer assignment notifications
  sendCustomerAssignmentNotification(customer, manager) {
    const data = {
      type: 'customer_assignment',
      customer: {
        _id: customer._id,
        companyName: customer.companyName,
        contactName: customer.contactName
      },
      manager: {
        _id: manager._id,
        user_id: manager.user_id
      }
    };

    this.sendToUser(manager.user_id, data);
  }

  // Send product updates
  sendProductUpdate(product, action) {
    const data = {
      type: 'product_update',
      product: {
        _id: product._id,
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock
      },
      action: action // 'created', 'updated', 'deleted'
    };

    this.sendToCustomers(data);
  }

  // Get connection count
  getConnectionCount() {
    return this.connections.size;
  }

  // Get connections by type
  getConnectionsByType(userType) {
    const connections = [];
    for (const [ws, connection] of this.connections) {
      if (connection.userType === userType) {
        connections.push(connection);
      }
    }
    return connections;
  }
}

module.exports = new RealtimeService();

