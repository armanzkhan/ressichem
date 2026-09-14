const Manager = require("../models/Manager");
const CategoryAssignment = require("../models/CategoryAssignment");
const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");
const notificationService = require("../services/notificationService");
const managerSyncService = require("../services/managerSyncService");
const { getAllCategories, getMainCategories } = require("../utils/productCategories");

// Create or update manager profile
exports.createOrUpdateManager = async (req, res) => {
  try {
    const { user_id, assignedCategories, managerLevel, notificationPreferences } = req.body;
    const companyId = req.user?.company_id || req.headers['x-company-id'] || "RESSICHEM";

    // Check if user exists
    const user = await User.findOne({ user_id, company_id: companyId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate: Customers cannot be assigned as managers
    if (user.isCustomer || user.customerProfile?.customer_id) {
      return res.status(400).json({ 
        message: "Cannot assign manager role: This user is a customer. Customers cannot be managers." 
      });
    }

    // Check if manager already exists
    let manager = await Manager.findOne({ user_id, company_id: companyId });
    
    if (manager) {
      // Update existing manager
      manager.assignedCategories = assignedCategories.map(category => ({
        category,
        assignedBy: req.user.id,
        assignedAt: new Date(),
        isActive: true
      }));
      manager.managerLevel = managerLevel || manager.managerLevel;
      manager.notificationPreferences = { ...manager.notificationPreferences, ...notificationPreferences };
      manager.updatedBy = req.user.id;
    } else {
      // Create new manager
      manager = new Manager({
        user_id,
        company_id: companyId,
        assignedCategories: assignedCategories.map(category => ({
          category,
          assignedBy: req.user.id,
          assignedAt: new Date(),
          isActive: true
        })),
        managerLevel: managerLevel || 'junior',
        notificationPreferences: notificationPreferences || {
          orderUpdates: true,
          stockAlerts: true,
          statusChanges: true,
          newOrders: true,
          lowStock: true,
          categoryReports: true
        },
        createdBy: req.user.id
      });
    }

    await manager.save();

    // Update user profile
    user.isManager = true;
    user.managerProfile = {
      manager_id: manager._id,
      assignedCategories: assignedCategories,
      managerLevel: managerLevel || 'junior',
      canAssignCategories: false,
      notificationPreferences: manager.notificationPreferences
    };
    await user.save();

    // Create category assignments
    for (const category of assignedCategories) {
      await CategoryAssignment.findOneAndUpdate(
        { manager_id: manager._id, category, company_id: companyId },
        {
          manager_id: manager._id,
          user_id,
          company_id: companyId,
          category,
          assignedBy: req.user.id,
          isActive: true,
          isPrimary: true
        },
        { upsert: true, new: true }
      );
    }

    res.status(201).json({
      message: "Manager profile created/updated successfully",
      manager: {
        _id: manager._id,
        user_id: manager.user_id,
        assignedCategories: manager.assignedCategories,
        managerLevel: manager.managerLevel,
        notificationPreferences: manager.notificationPreferences
      }
    });
  } catch (err) {
    console.error("Manager creation error:", err);
    res.status(500).json({ message: "Error creating manager profile", error: err.message });
  }
};

// Get manager profile
exports.getManagerProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const companyId = req.user.company_id;

    console.log('🔍 getManagerProfile called:', {
      userId,
      companyId,
      userEmail: req.user.email,
      user_id_from_token: req.user.user_id,
      company_id_from_token: req.user.company_id
    });

    // First try to find a Manager record
    let manager = await Manager.findOne({ user_id: userId, company_id: companyId })
      .populate('assignedCategories.assignedBy', 'firstName lastName email');

    console.log('🔍 Manager lookup result:', {
      found: !!manager,
      manager_id: manager ? String(manager._id) : 'null'
    });

    // If no Manager record found, check User's managerProfile
    if (!manager) {
      const user = await User.findOne({ user_id: userId, company_id: companyId });
      console.log('🔍 User lookup result:', {
        found: !!user,
        email: user?.email,
        isManager: user?.isManager,
        hasManagerProfile: !!user?.managerProfile,
        managerProfile_manager_id: user?.managerProfile?.manager_id ? String(user.managerProfile.manager_id) : 'null'
      });
      
      if (!user || !user.isManager || !user.managerProfile) {
        console.error('❌ Manager profile not found - User check failed:', {
          userExists: !!user,
          isManager: user?.isManager,
          hasManagerProfile: !!user?.managerProfile
        });
        return res.status(404).json({ message: "Manager profile not found" });
      }

      console.log('⚠️ Manager record not found, using User managerProfile:', {
        user_id: user.user_id,
        email: user.email,
        managerProfile_manager_id: user.managerProfile.manager_id ? String(user.managerProfile.manager_id) : 'null'
      });

      // Try to find Manager record by the manager_id stored in user.managerProfile
      if (user.managerProfile.manager_id) {
        const managerByProfileId = await Manager.findById(user.managerProfile.manager_id);
        if (managerByProfileId) {
          console.log('✅ Found Manager record by managerProfile.manager_id');
          manager = managerByProfileId;
        }
      }

      // If still no Manager record, create a manager object from user's managerProfile
      if (!manager) {
        manager = {
          _id: user.managerProfile.manager_id || user._id,
          user_id: user.user_id,
          assignedCategories: user.managerProfile.assignedCategories.map(category => ({
            category,
            assignedBy: user._id,
            assignedAt: new Date(),
            isActive: true
          })),
          managerLevel: user.managerProfile.managerLevel || 'junior',
          notificationPreferences: user.managerProfile.notificationPreferences || {
            orderUpdates: true,
            stockAlerts: true,
            statusChanges: true,
            newOrders: true,
            lowStock: true,
            categoryReports: true
          },
          permissions: user.managerProfile.permissions || [],
          performance: user.managerProfile.performance || {
            totalOrdersManaged: 0,
            totalProductsManaged: 0,
            averageResponseTime: 0,
            lastActiveAt: new Date()
          }
        };
        console.log('⚠️ Created manager object from User managerProfile (no Manager record exists)');
      }
    } else {
      console.log('✅ Found Manager record:', {
        manager_id: String(manager._id),
        user_id: manager.user_id
      });
    }

    // Get category assignments
    const categoryAssignments = await CategoryAssignment.find({
      manager_id: manager._id,
      isActive: true
    });

    // Get customers assigned to this manager
    const Customer = require('../models/Customer');
    
    // Get all Manager records that match this user_id (in case there are multiple)
    const managerRecords = await Manager.find({ 
      user_id: manager.user_id, 
      company_id: companyId 
    }).select('_id user_id');
    
    // Collect all manager IDs to search for (including the current manager._id)
    const managerIds = [];
    if (manager._id) {
      managerIds.push(manager._id);
    }
    managerRecords.forEach(m => {
      if (m._id && !managerIds.some(id => String(id) === String(m._id))) {
        managerIds.push(m._id);
      }
    });
    
    console.log('🔍 Manager profile lookup:', {
      manager_id: manager._id ? String(manager._id) : 'null',
      user_id: manager.user_id,
      foundManagerRecords: managerRecords.length,
      managerIds: managerIds.map(id => String(id))
    });
    
    // Query customers assigned to any of these manager IDs
    let assignedCustomers = [];
    
    if (managerIds.length > 0) {
      // First, let's check all customers in the company to see their assignments
      const allCustomers = await Customer.find({
        company_id: companyId,
        status: 'active'
      })
        .select('_id companyName contactName email phone assignedManager assignedManagers')
        .populate('assignedManager.manager_id', 'user_id _id')
        .populate('assignedManagers.manager_id', 'user_id _id')
        .limit(100);
      
      console.log(`🔍 Checking ${allCustomers.length} customers in company ${companyId}`);
      console.log(`🔍 Looking for manager IDs: ${managerIds.map(id => String(id)).join(', ')}`);
      
      // Also check for customer "zamar@gmail.com" specifically for debugging
      const zamarCustomer = allCustomers.find(c => c.email === 'zamar@gmail.com');
      if (zamarCustomer) {
        console.log(`🔍 Found zamar@gmail.com customer:`, {
          _id: String(zamarCustomer._id),
          companyName: zamarCustomer.companyName,
          hasAssignedManager: !!zamarCustomer.assignedManager?.manager_id,
          assignedManagersCount: zamarCustomer.assignedManagers?.length || 0
        });
        if (zamarCustomer.assignedManager?.manager_id) {
          const amId = zamarCustomer.assignedManager.manager_id;
          const amIdStr = typeof amId === 'object' ? String(amId._id || amId) : String(amId);
          console.log(`  assignedManager.manager_id: ${amIdStr}`);
        }
        if (zamarCustomer.assignedManagers && zamarCustomer.assignedManagers.length > 0) {
          zamarCustomer.assignedManagers.forEach((am, idx) => {
            if (am.manager_id) {
              const amIdStr = typeof am.manager_id === 'object' ? String(am.manager_id._id || am.manager_id) : String(am.manager_id);
              console.log(`  assignedManagers[${idx}].manager_id: ${amIdStr}`);
            }
          });
        }
      } else {
        console.log(`⚠️ Customer zamar@gmail.com not found in active customers`);
      }
      
      // Filter customers that have this manager assigned
      assignedCustomers = allCustomers.filter(customer => {
        // Check legacy assignedManager
        if (customer.assignedManager?.manager_id) {
          const assignedManagerId = customer.assignedManager.manager_id;
          const managerIdStr = typeof assignedManagerId === 'object' 
            ? String(assignedManagerId._id || assignedManagerId) 
            : String(assignedManagerId);
          
          const matches = managerIds.some(id => String(id) === managerIdStr);
          if (matches) {
            console.log(`✅ Customer ${customer.companyName} (${customer.email}) found via assignedManager: ${managerIdStr}`);
            return true;
          } else {
            console.log(`❌ Customer ${customer.companyName} (${customer.email}) assignedManager.manager_id ${managerIdStr} does NOT match any of: ${managerIds.map(id => String(id)).join(', ')}`);
          }
        }
        
        // Check assignedManagers array
        if (customer.assignedManagers && Array.isArray(customer.assignedManagers)) {
          for (const am of customer.assignedManagers) {
            if (am.manager_id) {
              const managerIdStr = typeof am.manager_id === 'object' 
                ? String(am.manager_id._id || am.manager_id) 
                : String(am.manager_id);
              
              const matches = managerIds.some(id => String(id) === managerIdStr);
              if (matches) {
                console.log(`✅ Customer ${customer.companyName} (${customer.email}) found via assignedManagers: ${managerIdStr}`);
                return true;
              } else {
                console.log(`❌ Customer ${customer.companyName} (${customer.email}) assignedManagers[].manager_id ${managerIdStr} does NOT match any of: ${managerIds.map(id => String(id)).join(', ')}`);
              }
            }
          }
        }
        
        return false;
      });
      
      console.log(`👥 Filtered to ${assignedCustomers.length} assigned customers`);
    } else {
      console.log('⚠️ No manager IDs to search with - manager may not have a Manager record');
      console.log('⚠️ Manager object:', {
        _id: manager._id ? String(manager._id) : 'null',
        user_id: manager.user_id,
        hasManagerRecord: !!manager._id && typeof manager._id !== 'string'
      });
    }
    
    // If no customers found and manager has a user_id, also try to find customers
    // that might have been assigned using the user_id directly (edge case)
    if (assignedCustomers.length === 0 && manager.user_id) {
      console.log('⚠️ No customers found by manager_id, checking if manager needs a Manager record...');
      console.log('💡 Tip: If customers were assigned but manager has no Manager record, create one at /managers/create');
      console.log('💡 Also verify that the customer actually has this manager assigned in the database');
    }
    
    console.log('👥 Final assigned customers count:', assignedCustomers.length);
    assignedCustomers.forEach(c => {
      console.log(`  - ${c.companyName} (${c.email})`);
      console.log(`    assignedManagers count: ${c.assignedManagers?.length || 0}`);
      if (c.assignedManagers && c.assignedManagers.length > 0) {
        c.assignedManagers.forEach((am, idx) => {
          const managerIdStr = typeof am.manager_id === 'object' 
            ? String(am.manager_id._id || am.manager_id) 
            : String(am.manager_id);
          console.log(`    [${idx}] manager_id: ${managerIdStr}`);
        });
      }
      if (c.assignedManager?.manager_id) {
        const managerIdStr = typeof c.assignedManager.manager_id === 'object' 
          ? String(c.assignedManager.manager_id._id || c.assignedManager.manager_id) 
          : String(c.assignedManager.manager_id);
        console.log(`    legacy assignedManager.manager_id: ${managerIdStr}`);
      }
    });

    // Format assignedCategories - handle both object and string formats
    let categories = [];
    if (manager.assignedCategories && Array.isArray(manager.assignedCategories)) {
      categories = manager.assignedCategories
        .filter(cat => cat.isActive !== false) // Filter out inactive categories
        .map(cat => {
          if (typeof cat === 'string') return cat;
          return cat.category || cat;
        });
    }

    console.log('📤 Sending manager profile response:', {
      manager_id: String(manager._id),
      user_id: manager.user_id,
      categories_count: categories.length,
      assignedCustomers_count: assignedCustomers.length
    });

    res.json({
      manager: {
        _id: manager._id,
        user_id: manager.user_id,
        assignedCategories: categories,
        managerLevel: manager.managerLevel,
        notificationPreferences: manager.notificationPreferences,
        permissions: manager.permissions || {},
        performance: manager.performance || {
          totalOrdersManaged: 0,
          totalProductsManaged: 0,
          averageResponseTime: 0,
          lastActiveAt: new Date()
        },
        categoryAssignments: categoryAssignments,
        assignedCustomers: assignedCustomers.map(customer => ({
          _id: customer._id,
          companyName: customer.companyName,
          contactName: customer.contactName,
          email: customer.email,
          phone: customer.phone
        }))
      }
    });
  } catch (err) {
    console.error("Get manager profile error:", err);
    res.status(500).json({ message: "Error fetching manager profile", error: err.message });
  }
};

// Get manager's category-specific orders
exports.getManagerOrders = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const companyId = req.user.company_id;
    const { status, category, page = 1, limit = 10 } = req.query;

    // Get manager user (we need User._id for OrderItemApproval lookup)
    const managerUser = await User.findOne({ user_id: userId, company_id: companyId });
    if (!managerUser || !managerUser.isManager) {
      return res.status(404).json({ message: "Manager profile not found" });
    }

    // Get manager's assigned categories
    let manager = await Manager.findOne({ user_id: userId, company_id: companyId });
    
    // If no Manager record found, check User's managerProfile
    if (!manager) {
      if (!managerUser.managerProfile) {
        return res.status(404).json({ message: "Manager profile not found" });
      }
      
      // Create a manager object from user's managerProfile
      manager = {
        _id: managerUser.managerProfile.manager_id || managerUser._id,
        user_id: managerUser.user_id,
        getCategoryList: () => managerUser.managerProfile.assignedCategories || []
      };
    }

    const assignedCategories = manager.getCategoryList();
    
    console.log('🔍 Manager assigned categories:', assignedCategories);
    console.log('🔍 Manager User._id:', managerUser._id);

    // PRIMARY METHOD: Use OrderItemApproval to find orders assigned to this manager
    // This is the most reliable method as it uses the approval system
    const OrderItemApproval = require('../models/OrderItemApproval');
    const approvalOrderIds = await OrderItemApproval.find({
      assignedManager: managerUser._id,
      company_id: companyId
    }).distinct('orderId');
    
    console.log(`✅ Found ${approvalOrderIds.length} orders via item approvals`);
    if (approvalOrderIds.length > 0) {
      console.log(`   Order IDs from approvals: ${approvalOrderIds.map(id => id.toString()).join(', ')}`);
      // Check if the specific order is in the list
      const targetOrder = await Order.findOne({ orderNumber: 'ORD-1764390780068-4zfr6nbvv' }).select('_id');
      if (targetOrder) {
        const targetOrderIdStr = targetOrder._id.toString();
        const isInApprovals = approvalOrderIds.some(id => id.toString() === targetOrderIdStr);
        console.log(`   Looking for order ORD-1764390780068-4zfr6nbvv (ID: ${targetOrderIdStr}) in approvals: ${isInApprovals ? '✅ FOUND' : '❌ NOT FOUND'}`);
      }
    }

    // FALLBACK METHOD: If no approvals found, use category matching with normalization
    let orderIds = approvalOrderIds;
    
    if (orderIds.length === 0) {
      console.log('⚠️ No item approvals found, falling back to category matching');
      
      // Normalize category name function
      const normalizeCategory = (cat) => {
        if (!cat || typeof cat !== 'string') return '';
        return cat.toLowerCase().trim()
          .replace(/\s*&\s*/g, ' and ')
          .replace(/\s+/g, ' ');
      };
      
      // Normalize manager categories
      const normalizedManagerCategories = assignedCategories.map(cat => 
        normalizeCategory(typeof cat === 'string' ? cat : (cat.category || cat))
      );
      
      console.log('🔍 Normalized manager categories:', normalizedManagerCategories);
      
      // Get all orders and filter by normalized category matching
      const allOrders = await Order.find({ company_id: companyId })
        .select('_id categories');
      
      const matchingOrderIds = allOrders
        .filter(order => {
          if (!order.categories || order.categories.length === 0) return false;
          return order.categories.some(orderCat => {
            const normalizedOrderCat = normalizeCategory(orderCat);
            return normalizedManagerCategories.some(managerCat => 
              normalizedOrderCat === managerCat ||
              normalizedOrderCat.includes(managerCat) ||
              managerCat.includes(normalizedOrderCat)
            );
          });
        })
        .map(order => order._id);
      
      orderIds = matchingOrderIds;
      console.log(`✅ Found ${orderIds.length} orders via normalized category matching`);
    }

    // Build query using order IDs from approvals or category matching
    let query;
    if (orderIds.length > 0) {
      query = {
        _id: { $in: orderIds },
        company_id: companyId
      };
    } else {
      // If no order IDs found, return empty result
      console.log(`⚠️ No order IDs found - returning empty result`);
      return res.json({
        orders: [],
        totalOrders: 0,
        assignedCategories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0
        }
      });
    }

    if (status) query.status = status;

    // Get orders with populated data
    console.log(`🔍 Query for orders:`, JSON.stringify(query, null, 2));
    console.log(`🔍 Order IDs in query: ${orderIds.map(id => id.toString()).join(', ')}`);
    const orders = await Order.find(query)
      .populate('customer', 'companyName contactName email phone')
      .populate('items.product', 'name category price')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    console.log(`📦 Found ${orders.length} orders from database query`);
    console.log(`📦 Looking for order ORD-1764390780068-4zfr6nbvv in results...`);
    orders.forEach(order => {
      console.log(`   - Order: ${order.orderNumber} (${order._id})`);
      console.log(`     Items: ${order.items.length}`);
      if (order.orderNumber === 'ORD-1764390780068-4zfr6nbvv') {
        console.log(`     ✅ FOUND THE MISSING ORDER!`);
        console.log(`     Categories: ${JSON.stringify(order.categories)}`);
        console.log(`     Items details:`);
        order.items.forEach((item, idx) => {
          const product = item.product;
          if (product) {
            const cat = product.category?.mainCategory || product.category;
            console.log(`       Item ${idx}: ${product.name} - Category: ${typeof cat === 'string' ? cat : JSON.stringify(cat)}`);
          } else {
            console.log(`       Item ${idx}: NO PRODUCT (product is null/undefined)`);
          }
        });
      }
      order.items.forEach((item, idx) => {
        const product = item.product;
        if (product) {
          const cat = product.category?.mainCategory || product.category;
          console.log(`       Item ${idx}: ${product.name} - Category: ${typeof cat === 'string' ? cat : JSON.stringify(cat)}`);
        }
      });
    });

    // Build category matches for item filtering (with normalization)
    const normalizeCategory = (cat) => {
      if (!cat || typeof cat !== 'string') return '';
      return cat.toLowerCase().trim()
        .replace(/\s*&\s*/g, ' and ')
        .replace(/\s+/g, ' ');
    };
    
    const categoryMatches = [];
    assignedCategories.forEach(assignedCat => {
      const catStr = typeof assignedCat === 'string' ? assignedCat : (assignedCat.category || assignedCat);
      categoryMatches.push(catStr);
      const mainCategory = catStr.split(' > ')[0].trim();
      if (mainCategory && !categoryMatches.includes(mainCategory)) {
        categoryMatches.push(mainCategory);
      }
    });
    
    // Normalize category matches for comparison
    const normalizedCategoryMatches = categoryMatches.map(cat => normalizeCategory(cat));
    
    // Filter orders to only include items from manager's categories
    // Also recalculate totals and update categories array
    // IMPORTANT: If order was found via OrderItemApproval, we should show it even if item filtering removes all items
    // because the approval system is the source of truth
    const filteredOrders = orders.map(order => {
      // Check if this order has approvals for this manager (source of truth)
      const hasApprovalsForThisOrder = approvalOrderIds.some(oid => 
        oid.toString() === order._id.toString()
      );

      // Also check if the order's high-level categories include any of the manager's categories
      // This helps when product.category doesn't perfectly match the manager category names
      const normalizedOrderCategories = (order.categories || []).map(cat => normalizeCategory(cat));
      const hasManagerCategoryInOrder = normalizedOrderCategories.some(orderCat => 
        normalizedCategoryMatches.some(managerCat => 
          orderCat === managerCat ||
          orderCat.includes(managerCat) ||
          managerCat.includes(orderCat)
        )
      );
      
      const filteredItems = order.items.filter(item => {
        if (!item.product) return false;
        
        const productCategory = item.product.category?.mainCategory || item.product.category;
        
        // Check if product category matches any of the manager's assigned categories
        // Use normalized comparison to handle "and" vs "&" variations
        const productCatStr = typeof productCategory === 'string' 
          ? productCategory 
          : (productCategory?.mainCategory || '');
        const normalizedProductCat = normalizeCategory(productCatStr);
        
        const matches = normalizedCategoryMatches.some(normalizedManagerCat => {
          // Exact match after normalization
          if (normalizedProductCat === normalizedManagerCat) return true;
          // Contains check (for partial matches)
          if (normalizedProductCat.includes(normalizedManagerCat) || 
              normalizedManagerCat.includes(normalizedProductCat)) return true;
          return false;
        });
        
        return matches;
      });

      // If order has approvals OR the order categories clearly include this manager's categories
      // but no items match after strict filtering, still show the order with all items.
      // This avoids edge cases where product.category naming differs from high-level categories.
      if (filteredItems.length === 0 && (hasApprovalsForThisOrder || hasManagerCategoryInOrder)) {
        console.log(`⚠️ Order ${order.orderNumber} has approvals or matching categories but no items match after filtering - showing all items anyway`);
        console.log(`   hasApprovalsForThisOrder: ${hasApprovalsForThisOrder}, hasManagerCategoryInOrder: ${hasManagerCategoryInOrder}`);
        console.log(`   Order has ${order.items.length} items total`);
        // Use all items since this order is clearly relevant for this manager
        const allItems = order.items.filter(item => item.product); // Just filter out items without products
        console.log(`   After filtering items with products: ${allItems.length} items`);
        if (allItems.length > 0) {
          // Recalculate with all items
          const filteredSubtotal = allItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
          const originalTaxRate = order.subtotal > 0 ? (order.tax / order.subtotal) : 0.05;
          const filteredTax = filteredSubtotal * originalTaxRate;
          const filteredTotal = filteredSubtotal + filteredTax;
          
          // Use order categories that match manager's categories (normalized)
          const matchingOrderCategories = (order.categories || []).filter(orderCat => {
            const normalizedOrderCat = normalizeCategory(orderCat);
            return normalizedCategoryMatches.some(managerCat => 
              normalizedOrderCat === managerCat ||
              normalizedOrderCat.includes(managerCat) ||
              managerCat.includes(normalizedOrderCat)
            );
          });
          
          console.log(`   Returning order with ${allItems.length} items and categories: ${matchingOrderCategories.join(', ')}`);
          
          return {
            ...order.toObject(),
            items: allItems,
            totalItems: allItems.length,
            subtotal: filteredSubtotal,
            tax: filteredTax,
            total: filteredTotal,
            totalDiscount: order.totalDiscount || 0,
            finalTotal: order.finalTotal || filteredTotal,
            categories: matchingOrderCategories.length > 0 ? matchingOrderCategories : (order.categories || []),
            originalItemCount: order.items.length,
            filteredItemCount: allItems.length,
            originalTotal: order.total,
            originalFinalTotal: order.finalTotal || order.total
          };
        } else {
          console.log(`   ⚠️ Order ${order.orderNumber} has no items with products - this shouldn't happen`);
        }
      }

      // Only include orders that have at least one item from manager's categories
      if (filteredItems.length === 0) {
        console.log(`⚠️ Filtering out order ${order.orderNumber} - no items match manager's categories`);
        return null;
      }

      // Recalculate totals based on filtered items only
      const filteredSubtotal = filteredItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      
      // Calculate tax rate from original order (if available) or use default 5%
      const originalTaxRate = order.subtotal > 0 ? (order.tax / order.subtotal) : 0.05;
      const filteredTax = filteredSubtotal * originalTaxRate;
      const filteredTotal = filteredSubtotal + filteredTax;
      
      // Recalculate discount proportionally based on filtered items
      // If original order had a discount, calculate the discount percentage and apply it to filtered total
      let filteredDiscount = 0;
      let filteredFinalTotal = filteredTotal;
      
      if (order.totalDiscount && order.totalDiscount > 0 && order.total > 0) {
        // Calculate discount as percentage of original total
        const discountPercentage = order.totalDiscount / order.total;
        // Apply same percentage to filtered total
        filteredDiscount = filteredTotal * discountPercentage;
        filteredFinalTotal = filteredTotal - filteredDiscount;
      } else if (order.finalTotal && order.finalTotal !== order.total) {
        // If finalTotal exists and differs from total, calculate the difference
        const originalDiscount = order.total - order.finalTotal;
        if (originalDiscount > 0 && order.total > 0) {
          const discountPercentage = originalDiscount / order.total;
          filteredDiscount = filteredTotal * discountPercentage;
          filteredFinalTotal = filteredTotal - filteredDiscount;
        }
      }
      
      console.log(`💰 Order ${order.orderNumber} totals:`, {
        original: {
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
          discount: order.totalDiscount || 0,
          finalTotal: order.finalTotal || order.total
        },
        filtered: {
          subtotal: filteredSubtotal,
          tax: filteredTax,
          total: filteredTotal,
          discount: filteredDiscount,
          finalTotal: filteredFinalTotal
        }
      });

      // Extract unique categories for this order that are relevant to the manager
      // 1) Prefer using the order.categories array (high-level categories shown in UI)
      const filteredCategories = new Set();
      (order.categories || []).forEach(catStr => {
        if (typeof catStr !== 'string') return;
        const normalizedOrderCat = normalizeCategory(catStr);
        const matches = normalizedCategoryMatches.some(managerCat => {
          return (
            normalizedOrderCat === managerCat ||
            normalizedOrderCat.includes(managerCat) ||
            managerCat.includes(normalizedOrderCat)
          );
        });
        if (matches) {
          filteredCategories.add(catStr);
        }
      });

      // 2) Fallback: if nothing found from order.categories, derive from filtered items
      if (filteredCategories.size === 0) {
        filteredItems.forEach(item => {
          if (item.product?.category) {
            const cat = item.product.category.mainCategory || item.product.category;
            if (cat) {
              const matchesManagerCategory = categoryMatches.some(categoryMatch => {
                if (typeof cat === 'string') {
                  return (
                    cat === categoryMatch ||
                    cat.includes(categoryMatch) ||
                    categoryMatch.includes(cat)
                  );
                }
                return false;
              });
              if (matchesManagerCategory) {
                filteredCategories.add(cat);
              }
            }
          }
        });
      }
      
      console.log(`📦 Order ${order.orderNumber}: ${order.items.length} items → ${filteredItems.length} filtered items`);
      console.log(`   Original categories: ${order.categories?.join(', ') || 'none'}`);
      console.log(`   Filtered categories: ${Array.from(filteredCategories).join(', ') || 'none'}`);

      return {
        ...order.toObject(),
        items: filteredItems,
        totalItems: filteredItems.length,
        subtotal: filteredSubtotal,
        tax: filteredTax,
        total: filteredTotal,
        totalDiscount: filteredDiscount > 0 ? filteredDiscount : (order.totalDiscount || 0),
        finalTotal: filteredFinalTotal,
        categories: Array.from(filteredCategories), // Only categories from manager's assigned items
        originalItemCount: order.items.length,
        filteredItemCount: filteredItems.length,
        originalTotal: order.total, // Keep original for reference
        originalFinalTotal: order.finalTotal || order.total // Keep original for reference
      };
    }).filter(order => order !== null && order.items.length > 0);
    
    console.log(`✅ Filtered ${orders.length} orders → ${filteredOrders.length} orders with manager's category items`);

    res.json({
      orders: filteredOrders,
      totalOrders: filteredOrders.length,
      assignedCategories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredOrders.length
      }
    });
  } catch (err) {
    console.error("Get manager orders error:", err);
    res.status(500).json({ message: "Error fetching manager orders", error: err.message });
  }
};

// Update order status for manager's categories
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params; // Get orderId from URL parameter
    const { status, comments, categoryStatuses, discountAmount } = req.body;
    const normalizedStatus = String(status || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    const userId = req.user.user_id;
    const companyId = req.user.company_id;
    
    console.log('🔄 Backend updateOrderStatus called:', { orderId, status, comments, userId, companyId });

    // Get manager's assigned categories
    const manager = await Manager.findOne({ user_id: userId, company_id: companyId });
    if (!manager) {
      console.log('❌ Manager not found:', { userId, companyId });
      return res.status(404).json({ message: "Manager profile not found" });
    }

    const assignedCategories = manager.getCategoryList();
    console.log('✅ Manager found, assigned categories:', assignedCategories);

    // Get order
    const order = await Order.findById(orderId).populate('items.product');
    if (!order) {
      console.log('❌ Order not found:', orderId);
      return res.status(404).json({ message: "Order not found" });
    }
    
    console.log('✅ Order found:', { orderId: order._id, status: order.status, items: order.items.length });
    
    // Debug: Log order items and their categories
    console.log('📋 Order items categories:', order.items.map(item => ({
      productName: item.product?.name,
      productCategory: item.product?.category?.mainCategory || item.product?.category,
      fullCategory: item.product?.category
    })));

    // Check if order has items from manager's categories
    const hasManagerCategories = order.items.some(item => {
      const productCategory = item.product?.category?.mainCategory || item.product?.category;
      console.log('🔍 Checking category match:', {
        productCategory,
        assignedCategories,
        match: assignedCategories.some(assignedCat => {
          // Check if the assigned category contains the product category or vice versa
          return assignedCat.includes(productCategory) || productCategory.includes(assignedCat) ||
                 assignedCat.includes(productCategory.split(' > ')[0]) || // Check main category
                 productCategory.includes(assignedCat.split(' > ')[0]); // Check main category
        })
      });
      
      return assignedCategories.some(assignedCat => {
        // Check if the assigned category contains the product category or vice versa
        return assignedCat.includes(productCategory) || productCategory.includes(assignedCat) ||
               assignedCat.includes(productCategory.split(' > ')[0]) || // Check main category
               productCategory.includes(assignedCat.split(' > ')[0]); // Check main category
      });
    });

    if (!hasManagerCategories) {
      return res.status(403).json({ message: "You don't have permission to update this order" });
    }

    // Logistics phase-1: only allow hold/dispatch states
    const logisticsStatusPermissions = {
      on_hold: "orders.hold",
      dispatched: "orders.dispatch",
    };

    if (!Object.prototype.hasOwnProperty.call(logisticsStatusPermissions, normalizedStatus)) {
      return res.status(400).json({
        message: "Invalid status. Only 'On Hold' and 'Dispatched' are allowed.",
      });
    }

    const requiredPermission = logisticsStatusPermissions[normalizedStatus];
    const userPermissions = (req.user?.permissions || [])
      .map((perm) => {
        if (typeof perm === "string") return perm;
        return perm?.key || null;
      })
      .filter(Boolean);

    const hasRequiredPermission =
      req.user?.isSuperAdmin === true || userPermissions.includes(requiredPermission);

    if (!hasRequiredPermission) {
      return res.status(403).json({
        message: `Permission denied. Missing required permission: ${requiredPermission}`,
      });
    }

    // Update order status
    if (normalizedStatus) {
      order.status = normalizedStatus;
    }

    // Update category-specific statuses
    if (categoryStatuses) {
      for (const [category, categoryStatus] of Object.entries(categoryStatuses)) {
        if (assignedCategories.includes(category)) {
          // Update approval status for this category
          const approvalIndex = order.approvals.findIndex(approval => approval.category === category);
          if (approvalIndex >= 0) {
            order.approvals[approvalIndex].status = categoryStatus;
            order.approvals[approvalIndex].approvedBy = req.user.id;
            order.approvals[approvalIndex].approvedAt = new Date();
            if (comments) {
              order.approvals[approvalIndex].comments = comments;
            }
          }
        }
      }
    }

    // Add manager comments
    if (comments) {
      order.notes = (order.notes || '') + `\n[Manager ${req.user.email}]: ${comments}`;
    }

    // Handle discount amount if provided
    if (discountAmount && discountAmount > 0) {
      order.totalDiscount = discountAmount;
      order.finalTotal = order.total - discountAmount;
      
      // Add discount info to notes
      const discountNote = `\n[Manager ${req.user.email}]: Discount applied: PKR ${discountAmount}`;
      order.notes = (order.notes || '') + discountNote;
      
      console.log('💰 Discount applied:', {
        orderId: order._id,
        originalTotal: order.total,
        discountAmount: discountAmount,
        finalTotal: order.finalTotal
      });
    }

    await order.save();

    // Update manager performance
    manager.performance.totalOrdersManaged += 1;
    manager.performance.lastActiveAt = new Date();
    await manager.save();

    // Send notification to admin about status change
    try {
      await notificationService.createNotification({
        title: "Order Status Updated",
        message: `Manager ${req.user.email} updated status for order #${order.orderNumber}`,
        type: "order",
        priority: "medium",
        targetType: "company",
        targetIds: [companyId],
        company_id: companyId,
        sender_id: userId,
        sender_name: req.user.email,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: normalizedStatus,
          categoryStatuses: categoryStatuses,
          manager: req.user.email
        },
        channels: [
          { type: "in_app", enabled: true },
          { type: "web_push", enabled: true }
        ]
      });
    } catch (notificationError) {
      console.error("Notification error:", notificationError);
    }

    console.log('✅ Order status updated successfully:', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      newStatus: order.status,
      updatedAt: order.updatedAt
    });

    res.json({
      message: "Order status updated successfully",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        approvals: order.approvals,
        updatedAt: order.updatedAt
      }
    });
  } catch (err) {
    console.error("Update order status error:", err);
    res.status(500).json({ message: "Error updating order status", error: err.message });
  }
};

// Get manager's category-specific products
exports.getManagerProducts = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const companyId = req.user.company_id;
    const { category, search, page = 1, limit = 10 } = req.query;

    // Get manager's assigned categories
    const manager = await Manager.findOne({ user_id: userId, company_id: companyId });
    if (!manager) {
      return res.status(404).json({ message: "Manager profile not found" });
    }

    const assignedCategories = manager.getCategoryList();

    // Build query - only show real, valid products
    const query = {
      company_id: companyId,
      isActive: true,
      name: { $exists: true, $ne: null, $ne: "" }, // Must have a valid name
      price: { $gt: 0 }, // Price must be greater than 0 (real products have prices)
      $or: [
        { "category.mainCategory": { $in: assignedCategories } },
        { "category": { $in: assignedCategories } }
      ]
    };
    
    // Ensure category exists and is valid
    query.$and = [
      {
        $or: [
          { "category.mainCategory": { $exists: true, $ne: null, $ne: "" } },
          { "category": { $exists: true, $ne: null, $ne: "" } }
        ]
      }
    ];

    if (category) {
      query.$or = [
        { "category.mainCategory": category },
        { "category": category }
      ];
    }

    if (search) {
      // Add search conditions to existing $and array
      query.$and.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const products = await Product.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Additional client-side filtering to ensure only real products from catalog
    const validProducts = products.filter(product => {
      // Must have a valid name (not empty, not just whitespace, minimum length)
      if (!product.name || product.name.trim().length < 3) return false;
      
      // Must have a valid price (greater than 0, reasonable maximum)
      if (!product.price || product.price <= 0 || product.price > 10000000) return false;
      
      // Must have a valid category (mainCategory must exist and be non-empty)
      const mainCategory = product.category?.mainCategory || (typeof product.category === 'string' ? product.category : null);
      if (!mainCategory || (typeof mainCategory === 'string' && mainCategory.trim().length === 0)) return false;
      
      // Must have valid company_id
      if (!product.company_id || product.company_id.trim().length === 0) return false;
      
      // Exclude test/dummy products (common patterns in name)
      const nameLower = product.name.toLowerCase();
      const testPatterns = ['test', 'dummy', 'sample', 'placeholder', 'example', 'temp', 'temporary'];
      if (testPatterns.some(pattern => nameLower.includes(pattern) && nameLower.length < 20)) return false;
      
      // Ensure product has proper structure (from catalog)
      // Real products should have either SKU or unit or both
      if (!product.sku && !product.unit) {
        // Allow if it's a valid product name format (contains numbers or common product indicators)
        const hasProductIndicators = /\d|kg|litre|liter|ml|g|piece|pcs|pack|box/i.test(product.name);
        if (!hasProductIndicators) return false;
      }
      
      // Ensure price is a valid number (not NaN, not Infinity)
      if (isNaN(product.price) || !isFinite(product.price)) return false;
      
      return true;
    });

    console.log(`📦 Filtered products: ${products.length} → ${validProducts.length} (removed ${products.length - validProducts.length} invalid/test products)`);
    console.log(`📋 Valid products by category:`, validProducts.reduce((acc, p) => {
      const cat = p.category?.mainCategory || 'Unknown';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {}));

    // Format products for response - ensure all required fields are present
    const formattedProducts = validProducts.map(product => ({
      _id: product._id,
      name: product.name,
      description: product.description || product.name,
      category: product.category || { mainCategory: 'Uncategorized' },
      price: Number(product.price) || 0, // Ensure price is a number
      stock: Number(product.stock) || 0,
      minStock: Number(product.minStock) || 0,
      sku: product.sku || '',
      unit: product.unit || '',
      isActive: product.isActive !== false, // Default to true if not set
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    res.json({
      products: formattedProducts,
      totalProducts: formattedProducts.length,
      assignedCategories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: formattedProducts.length
      }
    });
  } catch (err) {
    console.error("Get manager products error:", err);
    res.status(500).json({ message: "Error fetching manager products", error: err.message });
  }
};

// Get manager's category-specific reports
exports.getManagerReports = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const companyId = req.user.company_id;
    const { period = '30d', category } = req.query;

    // Get manager's assigned categories
    const manager = await Manager.findOne({ user_id: userId, company_id: companyId });
    if (!manager) {
      return res.status(404).json({ message: "Manager profile not found" });
    }

    const assignedCategories = manager.getCategoryList();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get orders for manager's categories
    const ordersQuery = {
      company_id: companyId,
      createdAt: { $gte: startDate, $lte: endDate },
      categories: { $in: assignedCategories }
    };

    if (category) {
      ordersQuery.categories = category;
    }

    const orders = await Order.find(ordersQuery)
      .populate('customer', 'companyName contactName')
      .populate('items.product', 'name category price');

    // Calculate statistics
    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
      averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0,
      ordersByStatus: {},
      ordersByCategory: {},
      topCustomers: {},
      monthlyTrend: []
    };

    // Process orders for statistics
    orders.forEach(order => {
      // Orders by status
      stats.ordersByStatus[order.status] = (stats.ordersByStatus[order.status] || 0) + 1;
      
      // Orders by category
      order.categories.forEach(cat => {
        if (assignedCategories.includes(cat)) {
          stats.ordersByCategory[cat] = (stats.ordersByCategory[cat] || 0) + 1;
        }
      });

      // Top customers
      const customerName = order.customer?.companyName || 'Unknown';
      stats.topCustomers[customerName] = (stats.topCustomers[customerName] || 0) + 1;
    });

    // Get monthly trend
    const monthlyData = {};
    orders.forEach(order => {
      const month = order.createdAt.toISOString().substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { orders: 0, revenue: 0 };
      }
      monthlyData[month].orders += 1;
      monthlyData[month].revenue += order.total;
    });

    stats.monthlyTrend = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      orders: data.orders,
      revenue: data.revenue
    }));

    res.json({
      reports: stats,
      assignedCategories,
      period,
      generatedAt: new Date()
    });
  } catch (err) {
    console.error("Get manager reports error:", err);
    res.status(500).json({ message: "Error fetching manager reports", error: err.message });
  }
};

// Get all managers (for admin)
exports.getAllManagers = async (req, res) => {
  try {
    const companyId = req.user?.company_id || req.headers['x-company-id'] || "RESSICHEM";

    // Get managers from Manager collection
    // Include all managers, not just isActive: true, to catch all managers
    const managerRecords = await Manager.find({ 
      company_id: companyId,
      isActive: { $ne: false } // Include active and undefined (defaults to true)
    })
      .populate('assignedCategories.assignedBy', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    // Get managers from User collection (embedded managerProfile)
    // Include all users with isManager: true, even if they don't have assignedCategories yet
    // Also include users with userType === 'manager' or role === 'Manager' to catch newly created managers
    // Also check if they have a Manager record (more inclusive)
    // EXCLUDE customers - multiple checks to ensure customers don't appear as managers
    const userManagers = await User.find({ 
      company_id: companyId, 
      $or: [
        { isManager: true },
        { userType: 'manager' },
        { role: 'Manager' },
        { 'managerProfile.manager_id': { $exists: true, $ne: null } } // Has managerProfile with actual manager_id (not null)
      ],
      isActive: { $ne: false }, // Include active users and users where isActive is not set (defaults to true)
      isCustomer: { $ne: true }, // Exclude customers - they should not appear as managers
      'customerProfile.customer_id': { $exists: false }, // Exclude users with customerProfile (they are customers)
      user_id: { $not: { $regex: /^customer_/ } } // Exclude users with user_id starting with "customer_" (definitive customer identifier)
    }).select('user_id email firstName lastName managerProfile isActive createdAt userType role isManager isCustomer customerProfile');
    
    console.log(`🔍 Found ${userManagers.length} users with manager role`);
    userManagers.forEach(user => {
      console.log(`  - ${user.email} (${user.user_id}): isManager=${user.isManager}, userType=${user.userType}, role=${user.role}, isActive=${user.isActive}, has managerProfile: ${!!user.managerProfile}`);
    });

    // Combine both sources
    const allManagers = [];

    // Add Manager records
    for (const manager of managerRecords) {
      // Skip Manager records for customers
      // Check 1: user_id starts with "customer_"
      if (manager.user_id && manager.user_id.startsWith('customer_')) {
        console.log(`  ⏭️ Skipping Manager ${manager._id} - user_id starts with "customer_"`);
        continue;
      }

      // Get user details for this manager
      const user = await User.findOne({ user_id: manager.user_id, company_id: companyId })
        .select('firstName lastName email isCustomer customerProfile');
      
      // Check 2: User is a customer
      if (user && (user.isCustomer === true || user.customerProfile?.customer_id)) {
        console.log(`  ⏭️ Skipping Manager ${manager._id} - user ${user.email} is a customer`);
        continue;
      }
      
      allManagers.push({
        _id: manager._id,
        user_id: manager.user_id,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        fullName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
        assignedCategories: manager.assignedCategories.map(cat => cat.category),
        managerLevel: manager.managerLevel,
        performance: manager.performance || {
          totalOrdersManaged: 0,
          totalProductsManaged: 0,
          averageResponseTime: 0,
          lastActiveAt: new Date()
        },
        isActive: manager.isActive,
        createdAt: manager.createdAt,
        source: 'Manager'
      });
    }

    // Add User manager profiles (include all managers, even without assignedCategories)
    userManagers.forEach(user => {
      // Safety check 1: Skip if user_id starts with "customer_" (definitive customer identifier)
      if (user.user_id && user.user_id.startsWith('customer_')) {
        console.log(`  ⏭️ Skipping ${user.email} - user_id starts with "customer_" (safety check)`);
        return;
      }
      
      // Safety check 2: Skip customers even if they somehow passed the query
      if (user.isCustomer === true || user.customerProfile) {
        console.log(`  ⏭️ Skipping ${user.email} - is a customer (safety check)`);
        return;
      }
      
      // Safety check 3: Skip if role is "customer"
      if (user.role && user.role.toLowerCase() === 'customer') {
        console.log(`  ⏭️ Skipping ${user.email} - role is "customer" (safety check)`);
        return;
      }
      
      // Check if this user is already in allManagers (from Manager collection)
      const alreadyAdded = allManagers.some(m => m.user_id === user.user_id);
      
      if (!alreadyAdded) {
        // Get assignedCategories - handle both string arrays and object arrays
        let assignedCategories = [];
        if (user.managerProfile && Array.isArray(user.managerProfile.assignedCategories)) {
          assignedCategories = user.managerProfile.assignedCategories.map(cat => 
            typeof cat === 'string' ? cat : (cat.category || cat)
          );
        }
        
        const managerData = {
          _id: user.managerProfile?.manager_id || user._id.toString(),
          user_id: user.user_id,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          assignedCategories: assignedCategories,
          managerLevel: user.managerProfile?.managerLevel || 'junior',
          performance: user.managerProfile?.performance || {
            totalOrdersManaged: 0,
            totalProductsManaged: 0,
            averageResponseTime: 0,
            lastActiveAt: new Date()
          },
          isActive: user.isActive !== false, // Default to true if not set
          createdAt: user.createdAt || new Date(),
          source: 'User'
        };
        
        console.log(`  ✅ Adding manager from User collection: ${user.email} (${user.user_id})`, {
          hasManagerProfile: !!user.managerProfile,
          managerProfileType: typeof user.managerProfile,
          assignedCategoriesCount: assignedCategories.length,
          managerData: managerData
        });
        
        allManagers.push(managerData);
      } else {
        console.log(`  ⏭️ Skipping ${user.email} - already in Manager collection`);
      }
    });

    // Remove duplicates (in case user exists in both collections)
    const uniqueManagers = allManagers.filter((manager, index, self) => 
      index === self.findIndex(m => m.user_id === manager.user_id)
    );

    res.json({
      managers: uniqueManagers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
  } catch (err) {
    console.error("Get all managers error:", err);
    res.status(500).json({ message: "Error fetching managers", error: err.message });
  }
};

// Assign categories to manager (admin only)
exports.assignCategories = async (req, res) => {
  try {
    const { managerId, categories } = req.body;
    const companyId = req.user?.company_id || req.headers['x-company-id'] || "RESSICHEM";

    const manager = await Manager.findById(managerId);
    if (!manager) {
      return res.status(404).json({ message: "Manager not found" });
    }

    // Get the user's MongoDB ObjectId for assignedBy
    // req.user._id is the MongoDB ObjectId from the JWT token
    let assignedByUserId = req.user._id;
    
    if (!assignedByUserId) {
      // Fallback: try to find user by user_id if _id is not available
      const User = require('../models/User');
      const currentUser = await User.findOne({ 
        user_id: req.user.user_id, 
        company_id: companyId 
      }).select('_id');
      
      if (!currentUser) {
        return res.status(400).json({ message: "Unable to identify current user" });
      }
      
      assignedByUserId = currentUser._id;
    }

    // Update assigned categories
    manager.assignedCategories = categories.map(category => ({
      category,
      assignedBy: assignedByUserId,
      assignedAt: new Date(),
      isActive: true
    }));

    await manager.save();

    // Update category assignments
    await CategoryAssignment.deleteMany({ manager_id: managerId });
    
    for (const category of categories) {
      await CategoryAssignment.create({
        manager_id: managerId,
        user_id: manager.user_id,
        company_id: companyId,
        category,
        assignedBy: assignedByUserId,
        isActive: true,
        isPrimary: true
      });
    }

    // Sync to User.managerProfile (auto-sync via post-save hook, but ensure it happens)
    await managerSyncService.ensureSync(manager._id, companyId);

    res.json({
      message: "Categories assigned successfully",
      manager: {
        _id: manager._id,
        user_id: manager.user_id,
        assignedCategories: manager.assignedCategories
      }
    });
  } catch (err) {
    console.error("Assign categories error:", err);
    res.status(500).json({ message: "Error assigning categories", error: err.message });
  }
};

// Create new manager
exports.createManager = async (req, res) => {
  try {
    const { user_id, assignedCategories, managerLevel, notificationPreferences } = req.body;
    const companyId = req.user.company_id;

    // Check if user exists
    const user = await User.findOne({ user_id, company_id: companyId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate: Customers cannot be assigned as managers
    if (user.isCustomer || user.customerProfile?.customer_id) {
      return res.status(400).json({ 
        message: "Cannot assign manager role: This user is a customer. Customers cannot be managers." 
      });
    }

    // Check if manager already exists
    const existingManager = await Manager.findOne({ user_id, company_id: companyId });
    if (existingManager) {
      return res.status(400).json({ message: "Manager already exists for this user" });
    }

    // Create new manager
    const manager = new Manager({
      user_id,
      company_id: companyId,
      assignedCategories: assignedCategories.map(category => ({
        category,
        assignedBy: req.user._id, // Use ObjectId instead of user_id string
        assignedAt: new Date(),
        isActive: true
      })),
      managerLevel: managerLevel || 'junior',
      notificationPreferences: notificationPreferences || {
        orderUpdates: true,
        stockAlerts: true,
        statusChanges: true,
        newOrders: true,
        lowStock: true,
        categoryReports: true
      },
      isActive: true,
      createdBy: req.user._id // Use ObjectId instead of user_id string
    });

    await manager.save();

    // Update user's manager profile
    user.isManager = true;
    user.managerProfile = {
      manager_id: manager._id,
      assignedCategories,
      managerLevel: managerLevel || 'junior',
      notificationPreferences: notificationPreferences || {
        orderUpdates: true,
        stockAlerts: true,
        statusChanges: true,
        newOrders: true,
        lowStock: true,
        categoryReports: true
      }
    };
    await user.save();

    // Ensure sync (auto-sync via post-save hook, but ensure it happens)
    await managerSyncService.ensureSync(manager._id, companyId);

    // Create category assignments
    for (const category of assignedCategories) {
      const assignment = new CategoryAssignment({
        manager_id: manager._id,
        user_id: user_id,
        company_id: companyId,
        category,
        assignedBy: req.user._id,
        isActive: true,
        isPrimary: true,
        permissions: {
          canUpdateStatus: true,
          canAddComments: true,
          canViewReports: true,
          canManageProducts: true
        }
      });
      await assignment.save();
    }

    res.status(201).json({
      message: "Manager created successfully",
      manager: {
        _id: manager._id,
        user_id: manager.user_id,
        assignedCategories: manager.assignedCategories,
        managerLevel: manager.managerLevel,
        isActive: manager.isActive
      }
    });
  } catch (err) {
    console.error("Create manager error:", err);
    res.status(500).json({ message: "Error creating manager", error: err.message });
  }
};

// Update manager
exports.updateManager = async (req, res) => {
  try {
    const { id } = req.params;
    const { managerLevel, isActive, notificationPreferences } = req.body;
    const companyId = req.user.company_id;

    const manager = await Manager.findOne({ _id: id, company_id: companyId });
    if (!manager) {
      return res.status(404).json({ message: "Manager not found" });
    }

    // Update manager fields
    if (managerLevel) manager.managerLevel = managerLevel;
    if (isActive !== undefined) manager.isActive = isActive;
    if (notificationPreferences) {
      manager.notificationPreferences = { ...manager.notificationPreferences, ...notificationPreferences };
    }
    manager.updatedBy = req.user._id;

    await manager.save();

    // Sync to User.managerProfile (auto-sync via post-save hook, but ensure it happens)
    await managerSyncService.ensureSync(manager._id, companyId);

    res.json({
      message: "Manager updated successfully",
      manager: {
        _id: manager._id,
        user_id: manager.user_id,
        assignedCategories: manager.assignedCategories,
        managerLevel: manager.managerLevel,
        isActive: manager.isActive
      }
    });
  } catch (err) {
    console.error("Update manager error:", err);
    res.status(500).json({ message: "Error updating manager", error: err.message });
  }
};

// Delete manager
exports.deleteManager = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const manager = await Manager.findOne({ _id: id, company_id: companyId });
    if (!manager) {
      return res.status(404).json({ message: "Manager not found" });
    }

    // Update user's manager status
    const user = await User.findOne({ user_id: manager.user_id, company_id: companyId });
    if (user) {
      user.isManager = false;
      user.managerProfile = null;
      await user.save();
    }

    // Deactivate category assignments
    await CategoryAssignment.updateMany(
      { manager_id: manager._id },
      { isActive: false }
    );

    // Delete manager record
    await Manager.findByIdAndDelete(id);

    res.json({ message: "Manager deleted successfully" });
  } catch (err) {
    console.error("Delete manager error:", err);
    res.status(500).json({ message: "Error deleting manager", error: err.message });
  }
};

// Get users for manager creation
exports.getUsers = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { search, page = 1, limit = 50 } = req.query;

    // Build query - Show all users for manager creation
    const query = { 
      company_id: companyId
      // Removed isManager filter to show all users
    };
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    // Get users
    const users = await User.find(query)
      .select('user_id email firstName lastName department isManager managerProfile')
      .sort({ firstName: 1, lastName: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments(query);

    res.json({
      users,
      totalUsers,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalUsers / limit)
    });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Error fetching users", error: err.message });
  }
};
