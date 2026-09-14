"use client";

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Carousel images - using local images from public/images/carasoul folder
const carouselImages = [
  {
    src: "/images/carasoul/Construction-Building-Materials.webp",
    alt: "Construction Building Materials"
  },
  {
    src: "/images/carasoul/Dry-Mix-Mortar-2.webp",
    alt: "Dry Mix Mortar"
  },
  {
    src: "/images/carasoul/Epoxy-Adhesive.webp",
    alt: "Epoxy Adhesive"
  },
  {
    src: "/images/carasoul/Epoxy-Flooring-2.webp",
    alt: "Epoxy Flooring"
  },
  {
    src: "/images/carasoul/Facing-Construction-Problems.webp",
    alt: "Facing Construction Problems"
  },
  {
    src: "/images/carasoul/TIle-Bond-2.webp",
    alt: "Tile Bond"
  }
];
import { 
  Package, 
  TrendingUp, 
  Bell, 
  BarChart3,
  Filter,
  Search,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  ShoppingCart,
  DollarSign,
  Activity,
  XCircle,
  RefreshCw
} from "lucide-react";

interface ManagerProfile {
  _id: string;
  user_id: string;
  assignedCategories: string[];
  managerLevel: string;
  notificationPreferences: {
    orderUpdates: boolean;
    stockAlerts: boolean;
    statusChanges: boolean;
    newOrders: boolean;
    lowStock: boolean;
    categoryReports: boolean;
  };
  performance: {
    totalOrdersManaged: number;
    totalProductsManaged: number;
    averageResponseTime: number;
    lastActiveAt: string;
  };
  assignedCustomers?: Array<{
    _id: string;
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
  }>;
}

interface ManagerOrder {
  _id: string;
  orderNumber: string;
  customer?: {
    companyName: string;
    contactName: string;
    email: string;
  } | null;
  status: string;
  subtotal?: number;
  tax?: number;
  total: number;
  totalDiscount?: number;
  finalTotal?: number;
  originalTotal?: number;
  items: any[];
  categories: string[];
  createdAt: string;
  approvalStatus?: string;
}

interface ManagerProduct {
  _id: string;
  name: string;
  description?: string;
  category: string | {
    mainCategory: string;
    subCategory?: string;
  };
  price: number;
  stock: number;
  minStock: number;
  sku?: string;
  isActive: boolean;
}

interface ManagerReport {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
  ordersByCategory: Record<string, number>;
  topCustomers: Record<string, number>;
  monthlyTrend: Array<{
    month: string;
    orders: number;
    revenue: number;
  }>;
}

export default function ManagerDashboard() {
  const [profile, setProfile] = useState<ManagerProfile | null>(null);
  const [orders, setOrders] = useState<ManagerOrder[]>([]);
  const [products, setProducts] = useState<ManagerProduct[]>([]);
  const [reports, setReports] = useState<ManagerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ManagerOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderStatus, setOrderStatus] = useState("");
  const [orderComments, setOrderComments] = useState("");
  const [message, setMessage] = useState("");
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  
  // Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCarouselIndex((prev) => (prev + 1) % carouselImages.length);
    }, 5000); // Change image every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // CRUD State Management
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ManagerProduct | null>(null);
  const [editingCategory, setEditingCategory] = useState<string>("");
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: 0,
    category: "",
    stock: 0,
    minStock: 0,
    sku: "",
    isActive: true
  });
  const [newCategory, setNewCategory] = useState("");
  
  // Status update modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdateOrder, setStatusUpdateOrder] = useState<ManagerOrder | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusComments, setStatusComments] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  
  // Discount modal states
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountOrder, setDiscountOrder] = useState<ManagerOrder | null>(null);
  const [discountValue, setDiscountValue] = useState("");
  const [discountComments, setDiscountComments] = useState("");
  
  const router = useRouter();

  // Fetch manager profile
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log('🔍 Fetching manager profile...');
      console.log('Token present:', !!token);
      
      // Decode token to see user info
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('🔑 Token payload:', payload);
          console.log('👤 User ID:', payload.user_id);
          console.log('🏢 Company ID:', payload.company_id);
          console.log('👑 Is Super Admin:', payload.isSuperAdmin);
        } catch (e) {
          console.log('❌ Could not decode token:', e);
        }
      }
      
      if (!token) {
        setMessage("❌ No authentication token found. Please login first.");
        setTimeout(() => setMessage(""), 5000);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/managers/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response statusText:', response.statusText);
      console.log('📡 Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Manager profile response:', data);
        console.log('✅ Manager data exists:', !!data.manager);
        
        if (data.manager) {
          console.log('✅ Setting manager profile:', {
            _id: data.manager._id,
            user_id: data.manager.user_id,
            categories: data.manager.assignedCategories?.length || 0
          });
          setProfile(data.manager);
        } else {
          console.error('❌ No manager data in response. Full response:', JSON.stringify(data, null, 2));
          setMessage(`❌ No manager data in response. Response: ${JSON.stringify(data)}`);
          setTimeout(() => setMessage(""), 10000);
        }
      } else {
        let errorData;
        try {
          const text = await response.text();
          console.error('❌ Error response text:', text);
          errorData = JSON.parse(text);
        } catch (e) {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('❌ API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        setMessage(`❌ API Error (${response.status}): ${errorData.message || errorData.error || 'Unknown error'}`);
        setTimeout(() => setMessage(""), 10000);
      }
    } catch (error) {
      console.error('❌ Fetch Error:', error);
      setMessage(`❌ Fetch Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 10000);
    }
  };

  // Fetch manager orders
  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      // Request a high limit to get all orders for the manager
      const response = await fetch('/api/managers/orders?limit=1000&page=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Manager orders API response:', data);
        console.log('📊 Orders received:', data.orders?.length || 0);
        console.log('📋 Orders list:', data.orders);
        
        // Debug: Check order structure and totals
        if (data.orders && data.orders.length > 0) {
          data.orders.forEach((order: any, index: number) => {
            console.log(`📦 Order ${index + 1} (${order.orderNumber}):`, {
              originalItemCount: order.originalItemCount,
              filteredItemCount: order.filteredItemCount,
              originalTotal: order.originalTotal ? `PKR ${order.originalTotal.toFixed(2)}` : 'N/A',
              filteredTotal: order.total ? `PKR ${order.total.toFixed(2)}` : 'N/A',
              filteredFinalTotal: order.finalTotal ? `PKR ${order.finalTotal.toFixed(2)}` : 'N/A',
              discount: order.totalDiscount ? `PKR ${order.totalDiscount.toFixed(2)}` : 'None',
              categories: order.categories,
              items: order.items?.length || 0
            });
          });
        }
        
        setOrders(data.orders || []);
        
        // Debug: Check if our specific order is in the results
        const specificOrder = (data.orders || []).find((o: any) => o.orderNumber === 'ORD-1760440916923-0y7s8eo9z');
        console.log('🎯 Specific order found in API response:', !!specificOrder);
        if (specificOrder) {
          console.log('✅ Specific order details:', specificOrder);
        }
        
        // Debug: Check the structure of all orders
        console.log('🔍 All orders structure:');
        (data.orders || []).forEach((order: any, index: number) => {
          console.log(`Order ${index + 1}:`, {
            orderNumber: order.orderNumber,
            customer: order.customer?.companyName,
            categories: order.categories,
            status: order.status,
            items: order.items?.length
          });
        });
      } else {
        console.error('❌ Manager orders API error:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error details:', errorData);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  // Fetch manager products
  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/managers/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Fetch manager reports
  const fetchReports = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/managers/reports', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        fetchProfile(),
        fetchOrders(),
        fetchProducts(),
        fetchReports()
      ]);
      setLoading(false);
    };

    initializeData();
  }, []);

  // Update order status
  const handleUpdateOrderStatus = async () => {
    if (!selectedOrder || !orderStatus) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/managers/orders/${selectedOrder._id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: orderStatus,
          comments: orderComments
        }),
      });

      if (response.ok) {
        setMessage("✅ Order status updated successfully!");
        await fetchOrders();
        setShowOrderModal(false);
        setSelectedOrder(null);
        setOrderStatus("");
        setOrderComments("");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("❌ Failed to update order status");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      setMessage("❌ Error updating order status");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // CRUD Functions for Products
  const createProduct = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProduct),
      });

      if (response.ok) {
        setMessage("✅ Product created successfully!");
        await fetchProducts();
        setShowProductModal(false);
        setNewProduct({
          name: "",
          description: "",
          price: 0,
          category: "",
          stock: 0,
          minStock: 0,
          sku: "",
          isActive: true
        });
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to create product: ${errorData.message}`);
      }
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      console.error('Error creating product:', error);
      setMessage(`❌ Error creating product: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const updateProduct = async () => {
    if (!editingProduct) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/products/${editingProduct._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingProduct),
      });

      if (response.ok) {
        setMessage("✅ Product updated successfully!");
        await fetchProducts();
        setShowProductModal(false);
        setEditingProduct(null);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to update product: ${errorData.message}`);
      }
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      console.error('Error updating product:', error);
      setMessage(`❌ Error updating product: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setMessage("✅ Product deleted successfully!");
        await fetchProducts();
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to delete product: ${errorData.message}`);
      }
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      console.error('Error deleting product:', error);
      setMessage(`❌ Error deleting product: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const editProduct = (product: ManagerProduct) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/managers/assign-categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categories: [newCategory],
          managerId: profile?._id
        }),
      });

      if (response.ok) {
        setMessage("✅ Category added successfully!");
        await fetchProfile();
        setNewCategory("");
        setShowCategoryModal(false);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to add category: ${errorData.message}`);
      }
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      console.error('Error adding category:', error);
      setMessage(`❌ Error adding category: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const removeCategory = async (category: string) => {
    if (!confirm(`Are you sure you want to remove category "${category}"?`)) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/managers/assign-categories', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categories: [category],
          managerId: profile?._id
        }),
      });

      if (response.ok) {
        setMessage("✅ Category removed successfully!");
        await fetchProfile();
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to remove category: ${errorData.message}`);
      }
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      console.error('Error removing category:', error);
      setMessage(`❌ Error removing category: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  // Open status update modal
  const openStatusModal = (order: ManagerOrder) => {
    setStatusUpdateOrder(order);
    setNewStatus(order.status);
    setStatusComments("");
    setDiscountPercentage("");
    setDiscountAmount("");
    setShowStatusModal(true);
  };

  // Open discount modal
  const openDiscountModal = (order: ManagerOrder) => {
    setDiscountOrder(order);
    setDiscountValue("");
    setDiscountComments("");
    setShowDiscountModal(true);
  };

  // Handle discount application
  const handleDiscountApplication = async () => {
    if (!discountOrder || !discountValue) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/managers/orders/${discountOrder._id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
        // Try to parse error response
        let errorData;
        try {
          const errorText = await response.text();
          console.error('❌ Error response text:', errorText);
          // Try to parse as JSON
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            // If not JSON, it might be HTML error page
            errorData = { message: `Server error (${response.status}): ${response.statusText}` };
          }
        } catch (e) {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('❌ Error applying discount:', errorData);
        setMessage(`❌ Error applying discount: ${errorData.message || errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error applying discount:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Check if it's a JSON parse error
      if (errorMessage.includes('JSON') || errorMessage.includes('DOCTYPE')) {
        setMessage(`❌ Error applying discount: Server returned invalid response. Please check if backend server is running.`);
      } else {
        setMessage(`❌ Error applying discount: ${errorMessage}`);
      }
    }
  };

  // Handle status change from dropdown
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/managers/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          comments: `Status changed to ${newStatus} by manager`
        }),
      });

      if (response.ok) {
        setMessage(`✅ Order status updated to ${newStatus}`);
        fetchOrders(); // Refresh orders
        setTimeout(() => setMessage(""), 3000);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to update status: ${errorData.message}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage(`❌ Error updating status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  // Advanced status update with comments
  const handleAdvancedStatusUpdate = async () => {
    if (!statusUpdateOrder || !newStatus) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/managers/orders/${statusUpdateOrder._id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          comments: statusComments || `Status updated to ${newStatus} by manager`,
          discountPercentage: discountPercentage ? parseFloat(discountPercentage) : undefined,
          discountAmount: discountAmount ? parseFloat(discountAmount) : undefined
        }),
      });

      if (response.ok) {
        setMessage(`✅ Order ${statusUpdateOrder.orderNumber} status updated to ${newStatus}`);
        fetchOrders(); // Refresh orders
        setShowStatusModal(false);
        setStatusUpdateOrder(null);
        setNewStatus("");
        setStatusComments("");
        setTimeout(() => setMessage(""), 3000);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to update status: ${errorData.message}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage(`❌ Error updating status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  // Quick status update function
  const handleQuickStatusUpdate = async (orderId: string, newStatus: string) => {
    console.log('🔄 Updating order status:', { orderId, newStatus });
    console.log('🔗 Full API URL:', `/api/managers/orders/${orderId}/status`);
    
    // Show loading message
    setMessage(`🔄 Updating order status to ${newStatus}...`);
    
    try {
      const token = localStorage.getItem("token");
      console.log('🔑 Token present:', !!token);
      console.log('🔑 Token length:', token?.length);
      
      // First test if the route exists
      console.log('🧪 Testing route accessibility...');
      try {
        const testResponse = await fetch(`/api/test-status`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ test: 'data' }),
        });
        console.log('🧪 Test route response:', testResponse.status, testResponse.statusText);
        
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log('🧪 Test route data:', testData);
        } else {
          console.log('🧪 Test route failed:', testResponse.status, testResponse.statusText);
        }
      } catch (testError) {
        console.error('🧪 Test route error:', testError);
      }
      
      const response = await fetch(`/api/managers/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          comments: `Status changed to ${newStatus} by manager`
        }),
      });

      console.log('📡 Status update response:', response.status, response.statusText);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Status update successful:', data);
        setMessage(`✅ Order status updated to ${newStatus}!`);
        await fetchOrders();
        setTimeout(() => setMessage(""), 3000);
      } else {
        console.log('❌ Response not OK, trying to parse error...');
        let errorData;
        try {
          errorData = await response.json();
          console.error('❌ Status update failed - parsed error:', errorData);
        } catch (parseError) {
          console.error('❌ Status update failed - could not parse error:', parseError);
          const text = await response.text();
          console.error('❌ Raw response text:', text);
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        setMessage(`❌ Failed to update order status: ${errorData.message || 'Unknown error'}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      setMessage(`❌ Error updating order status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  // View order details
  const handleViewOrder = (order: ManagerOrder) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  // Filter orders based on manager's assigned categories
  const filteredOrders = orders.filter(order => {
        const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (order.customer?.companyName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || order.categories.includes(categoryFilter);
    const matchesStatus = !statusFilter || order.status === statusFilter;
    
    // Check if order categories match manager's assigned categories
    const matchesManagerCategories = profile?.assignedCategories?.some(assignedCat => {
      return order.categories.some(orderCategory => {
        return orderCategory.includes(assignedCat) || assignedCat.includes(orderCategory);
      });
    }) || false;
    
    return matchesManagerCategories && matchesSearch && matchesCategory && matchesStatus;
  });
  
  // Debug: Log filtering results
  console.log('🔍 Order Filtering Debug:');
  console.log('   Total orders in state:', orders.length);
  console.log('   Filtered orders:', filteredOrders.length);
  console.log('   Search term:', searchTerm);
  console.log('   Category filter:', categoryFilter);
  console.log('   Status filter:', statusFilter);
  
  // Check if our specific order is in the filtered results
  const specificOrderInFiltered = filteredOrders.find(o => o.orderNumber === 'ORD-1760440916923-0y7s8eo9z');
  console.log('🎯 Specific order in filtered results:', !!specificOrderInFiltered);

  // Filter products based on manager's assigned categories
  const filteredProducts = products.filter(product => {
    const productCategory = typeof product.category === 'string' 
      ? product.category 
      : product.category?.mainCategory || 'Uncategorized';
    
    // Check if product category matches manager's assigned categories
    const matchesManagerCategories = profile?.assignedCategories?.some(assignedCat => {
      if (typeof productCategory === 'string') {
        return productCategory.includes(assignedCat) || assignedCat.includes(productCategory);
      }
      return false;
    }) || false;
    
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || productCategory === categoryFilter;
    
    return matchesManagerCategories && matchesSearch && matchesCategory;
  });

  // Get unique categories from orders and products
  const orderCategories = [...new Set(orders.flatMap(o => o.categories))];
  const productCategories = [...new Set(products.map(p => 
    typeof p.category === 'string' ? p.category : p.category?.mainCategory || 'Uncategorized'
  ))];
  const allCategories = [...new Set([...orderCategories, ...productCategories])];

  // Get status counts
  const statusCounts = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    approvedOrders: orders.filter(o => o.status === 'approved').length,
    totalProducts: products.length,
    lowStockProducts: products.filter(p => p.stock <= p.minStock).length,
    outOfStockProducts: products.filter(p => p.stock === 0).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-dark dark:text-white mb-4">Manager Profile Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have a manager profile set up. Please contact your administrator.
          </p>
          
          {/* Error Message Display */}
          {message && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left max-w-md mx-auto">
              <h3 className="font-semibold text-red-800 mb-2">Error Details:</h3>
              <p className="text-sm text-red-700">{message}</p>
            </div>
          )}
          
          {/* Debug Information */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left max-w-md mx-auto">
            <h3 className="font-semibold text-yellow-800 mb-2">Debug Information:</h3>
            <p className="text-sm text-yellow-700 mb-2">Check browser console (F12) for detailed error logs.</p>
            <p className="text-sm text-yellow-700 mb-2">Try these steps:</p>
            <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
              <li>Check if backend server is running on port 5000</li>
              <li>Clear browser cache and cookies</li>
              <li>Logout and login again to refresh your token</li>
              <li>Visit /debug-manager for detailed debugging</li>
            </ul>
          </div>

          <div className="space-x-4">
            <button
              onClick={() => {
                setLoading(true);
                fetchProfile();
              }}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-green-500 px-6 py-3 text-center font-medium text-white hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? "Retrying..." : "Retry"}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-center font-medium text-white hover:bg-opacity-90"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => router.push('/debug-manager')}
              className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-6 py-3 text-center font-medium text-white hover:bg-blue-600"
            >
              Debug Manager
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <Breadcrumb pageName="Manager Dashboard" />

      {/* Image Carousel Banner - Full Width */}
      <div className="w-screen relative -left-[calc((100vw-100%)/2)] mb-4 sm:mb-6 lg:mb-8">
        <div className="relative w-full h-64 sm:h-80 md:h-[500px] lg:h-[600px] xl:h-[700px] 2xl:h-[800px] overflow-hidden shadow-2xl">
          {/* Carousel Container */}
          <div className="relative w-full h-full">
            {carouselImages.map((image, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentCarouselIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-contain bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900"
                  style={{ objectFit: 'contain', objectPosition: 'center' }}
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    e.currentTarget.src = `https://via.placeholder.com/1200x600/1e3a8a/ffffff?text=${encodeURIComponent(image.alt)}`;
                  }}
                />
                {/* Subtle overlay for better text visibility */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/40 pointer-events-none"></div>
                
                {/* Title Display - Top Center */}
                <div className="absolute top-6 sm:top-8 lg:top-12 left-1/2 transform -translate-x-1/2 z-20 text-center px-4 sm:px-6 max-w-5xl pointer-events-none">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] mb-2">
                    {image.alt}
                  </h2>
                </div>
                
                {/* Contact Us Button - Positioned at bottom left */}
                <a
                  href="#contact-form"
                  className="absolute left-4 sm:left-8 lg:left-12 bottom-8 sm:bottom-12 lg:bottom-16 z-20 inline-flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 text-sm sm:text-base lg:text-lg backdrop-blur-sm bg-opacity-95"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Contact Us
                </a>
              </div>
            ))}
            
            {/* Carousel Indicators */}
            <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
              {carouselImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentCarouselIndex(index)}
                  className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${
                    index === currentCarouselIndex
                      ? 'w-8 sm:w-10 bg-blue-900 shadow-lg'
                      : 'w-2 sm:w-2.5 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            
            {/* Navigation Arrows */}
            <button
              onClick={() => setCurrentCarouselIndex((prev) => (prev - 1 + carouselImages.length) % carouselImages.length)}
              className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900/80 hover:bg-blue-900 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300"
              aria-label="Previous image"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={() => setCurrentCarouselIndex((prev) => (prev + 1) % carouselImages.length)}
              className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900/80 hover:bg-blue-900 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300"
              aria-label="Next image"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">👋</div>
              <div>
                <h1 className="text-2xl font-bold text-dark dark:text-white">
                  Welcome, {profile.user_id}!
                </h1>
                <p className="text-gray-6 dark:text-dark-6">
                  Manage your assigned product categories and track performance.
                </p>
              </div>
            </div>
            
            {/* Debug Info */}
            {(() => {
              const token = localStorage.getItem("token");
              if (token) {
                try {
                  const payload = JSON.parse(atob(token.split('.')[1]));
                  return (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">Debug Info:</h3>
                      <p className="text-xs text-blue-600 dark:text-blue-300">User ID: {payload.user_id}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-300">Company: {payload.company_id}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-300">Is Super Admin: {payload.isSuperAdmin ? 'Yes' : 'No'}</p>
                    </div>
                  );
                } catch (e) {
                  return (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-xs text-red-600 dark:text-red-300">Invalid token format</p>
                    </div>
                  );
                }
              }
              return (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-xs text-yellow-600 dark:text-yellow-300">No token found - please login</p>
                </div>
              );
            })()}

            {/* Manager Info */}
            <div className="mt-4 p-4 rounded-lg bg-gray-2 dark:bg-dark-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-dark dark:text-white mb-2">Your Categories:</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.assignedCategories.map((category, index) => (
                      <span key={`category-${index}-${category}`} className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-dark dark:text-white mb-2">Performance:</p>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Orders Managed: {profile.performance.totalOrdersManaged}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Products Managed: {profile.performance.totalProductsManaged}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Avg Response Time: {profile.performance.averageResponseTime}h
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Customers */}
            {profile.assignedCustomers && profile.assignedCustomers.length > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-white dark:bg-dark-2 border border-stroke dark:border-dark-3">
                <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">
                  Your Assigned Customers ({profile.assignedCustomers.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profile.assignedCustomers.map((customer) => (
                    <div key={customer._id} className="border border-gray-200 dark:border-dark-3 rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-dark dark:text-white truncate">
                            {customer.companyName}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {customer.contactName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                            {customer.email}
                          </p>
                          {customer.phone && (
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              📞 {customer.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Orders</p>
                <p className="text-2xl font-semibold text-blue-900 dark:text-blue-100">{statusCounts.totalOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Approved Orders</p>
                <p className="text-2xl font-semibold text-green-900 dark:text-green-100">{statusCounts.approvedOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Pending Orders</p>
                <p className="text-2xl font-semibold text-yellow-900 dark:text-yellow-100">{statusCounts.pendingOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Low Stock</p>
                <p className="text-2xl font-semibold text-red-900 dark:text-red-100">{statusCounts.lowStockProducts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search orders and products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-stroke bg-transparent text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="sm:w-48">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                >
                  <option value="">All Categories</option>
                  {allCategories.map((category, index) => (
                    <option key={`category-${index}-${category}`} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                >
                  <option value="">All Status</option>
                  <option value="on_hold">On Hold</option>
                  <option value="dispatched">Dispatched</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <h5 className="mb-4 text-lg font-semibold text-black dark:text-white">Your Orders</h5>
            
            {filteredOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="min-w-[150px] px-4 py-4 font-medium text-dark dark:text-white">Order #</th>
                      <th className="min-w-[200px] px-4 py-4 font-medium text-dark dark:text-white">Customer</th>
                      <th className="min-w-[150px] px-4 py-4 font-medium text-dark dark:text-white">Categories</th>
                      <th className="min-w-[100px] px-4 py-4 font-medium text-dark dark:text-white">Status</th>
                      <th className="min-w-[100px] px-4 py-4 font-medium text-dark dark:text-white">Total</th>
                      <th className="min-w-[100px] px-4 py-4 font-medium text-dark dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order._id} className="border-b border-stroke dark:border-dark-3">
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <Package className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="font-medium text-dark dark:text-white">{order.orderNumber}</span>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-dark dark:text-white">
                              {order.customer?.companyName || 'Unknown Company'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {order.customer?.contactName || 'Unknown Contact'}
                            </p>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {(order.categories || []).map((category, index) => (
                              <span key={`category-${index}-${category}`} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                {category}
                              </span>
                            ))}
                          </div>
                        </td>
                        
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            order.status === 'dispatched' ? 'bg-green-100 text-green-800' :
                            order.status === 'on_hold' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="space-y-1 text-sm">
                            {/* Subtotal (Item Price) */}
                            <div className="text-dark dark:text-white">
                              <span className="text-gray-600 dark:text-gray-400">Items:</span> PKR {(order.subtotal || order.total || 0).toFixed(2)}
                            </div>
                            
                            {/* Tax Amount */}
                            {order.tax !== undefined && order.tax > 0 && (
                              <div className="text-blue-600 dark:text-blue-400">
                                <span className="text-gray-600 dark:text-gray-400">Tax:</span> PKR {order.tax.toFixed(2)}
                              </div>
                            )}
                            
                            {/* Subtotal + Tax */}
                            {order.subtotal !== undefined && (
                              <div className="text-dark dark:text-white font-medium border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
                                Subtotal: PKR {((order.subtotal || 0) + (order.tax || 0)).toFixed(2)}
                              </div>
                            )}
                            
                            {/* Discount Amount */}
                            {order.totalDiscount && order.totalDiscount > 0 && (
                              <div className="text-orange-600 dark:text-orange-400">
                                <span className="text-gray-600 dark:text-gray-400">Discount:</span> -PKR {order.totalDiscount.toFixed(2)}
                              </div>
                            )}
                            
                            {/* Final Total */}
                            <div className="font-semibold text-green-600 dark:text-green-400 border-t border-gray-300 dark:border-gray-600 pt-1 mt-1">
                              Total: PKR {(order.finalTotal || order.total || 0).toFixed(2)}
                            </div>
                            
                            {/* Show original total if different (for reference) */}
                            {order.originalTotal && order.originalTotal !== order.total && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                                (Original: PKR {order.originalTotal.toFixed(2)})
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {order.status !== 'dispatched' && (
                              <>
                                <button
                                  onClick={() => {
                                    console.log('🖱️ Dispatch button clicked for order:', order._id);
                                    handleQuickStatusUpdate(order._id, 'dispatched');
                                  }}
                                  className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Dispatch
                                </button>
                                <button
                                  onClick={() => handleQuickStatusUpdate(order._id, 'on_hold')}
                                  className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Hold
                                </button>
                              </>
                            )}
                            {order.status === 'dispatched' && (
                              <button
                                onClick={() => handleQuickStatusUpdate(order._id, 'on_hold')}
                                className="inline-flex items-center rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-700"
                              >
                                <Clock className="h-4 w-4 mr-1" />
                                Hold
                              </button>
                            )}
                            {order.status === 'on_hold' && (
                              <button
                                onClick={() => handleQuickStatusUpdate(order._id, 'dispatched')}
                                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Dispatch
                              </button>
                            )}
                            <button
                              onClick={() => openDiscountModal(order)}
                              className="inline-flex items-center rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Discount
                            </button>
                            <button
                              onClick={() => openStatusModal(order)}
                              className="inline-flex items-center rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit Status
                            </button>
                            
                            <button
                              onClick={() => handleViewOrder(order)}
                              className="inline-flex items-center rounded-md bg-gray-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </button>
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setOrderStatus(order.status);
                                setShowOrderModal(true);
                              }}
                              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No orders found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm || categoryFilter || statusFilter 
                    ? 'Try adjusting your search or filter criteria.' 
                    : 'No orders have been assigned to your categories yet.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Products Section */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h5 className="text-lg font-semibold text-black dark:text-white">Your Products</h5>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowProductModal(true)}
                  className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Add Product
                </button>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Add Category
                </button>
              </div>
            </div>
            
            {filteredProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="min-w-[200px] px-4 py-4 font-medium text-dark dark:text-white">Product</th>
                      <th className="min-w-[150px] px-4 py-4 font-medium text-dark dark:text-white">Category</th>
                      <th className="min-w-[100px] px-4 py-4 font-medium text-dark dark:text-white">Price</th>
                      <th className="min-w-[100px] px-4 py-4 font-medium text-dark dark:text-white">Stock</th>
                      <th className="min-w-[100px] px-4 py-4 font-medium text-dark dark:text-white">Status</th>
                      <th className="min-w-[120px] px-4 py-4 font-medium text-dark dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product._id} className="border-b border-stroke dark:border-dark-3">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-dark dark:text-white">{product.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">ID: {product._id}</p>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            {typeof product.category === 'string' ? product.category : product.category?.mainCategory || 'Uncategorized'}
                          </span>
                        </td>
                        
                        <td className="px-4 py-4">
                          <span className="font-medium text-dark dark:text-white">PKR {product.price.toFixed(2)}</span>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <span className={`font-medium ${
                              product.stock === 0 ? 'text-red-600' :
                              product.stock <= product.minStock ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {product.stock}
                            </span>
                            {product.stock <= product.minStock && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500 ml-1" />
                            )}
                          </div>
                        </td>
                        
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            product.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {product.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => editProduct(product)}
                              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => deleteProduct(product._id)}
                              className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No products found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm || categoryFilter 
                    ? 'Try adjusting your search or filter criteria.' 
                    : 'No products have been assigned to your categories yet.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Order Status Update Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-dark-2 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">
                Order Details: {selectedOrder.orderNumber}
              </h3>
              
              <div className="space-y-4">
                {/* Order Information */}
                <div className="bg-gray-50 dark:bg-dark-3 rounded-lg p-4">
                  <h4 className="font-semibold text-dark dark:text-white mb-3">Order Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Order Number:</span>
                      <span className="ml-2 text-dark dark:text-white font-medium">{selectedOrder.orderNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                      <span className="ml-2 text-dark dark:text-white font-medium">{selectedOrder.customer?.companyName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                        selectedOrder.status === 'dispatched' ? 'bg-green-100 text-green-800' :
                        selectedOrder.status === 'on_hold' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>{selectedOrder.status}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Date:</span>
                      <span className="ml-2 text-dark dark:text-white">{new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-dark dark:text-white mb-3">Order Items ({selectedOrder.items.length})</h4>
                    <div className="border border-stroke dark:border-dark-3 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-dark-3">
                          <tr>
                            <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Product</th>
                            <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">Qty</th>
                            <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">Unit Price</th>
                            <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items.map((item: any, index: number) => (
                            <tr key={index} className="border-t border-stroke dark:border-dark-3">
                              <td className="px-4 py-2 text-dark dark:text-white">
                                {item.product?.name || 'N/A'}
                              </td>
                              <td className="px-4 py-2 text-right text-dark dark:text-white">{item.quantity}</td>
                              <td className="px-4 py-2 text-right text-dark dark:text-white">PKR {item.unitPrice?.toFixed(2) || '0.00'}</td>
                              <td className="px-4 py-2 text-right text-dark dark:text-white font-medium">PKR {((item.unitPrice || 0) * (item.quantity || 0)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="bg-gray-50 dark:bg-dark-3 rounded-lg p-4">
                  <h4 className="font-semibold text-dark dark:text-white mb-3">Price Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Items Subtotal:</span>
                      <span className="text-dark dark:text-white font-medium">PKR {(selectedOrder.subtotal || selectedOrder.total || 0).toFixed(2)}</span>
                    </div>
                    {selectedOrder.tax !== undefined && selectedOrder.tax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">PKR {selectedOrder.tax.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Subtotal (Items + Tax):</span>
                      <span className="text-dark dark:text-white font-semibold">PKR {((selectedOrder.subtotal || 0) + (selectedOrder.tax || 0)).toFixed(2)}</span>
                    </div>
                    {selectedOrder.totalDiscount && selectedOrder.totalDiscount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                        <span className="text-orange-600 dark:text-orange-400 font-medium">-PKR {selectedOrder.totalDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t-2 border-gray-300 dark:border-gray-500 pt-2">
                      <span className="text-dark dark:text-white font-bold text-base">Final Total:</span>
                      <span className="text-green-600 dark:text-green-400 font-bold text-base">PKR {(selectedOrder.finalTotal || selectedOrder.total || 0).toFixed(2)}</span>
                    </div>
                    {selectedOrder.originalTotal && selectedOrder.originalTotal !== selectedOrder.total && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                        Note: Original order total was PKR {selectedOrder.originalTotal.toFixed(2)} (showing only items from your assigned categories)
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                    Status
                  </label>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  >
                    <option value="on_hold">On Hold</option>
                    <option value="dispatched">Dispatched</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                    Comments (Optional)
                  </label>
                  <textarea
                    value={orderComments}
                    onChange={(e) => setOrderComments(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                    placeholder="Add any comments about this status change..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowOrderModal(false);
                    setSelectedOrder(null);
                    setOrderStatus("");
                    setOrderComments("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-dark-3 dark:text-white dark:hover:bg-dark-4"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateOrderStatus}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-opacity-90"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product Modal */}
        {showProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-dark-2 rounded-lg p-6 w-full max-w-2xl mx-4">
              <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={editingProduct?.name || newProduct.name}
                    onChange={(e) => editingProduct 
                      ? setEditingProduct({...editingProduct, name: e.target.value})
                      : setNewProduct({...newProduct, name: e.target.value})
                    }
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                    placeholder="Enter product name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={editingProduct?.sku || newProduct.sku}
                    onChange={(e) => editingProduct 
                      ? setEditingProduct({...editingProduct, sku: e.target.value})
                      : setNewProduct({...newProduct, sku: e.target.value})
                    }
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                    placeholder="Enter SKU"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                    Price (PKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct?.price || newProduct.price}
                    onChange={(e) => editingProduct 
                      ? setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})
                      : setNewProduct({...newProduct, price: parseFloat(e.target.value)})
                    }
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                    Category *
                  </label>
                  <select
                    value={typeof (editingProduct?.category || newProduct.category) === 'string' 
                      ? (editingProduct?.category || newProduct.category) 
                      : (editingProduct?.category as any)?.mainCategory || (newProduct.category as any)?.mainCategory || ''}
                    onChange={(e) => editingProduct 
                      ? setEditingProduct({...editingProduct, category: e.target.value})
                      : setNewProduct({...newProduct, category: e.target.value})
                    }
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  >
                    <option value="">Select Category</option>
                    {profile?.assignedCategories?.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    value={editingProduct?.stock || newProduct.stock}
                    onChange={(e) => editingProduct 
                      ? setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})
                      : setNewProduct({...newProduct, stock: parseInt(e.target.value)})
                    }
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                    Minimum Stock
                  </label>
                  <input
                    type="number"
                    value={editingProduct?.minStock || newProduct.minStock}
                    onChange={(e) => editingProduct 
                      ? setEditingProduct({...editingProduct, minStock: parseInt(e.target.value)})
                      : setNewProduct({...newProduct, minStock: parseInt(e.target.value)})
                    }
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                  Description
                </label>
                <textarea
                  value={editingProduct?.description || newProduct.description}
                  onChange={(e) => editingProduct 
                    ? setEditingProduct({...editingProduct, description: e.target.value})
                    : setNewProduct({...newProduct, description: e.target.value})
                  }
                  rows={3}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  placeholder="Enter product description"
                />
              </div>
              
              <div className="flex items-center gap-4 mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingProduct?.isActive ?? newProduct.isActive}
                    onChange={(e) => editingProduct 
                      ? setEditingProduct({...editingProduct, isActive: e.target.checked})
                      : setNewProduct({...newProduct, isActive: e.target.checked})
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-dark dark:text-white">Active</span>
                </label>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowProductModal(false);
                    setEditingProduct(null);
                    setNewProduct({
                      name: "",
                      description: "",
                      price: 0,
                      category: "",
                      stock: 0,
                      minStock: 0,
                      sku: "",
                      isActive: true
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-dark-3 dark:text-white dark:hover:bg-dark-4"
                >
                  Cancel
                </button>
                <button
                  onClick={editingProduct ? updateProduct : createProduct}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-opacity-90"
                >
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-dark-2 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">
                Add New Category
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                    placeholder="Enter category name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                    Current Categories
                  </label>
                  <div className="space-y-2">
                    {profile?.assignedCategories?.map((category, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-dark-3 rounded-lg px-3 py-2">
                        <span className="text-sm text-dark dark:text-white">{category}</span>
                        <button
                          onClick={() => removeCategory(category)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setNewCategory("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-dark-3 dark:text-white dark:hover:bg-dark-4"
                >
                  Cancel
                </button>
                <button
                  onClick={addCategory}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-opacity-90"
                >
                  Add Category
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Update Modal */}
        {showStatusModal && statusUpdateOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Update Order Status
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Order: {statusUpdateOrder.orderNumber}
                  </label>
                  <div className="text-xs text-gray-500 mb-2">
                    Current Status: "{statusUpdateOrder.status}" → New Status: "{newStatus}"
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="on_hold">On Hold</option>
                    <option value="dispatched">Dispatched</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Comments (Optional)
                  </label>
                  <textarea
                    value={statusComments}
                    onChange={(e) => setStatusComments(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Add any comments about this status change..."
                  />
                </div>

                {/* Discount Fields - Always show for testing */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    💰 Discount (Optional) - Always Visible for Testing
                  </h4>
                  {/* Debug info */}
                  <div className="text-xs text-gray-500 mb-2">
                    Debug: newStatus = "{newStatus}", showing discount fields
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Discount %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={discountPercentage}
                        onChange={(e) => {
                          setDiscountPercentage(e.target.value);
                          setDiscountAmount(""); // Clear amount when percentage is set
                        }}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        placeholder="10"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Discount Amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={discountAmount}
                        onChange={(e) => {
                          setDiscountAmount(e.target.value);
                          setDiscountPercentage(""); // Clear percentage when amount is set
                        }}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        placeholder="100"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    💡 Enter either percentage or amount (not both)
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setStatusUpdateOrder(null);
                    setNewStatus("");
                    setStatusComments("");
                    setDiscountPercentage("");
                    setDiscountAmount("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-dark-3 dark:text-white dark:hover:bg-dark-4"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdvancedStatusUpdate}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-opacity-90"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Discount Modal */}
        {showDiscountModal && discountOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                💰 Apply Discount
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Order: {discountOrder.orderNumber}
                  </label>
                </div>
                
                {/* Order Amount Breakdown */}
                <div className="bg-gray-50 dark:bg-dark-3 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Order Amount Breakdown</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Items Subtotal:</span>
                      <span className="text-gray-900 dark:text-white">PKR {(discountOrder.subtotal || discountOrder.total || 0).toFixed(2)}</span>
                    </div>
                    {discountOrder.tax !== undefined && discountOrder.tax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                        <span className="text-blue-600 dark:text-blue-400">PKR {discountOrder.tax.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Subtotal (Items + Tax):</span>
                      <span className="text-gray-900 dark:text-white font-medium">PKR {((discountOrder.subtotal || 0) + (discountOrder.tax || 0)).toFixed(2)}</span>
                    </div>
                    {discountOrder.totalDiscount && discountOrder.totalDiscount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Existing Discount:</span>
                        <span className="text-orange-600 dark:text-orange-400">-PKR {discountOrder.totalDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t-2 border-gray-300 dark:border-gray-500 pt-1 mt-1">
                      <span className="text-gray-900 dark:text-white font-bold">Current Total:</span>
                      <span className="text-green-600 dark:text-green-400 font-bold">PKR {(discountOrder.finalTotal || discountOrder.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Discount Amount (PKR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      const maxDiscount = discountOrder.finalTotal || discountOrder.total || 0;
                      if (!val || parseFloat(val) <= maxDiscount) {
                        setDiscountValue(val);
                      }
                    }}
                    max={discountOrder.finalTotal || discountOrder.total || 0}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter discount amount"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Maximum discount: PKR {(discountOrder.finalTotal || discountOrder.total || 0).toFixed(2)}
                  </p>
                  {discountOrder.originalTotal && discountOrder.originalTotal !== discountOrder.total && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      ℹ️ Note: This discount applies to your assigned category items only (PKR {discountOrder.total.toFixed(2)} of PKR {discountOrder.originalTotal.toFixed(2)} total order)
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Comments (Optional)
                  </label>
                  <textarea
                    value={discountComments}
                    onChange={(e) => setDiscountComments(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Reason for discount (e.g., volume discount, customer loyalty, etc.)"
                  />
                </div>

                {/* Preview */}
                {discountValue && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      💡 Discount Preview
                    </h5>
                    <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <div className="flex justify-between">
                        <span>Current Total:</span>
                        <span>PKR {(discountOrder.finalTotal || discountOrder.total || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span className="text-orange-600 dark:text-orange-400">-PKR {parseFloat(discountValue || "0").toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t border-blue-200 dark:border-blue-700 pt-1 mt-1">
                        <span>Final Total:</span>
                        <span className="text-green-600 dark:text-green-400">PKR {((discountOrder.finalTotal || discountOrder.total || 0) - parseFloat(discountValue || "0")).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowDiscountModal(false);
                    setDiscountOrder(null);
                    setDiscountValue("");
                    setDiscountComments("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-dark-3 dark:text-white dark:hover:bg-dark-4"
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

        {/* Message Display */}
        {message && (
          <div className="fixed top-4 right-4 z-50">
            <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
              message.includes('✅') 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
            }`}>
              {message}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
