"use client";

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/components/Auth/user-context";
import { getAuthHeaders, handleAuthError } from "@/lib/auth";

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    _id: string;
    companyName: string;
    contactName: string;
    email: string;
  };
  status: string;
  total: number;
  totalDiscount?: number;
  finalTotal?: number;
  subtotal: number;
  tax: number;
  orderDate: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  notes?: string;
  approvalStatus?: string;
  categories?: string[];
}

interface OrderItem {
  _id?: string;
  product: {
    _id: string;
    name: string;
    price: number;
    category?: any;
  };
  quantity: number;
  unitPrice: number;
  total: number;
}

function OrdersPageContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Partial<Order>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  
  // Discount modal states
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountOrder, setDiscountOrder] = useState<Order | null>(null);
  const [discountValue, setDiscountValue] = useState("");
  const [discountComments, setDiscountComments] = useState("");
  
  // Highlight functionality
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  
  // Invoice functionality
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [orderInvoices, setOrderInvoices] = useState<{[key: string]: any[]}>({});
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading, hasPermission } = useUser();

  // Fetch invoices for orders
  const fetchInvoicesForOrders = async (orderNumbers: string[]) => {
    try {
      const invoices: {[key: string]: any[]} = {};
      
      for (const orderNumber of orderNumbers) {
        const response = await fetch(`/api/invoices/order/${orderNumber}`, {
          headers: getAuthHeaders(),
        });
        
        if (response.ok) {
          const data = await response.json();
          invoices[orderNumber] = data.data || [];
        }
      }
      
      setOrderInvoices(invoices);
    } catch (error) {
      console.error('Error fetching invoices for orders:', error);
    }
  };

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching orders...');
      console.log('   User authenticated:', !!user);
      console.log('   User loading:', userLoading);
      console.log('   Is customer:', user?.isCustomer);
      
      // Choose endpoint based on user type
      let apiEndpoint: string;

      if (user?.isCustomer) {
        // Customers: fetch their own orders with a high limit
        apiEndpoint = '/api/customers/orders?limit=1000&page=1';
      } else if (user?.isManager && !user?.isCompanyAdmin && !user?.isSuperAdmin) {
        // Managers: fetch only orders for their assigned categories
        apiEndpoint = '/api/managers/orders?limit=1000&page=1';
      } else {
        // Admin / staff: company-wide orders
        apiEndpoint = '/api/orders';
      }
      console.log('   Using API endpoint:', apiEndpoint);
      
      const response = await fetch(apiEndpoint, {
        headers: getAuthHeaders(),
      });
      
      console.log('   Response status:', response.status);
      console.log('   Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and paginated response
        const ordersData = Array.isArray(data) ? data : (data.orders || data.data || []);
        console.log('   Orders fetched:', ordersData.length);
        console.log('   Sample orders:', ordersData.slice(0, 2).map((o: Order) => o.orderNumber));
        setOrders(ordersData);
        
        // Fetch invoices for all orders
        const orderNumbers = ordersData.map((order: Order) => order.orderNumber);
        await fetchInvoicesForOrders(orderNumbers);
      } else {
        if (handleAuthError(response.status, "Please log in to view orders")) {
          return;
        }
        console.error('Failed to fetch orders:', response.status, response.statusText);
        const errorData = await response.text();
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for user context to load
    if (userLoading) {
      return;
    }
    
    // Check if user is authenticated
    if (!user) {
      console.error("Please log in to access orders");
      router.push("/auth/sign-in");
      return;
    }
    
    fetchOrders();
  }, [user, userLoading, router]);

  // Handle highlight parameter from URL
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId) {
      setHighlightedOrderId(highlightId);
      // Scroll to the highlighted order after a short delay to ensure orders are loaded
      setTimeout(() => {
        const element = document.getElementById(`order-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Remove highlight after 5 seconds
          setTimeout(() => {
            setHighlightedOrderId(null);
            // Clean up URL parameter
            const url = new URL(window.location.href);
            url.searchParams.delete('highlight');
            window.history.replaceState({}, '', url.toString());
          }, 5000);
        }
      }, 1000);
    }
  }, [searchParams]);

  // Refresh orders when component becomes visible (e.g., when navigating back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchOrders();
      }
    };

    const handleFocus = () => {
      fetchOrders();
    };

    // Listen for page visibility changes and focus events
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = (order.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.customer?.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.customer?.contactName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    
    // Manager category filtering - backend should already filter, but add client-side safety check
    // Note: Backend filters orders by manager's assigned categories, so this is just a safety check
    let matchesManagerCategories = true;
    if (user?.isManager) {
      // Backend should have already filtered orders, but we can do a safety check
      // Only filter if we have categories and the order doesn't match
      const managerCategories = user?.managerProfile?.assignedCategories || [];
      
      // If manager has assigned categories, verify the order matches (safety check)
      if (managerCategories.length > 0) {
        // Normalize category names to handle "&" vs "and" variations (same as backend)
        const normalizeCategory = (cat: string): string => {
          if (!cat || typeof cat !== 'string') return '';
          return cat.toLowerCase().trim()
            .replace(/\s*&\s*/g, ' and ')
            .replace(/\s+/g, ' ');
        };
        
        const normalizedManagerCategories = managerCategories.map(cat => normalizeCategory(cat));
        
        // Check if order has categories matching manager's assigned categories (normalized)
        const orderHasMatchingCategories = order.categories && order.categories.some(orderCat => {
          const normalizedOrderCat = normalizeCategory(orderCat);
          return normalizedManagerCategories.some(normalizedManagerCat =>
            normalizedOrderCat === normalizedManagerCat ||
            normalizedOrderCat.includes(normalizedManagerCat) ||
            normalizedManagerCat.includes(normalizedOrderCat)
          );
        });
        
        // Check if any product in the order matches manager's categories (normalized)
        const orderHasMatchingProducts = order.items && order.items.some(item => {
          if (item.product?.category) {
            const productCategory = item.product.category;
            const productCatStr = typeof productCategory === 'string' 
              ? productCategory 
              : (productCategory?.mainCategory || '');
            if (!productCatStr) return false;
            
            const normalizedProductCat = normalizeCategory(productCatStr);
            return normalizedManagerCategories.some(normalizedManagerCat =>
              normalizedProductCat === normalizedManagerCat ||
              normalizedProductCat.includes(normalizedManagerCat) ||
              normalizedManagerCat.includes(normalizedProductCat)
            );
          }
          return false;
        });
        
        matchesManagerCategories = orderHasMatchingCategories || orderHasMatchingProducts;
      }
      // If manager has no assigned categories in frontend, trust backend filtering (backend will handle it)
    }
    
    return matchesSearch && matchesStatus && matchesManagerCategories;
  });

  // Handle delete order
  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Are you sure you want to delete order ${orderNumber}?`)) return;
    
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        setMessage("✅ Order deleted successfully!");
        await fetchOrders();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("❌ Failed to delete order");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      setMessage("❌ Error deleting order");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Handle view order
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  // Handle edit order
  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setEditingOrder({
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      notes: order.notes || '',
      total: order.total,
      subtotal: order.subtotal,
      tax: order.tax
    });
    setShowEditModal(true);
  };

  // Handle update order
  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmitting(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/orders/${selectedOrder._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(editingOrder),
      });

      if (response.ok) {
        setMessage("✅ Order updated successfully!");
        setShowEditModal(false);
        setSelectedOrder(null);
        setEditingOrder({});
        await fetchOrders();
        setTimeout(() => setMessage(""), 3000);
      } else {
        const errorData = await response.text();
        setMessage(`❌ Failed to update order: ${errorData}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      setMessage("❌ Error updating order");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setMessage(`✅ Order status updated to ${newStatus}!`);
        await fetchOrders();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(`❌ Failed to update status to ${newStatus}`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage("❌ Error updating status");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'on_hold': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'active': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'processing': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'allocated': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
      case 'dispatched': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Open discount modal
  const openDiscountModal = (order: Order) => {
    setDiscountOrder(order);
    setDiscountValue("");
    setDiscountComments("");
    setShowDiscountModal(true);
  };

  // Handle discount application
  const handleDiscountApplication = async () => {
    if (!discountOrder || !discountValue) return;

    try {
      const response = await fetch(`/api/orders/${discountOrder._id}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: discountOrder.status === 'dispatched' ? 'dispatched' : 'on_hold',
          comments: discountComments || `Discount applied: PKR ${discountValue}`,
          discountAmount: parseFloat(discountValue)
        }),
      });

      if (response.ok) {
        setMessage(`✅ Discount of PKR ${discountValue} applied to order ${discountOrder.orderNumber}`);
        fetchOrders(); // Refresh orders
        setShowDiscountModal(false);
        setDiscountOrder(null);
        setDiscountValue("");
        setDiscountComments("");
      } else {
        const errorData = await response.json();
        setMessage(`❌ Error applying discount: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error applying discount:', error);
      setMessage(`❌ Error applying discount: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle invoice creation
  const handleCreateInvoice = async (order: Order) => {
    try {
      setInvoiceLoading(true);
      setInvoiceOrder(order);
      setShowInvoiceModal(true);
      setMessage("📄 Preparing invoice for order...");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error('Error preparing invoice:', error);
      setMessage("❌ Error preparing invoice");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setInvoiceLoading(false);
    }
  };

  // Create invoice API call
  const handleInvoiceCreate = async () => {
    if (!invoiceOrder) return;

    try {
      setInvoiceLoading(true);
      
      const response = await fetch('/api/invoices/create-from-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          orderId: invoiceOrder._id
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ Invoice created successfully: ${result.invoiceNumber}`);
        setShowInvoiceModal(false);
        setInvoiceOrder(null);
        setTimeout(() => setMessage(""), 5000);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to create invoice: ${errorData.message || 'Unknown error'}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      setMessage(`❌ Error creating invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setInvoiceLoading(false);
    }
  };

  return (
    <ProtectedRoute 
      requiredPermission="orders.read"
    >
      <div className="w-full min-w-0 max-w-full overflow-x-hidden relative">
        <Breadcrumb pageName="Orders" />
        
        {/* Manager Category Info */}
        {user?.isManager && user?.managerProfile?.assignedCategories && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Manager View: Showing orders for your assigned categories
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  Categories: {user.managerProfile.assignedCategories.join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Header Section */}
        <div className="mb-3 sm:mb-4 lg:mb-6">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-900 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-white">
                    {user?.isCustomer ? 'My Orders' : 'Order Management'}
                  </h1>
                  <p className="text-blue-700 dark:text-blue-300 text-sm sm:text-base mt-1">
                    {user?.isCustomer 
                      ? 'View and track your order history and status' 
                      : 'Manage customer orders and track their status'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    console.log('🔄 Manual refresh triggered');
                    fetchOrders();
                  }}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-center font-medium text-gray-700 hover:border-blue-900 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-blue-400 disabled:opacity-50 transition-all duration-300 hover:shadow-lg text-sm"
                >
                  <svg className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Orders
                </button>
                {/* Create New Order - Only for non-customers */}
      <PermissionGate permission="orders.create">
        <button
          onClick={() => router.push('/orders/create')}
          className="inline-flex items-center justify-center rounded-lg bg-blue-900 px-4 py-2.5 text-center font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/50 transition-all duration-300 hover:shadow-lg text-sm"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {user?.isCustomer ? 'Create Order' : 'Create New Order'}
        </button>
      </PermissionGate>
              </div>
            </div>
          </div>
        </div>
            
        {/* Stats Cards */}
        <div className="mb-4 sm:mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 dark:border-gray-700/20 p-4 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {filteredOrders.length}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {user?.isManager ? 'Your category orders' : 'All orders'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 dark:border-gray-700/20 p-4 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Pending</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {filteredOrders.filter(o => o.status === 'pending').length}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Awaiting processing</p>
                </div>
                <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 dark:border-gray-700/20 p-4 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Approved</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {filteredOrders.filter(o => o.status === 'approved').length}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Approved orders</p>
                </div>
                <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 dark:border-gray-700/20 p-4 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Completed</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {filteredOrders.filter(o => o.status === 'completed').length}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Successfully delivered</p>
                </div>
                <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-4 sm:mb-6">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 dark:border-gray-700/20 p-4">
            <div className="flex flex-col gap-3">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search orders by number, customer name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pl-10 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-sm"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="w-full sm:w-48">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-8 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 appearance-none transition-all duration-300 text-sm"
                  >
                    <option value="">All Status</option>
                    <option value="on_hold">On Hold</option>
                    <option value="dispatched">Dispatched</option>
                  </select>
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
            
        {/* Orders List */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="text-lg font-bold text-blue-900 dark:text-white">Orders</h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Loading orders...</p>
              </div>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order) => (
                <div 
                  key={order._id} 
                  id={`order-${order._id}`}
                  className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 dark:border-gray-700/20 p-4 hover:shadow-xl transition-all duration-300 ${
                    highlightedOrderId === order._id 
                      ? 'ring-4 ring-yellow-400 ring-opacity-75 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-600 animate-pulse' 
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-blue-900 dark:text-white text-sm truncate">
                          {order.orderNumber}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {order.customer?.companyName || 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center flex-shrink-0 gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        order.status === 'on_hold'
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                          : order.status === 'pending'
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : order.status === 'approved'
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : order.status === 'rejected'
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : order.status === 'confirmed'
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : order.status === 'processing'
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                          : order.status === 'allocated'
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                          : order.status === 'dispatched'
                          ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
                          : order.status === 'shipped'
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                          : order.status === 'completed'
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                      }`}>
                        {order.status}
                      </span>
                      
         {/* Invoice and Payment indicators for customers */}
         {user?.isCustomer && orderInvoices[order.orderNumber] && orderInvoices[order.orderNumber].length > 0 && (
                        <>
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            📄 Invoice
                          </span>
                          {(() => {
                            const invoice = orderInvoices[order.orderNumber][0];
                            const paymentStatus = invoice.paymentStatus;
                            const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && paymentStatus !== 'paid';
                            
                            if (paymentStatus === 'paid') {
                              return (
                                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  ✅ Paid
                                </span>
                              );
                            } else if (isOverdue) {
                              return (
                                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  ⚠️ Overdue
                                </span>
                              );
                            } else if (paymentStatus === 'partial') {
                              return (
                                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                  💰 Partial
                                </span>
                              );
                            } else {
                              return (
                                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                  💳 Unpaid
                                </span>
                              );
                            }
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {order.customer?.contactName || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {order.finalTotal ? (
                          <div className="space-y-1">
                            <div className="text-sm text-gray-500 line-through">PKR {(order.total || 0).toLocaleString()}</div>
                            <div className="font-medium text-green-600 dark:text-green-400">PKR {(order.finalTotal || 0).toLocaleString()}</div>
                            {order.totalDiscount && order.totalDiscount > 0 && (
                              <div className="text-xs text-orange-600 dark:text-orange-400">
                                -PKR {(order.totalDiscount || 0).toLocaleString()} discount
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="font-medium text-blue-900 dark:text-white">PKR {(order.total || 0).toLocaleString()}</span>
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    {/* Status Change - Only for non-customers */}
                    {!user?.isCustomer && (
                      <div className="flex justify-center">
                        {(hasPermission("orders.update") || hasPermission("orders.hold") || hasPermission("orders.dispatch")) && (
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order._id, e.target.value)}
                            className="text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="on_hold">On Hold</option>
                            <option value="dispatched">Dispatched</option>
                          </select>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-center gap-2">
                      {/* View Order - Available for everyone */}
                      <PermissionGate permission="orders.read">
                        <button 
                          onClick={() => handleViewOrder(order)}
                          className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          title="View Order"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </PermissionGate>
                      
                      {/* Invoice View and Payment - Available for customers when invoice exists */}
                      {user?.isCustomer && orderInvoices[order.orderNumber] && orderInvoices[order.orderNumber].length > 0 && (
                        <>
                          <button 
                            onClick={() => {
                              const invoice = orderInvoices[order.orderNumber][0];
                              window.open(`/invoices/${invoice._id}`, '_blank');
                            }}
                            className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                            title="View Invoice"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          
                          {/* Pay Now button for unpaid invoices */}
                          {(() => {
                            const invoice = orderInvoices[order.orderNumber][0];
                            const paymentStatus = invoice.paymentStatus;
                            const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && paymentStatus !== 'paid';
                            
                            if (paymentStatus === 'unpaid' || paymentStatus === 'partial' || isOverdue) {
                              return (
                                <button 
                                  onClick={() => {
                                    const invoice = orderInvoices[order.orderNumber][0];
                                    // For now, just show an alert - in a real app, this would integrate with payment gateway
                                    alert(`Payment for Invoice ${invoice.invoiceNumber}\nAmount: PKR ${invoice.remainingAmount || invoice.total}\n\nPayment integration would be implemented here.\n\nFor now, please contact your account manager to process payment.`);
                                  }}
                                  className={`p-2 rounded-lg transition-colors ${
                                    isOverdue 
                                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                                      : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                  }`}
                                  title={isOverdue ? "Pay Overdue Invoice" : "Pay Invoice"}
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                  </svg>
                                </button>
                              );
                            }
                            return null;
                          })()}
                        </>
                      )}

                      {/* Management functions - Only for non-customers */}
                      {!user?.isCustomer && (
                        <>
                          <PermissionGate permission="orders.update">
                            <button 
                              onClick={() => handleEditOrder(order)}
                              className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                              title="Edit Order"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </PermissionGate>
                          <PermissionGate permission="orders.update">
                            <button 
                              onClick={() => openDiscountModal(order)}
                              className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                              title="Apply Discount"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                            </button>
                          </PermissionGate>
                          <PermissionGate permission="invoices.create">
                            <button 
                              onClick={() => handleCreateInvoice(order)}
                              disabled={invoiceLoading}
                              className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                              title="Create Invoice"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                          </PermissionGate>
                          <PermissionGate permission="orders.delete">
                            <button 
                              onClick={() => handleDeleteOrder(order._id, order.orderNumber)}
                              className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                              title="Delete Order"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </PermissionGate>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-2">
                {searchTerm || statusFilter 
                  ? "No orders match your search criteria" 
                  : user?.isCustomer 
                    ? "No orders found"
                    : "No orders found"
                }
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {searchTerm || statusFilter 
                  ? "Try adjusting your search or filter criteria" 
                  : user?.isCustomer
                    ? "You haven't placed any orders yet. Contact your account manager to place an order."
                    : "Create your first order to get started"
                }
              </p>
              {!searchTerm && !statusFilter && !user?.isCustomer && (
                <PermissionGate permission="orders.create">
                  <button 
                    onClick={() => router.push('/orders/create')} 
                    className="inline-flex items-center justify-center rounded-lg bg-blue-900 px-6 py-3 text-center font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/50 transition-all duration-300 hover:shadow-lg text-sm"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create First Order
                  </button>
                </PermissionGate>
              )}
            </div>
          )}
          
          {/* Info message for customers about invoices */}
          {user?.isCustomer && filteredOrders.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    📄 About Invoices & Payments
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Invoices will appear here once they are created for your approved orders. You'll be able to view invoice details and make payments directly from this page. If you need an invoice urgently, please contact your account manager.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 border border-stroke dark:border-dark-3 rounded-lg shadow-lg px-4 py-3">
          <p className="text-sm font-medium text-blue-900 dark:text-white">{message}</p>
        </div>
      )}

      {/* View Order Modal */}
      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Order Details - {selectedOrder?.orderNumber}
                </h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-white mb-2">Customer Information</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm"><strong>Company:</strong> {selectedOrder?.customer?.companyName || 'N/A'}</p>
                    <p className="text-sm"><strong>Contact:</strong> {selectedOrder?.customer?.contactName || 'N/A'}</p>
                    <p className="text-sm"><strong>Email:</strong> {selectedOrder?.customer?.email || 'N/A'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-white mb-2">Order Information</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm"><strong>Status:</strong> <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(selectedOrder?.status || '')}`}>{selectedOrder?.status}</span></p>
                    <p className="text-sm"><strong>Total:</strong> PKR {(selectedOrder?.total || 0).toLocaleString()}</p>
                    <p className="text-sm"><strong>Date:</strong> {selectedOrder?.orderDate ? new Date(selectedOrder.orderDate).toLocaleDateString() : 'N/A'}</p>
                    {selectedOrder?.notes && <p className="text-sm"><strong>Notes:</strong> {selectedOrder.notes}</p>}
                  </div>
                </div>
              </div>
              
              {selectedOrder?.items && selectedOrder.items.length > 0 && (() => {
                // Filter items for managers - only show items in their assigned categories
                let displayItems = selectedOrder.items;
                
                if (user?.isManager && user?.managerProfile?.assignedCategories) {
                  const managerCategories = user.managerProfile.assignedCategories;
                  
                  // Normalize category names to handle "&" vs "and" variations (same as backend)
                  const normalizeCategory = (cat: string): string => {
                    if (!cat || typeof cat !== 'string') return '';
                    return cat.toLowerCase().trim()
                      .replace(/\s*&\s*/g, ' and ')
                      .replace(/\s+/g, ' ');
                  };
                  
                  // Normalize manager categories once
                  const normalizedManagerCategories = managerCategories.map(cat => normalizeCategory(cat));
                  
                  displayItems = selectedOrder.items.filter(item => {
                    if (!item.product?.category) return false;
                    
                    const productCategory = item.product.category;
                    // Get the main category string
                    const productCatStr = typeof productCategory === 'string' 
                      ? productCategory 
                      : (productCategory?.mainCategory || '');
                    
                    if (!productCatStr) return false;
                    
                    // Normalize product category
                    const normalizedProductCat = normalizeCategory(productCatStr);
                    
                    // Check if normalized product category matches any normalized manager category
                    return normalizedManagerCategories.some(normalizedManagerCat => {
                      // Exact match after normalization
                      if (normalizedProductCat === normalizedManagerCat) return true;
                      // Contains check (for partial matches)
                      if (normalizedProductCat.includes(normalizedManagerCat) || 
                          normalizedManagerCat.includes(normalizedProductCat)) return true;
                      return false;
                    });
                  });
                }
                
                return displayItems.length > 0 ? (
                  <div className="mt-6">
                    <h4 className="font-medium text-blue-900 dark:text-white mb-2">
                      Order Items {user?.isManager && displayItems.length < selectedOrder.items.length 
                        ? `(${displayItems.length} of ${selectedOrder.items.length} - Your Categories)` 
                        : `(${displayItems.length})`}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-700">
                            <th className="px-3 py-2 text-left">Product</th>
                            <th className="px-3 py-2 text-left">Quantity</th>
                            <th className="px-3 py-2 text-left">Unit Price</th>
                            <th className="px-3 py-2 text-left">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayItems.map((item, index) => (
                            <tr key={`${selectedOrder?._id}-item-${index}-${item.product?._id || 'unknown'}`} className="border-b border-gray-200 dark:border-gray-600">
                              <td className="px-3 py-2">{item.product?.name || 'N/A'}</td>
                              <td className="px-3 py-2">{item.quantity}</td>
                              <td className="px-3 py-2">PKR {(item.unitPrice || 0).toLocaleString()}</td>
                              <td className="px-3 py-2">PKR {(item.total || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : user?.isManager ? (
                  <div className="mt-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No items in this order match your assigned categories.
                    </p>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Edit Order - {selectedOrder?.orderNumber}
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedOrder(null);
                    setEditingOrder({});
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleUpdateOrder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">
                    Status
                  </label>
                  <select
                    value={editingOrder.status || ''}
                    onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="on_hold">On Hold</option>
                    <option value="dispatched">Dispatched</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">
                    Notes
                  </label>
                  <textarea
                    value={editingOrder.notes || ''}
                    onChange={(e) => setEditingOrder({...editingOrder, notes: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    rows={3}
                    placeholder="Add notes about this order..."
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedOrder(null);
                      setEditingOrder({});
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-50 rounded-lg"
                  >
                    {submitting ? 'Updating...' : 'Update Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && discountOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-4">
              💰 Apply Discount
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Order: {discountOrder.orderNumber}
                </label>
                <div className="text-sm text-gray-500 mb-2">
                  Total Amount: PKR {(discountOrder.total || 0).toLocaleString()}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discount Amount (PKR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max={discountOrder.total}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter discount amount"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum discount: PKR {(discountOrder.total || 0).toLocaleString()}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Comments (Optional)
                </label>
                <textarea
                  value={discountComments}
                  onChange={(e) => setDiscountComments(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Reason for discount (e.g., volume discount, customer loyalty, etc.)"
                />
              </div>

              {/* Preview */}
              {discountValue && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    💡 Discount Preview
                  </h5>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <div>Original Total: PKR {(discountOrder.total || 0).toLocaleString()}</div>
                    <div>Discount: -PKR {parseFloat(discountValue || "0").toLocaleString()}</div>
                    <div className="font-semibold border-t border-blue-200 dark:border-blue-700 pt-1 mt-1">
                      Final Total: PKR {((discountOrder.total || 0) - parseFloat(discountValue || "0")).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDiscountModal(false);
                  setDiscountOrder(null);
                  setDiscountValue("");
                  setDiscountComments("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscountApplication}
                disabled={!discountValue || parseFloat(discountValue) <= 0}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && invoiceOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-blue-900 dark:text-white mb-4">
              Create Invoice for Order
            </h3>
            
            <div className="space-y-4">
              {/* Order Details */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-white mb-2">Order Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Order Number:</span>
                    <span className="ml-2 text-blue-900 dark:text-white">{invoiceOrder.orderNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                    <span className="ml-2 text-blue-900 dark:text-white">{invoiceOrder.customer.companyName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className="ml-2 text-blue-900 dark:text-white">{invoiceOrder.status}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Order Date:</span>
                    <span className="ml-2 text-blue-900 dark:text-white">
                      {new Date(invoiceOrder.orderDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-white mb-2">Items Summary</h4>
                <div className="space-y-2">
                  {invoiceOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {item.product.name} x {item.quantity}
                      </span>
                      <span className="text-blue-900 dark:text-white">
                        PKR {item.total.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-white mb-2">Pricing Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="text-blue-900 dark:text-white">PKR {invoiceOrder.subtotal.toLocaleString()}</span>
                  </div>
                  {invoiceOrder.totalDiscount && invoiceOrder.totalDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                      <span className="text-red-600 dark:text-red-400">-PKR {invoiceOrder.totalDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                    <span className="text-blue-900 dark:text-white">PKR {invoiceOrder.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Total:</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      PKR {(invoiceOrder.finalTotal || invoiceOrder.total).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Invoice Preview */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-white mb-2">Invoice Preview</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>This will create an invoice for the order with the following details:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Invoice will be generated for {invoiceOrder.customer.companyName}</li>
                    <li>Order: {invoiceOrder.orderNumber}</li>
                    <li>Total Amount: PKR {(invoiceOrder.finalTotal || invoiceOrder.total).toLocaleString()}</li>
                    <li>Invoice will be available in the Invoices section</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setInvoiceOrder(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleInvoiceCreate}
                disabled={invoiceLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {invoiceLoading ? 'Creating Invoice...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

function OrdersPageWithSuspense() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    }>
      <OrdersPageContent />
    </Suspense>
  );
}

export default OrdersPageWithSuspense;
