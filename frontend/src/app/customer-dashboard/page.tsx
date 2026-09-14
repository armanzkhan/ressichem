'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import realtimeService from '../../services/realtimeService';

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

interface Customer {
  _id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  assignedManager: {
    manager_id: {
      _id: string;
      user_id: string;
      assignedCategories: Array<{
        category: string;
        isActive: boolean;
      }>;
      managerLevel: string;
    };
    assignedBy: {
      firstName: string;
      lastName: string;
      email: string;
    };
    assignedAt: string;
    isActive: boolean;
    notes: string;
  };
  assignedManagers?: Array<{
    manager_id: {
      _id: string;
      user_id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      assignedCategories: Array<{
        category: string;
        isActive: boolean;
      }> | string[];
      managerLevel: string;
    };
    assignedBy?: {
      firstName: string;
      lastName: string;
      email: string;
    };
    assignedAt: string;
    isActive: boolean;
    notes?: string;
  }>;
  preferences: {
    preferredCategories: string[];
    notificationPreferences: {
      orderUpdates: boolean;
      statusChanges: boolean;
      newProducts: boolean;
    };
  };
  status: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: Array<{
    product: {
      name: string;
      category: string | { mainCategory: string };
    };
    quantity: number;
    price: number;
  }>;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string | { mainCategory: string; subCategory?: string };
  sku: string;
  isActive: boolean;
}

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  availableProducts: number;
}

export default function CustomerDashboard() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    availableProducts: 0
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isClient, setIsClient] = useState(false);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const router = useRouter();
  
  // Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCarouselIndex((prev) => (prev + 1) % carouselImages.length);
    }, 5000); // Change image every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    // Check if user is logged in as customer
    const token = localStorage.getItem("token");
    const userType = localStorage.getItem("userType");
    const userRole = localStorage.getItem("userRole");
    
    console.log('🔍 Customer Dashboard - Auth Check:', { 
      token: !!token, 
      userType, 
      userRole,
      tokenLength: token?.length || 0
    });
    
    if (!token) {
      console.log('❌ No token found, redirecting to login');
      router.push("/customer-login");
      return;
    }
    
    if (userType !== 'customer' && userRole !== 'customer') {
      console.log('❌ Not a customer, redirecting to login');
      console.log('Expected: userType="customer" or userRole="customer"');
      console.log('Actual: userType="' + userType + '", userRole="' + userRole + '"');
      router.push("/customer-login");
      return;
    }
    
    console.log('✅ Authentication passed, fetching dashboard data');
    fetchDashboardData();
    
    // Set up real-time listeners
    realtimeService.on('order_status_update', (data: any) => {
      console.log('📱 Real-time order status update:', data);
      setMessage(`Order ${data.order.orderNumber} status updated to ${data.order.status}`);
      fetchDashboardData(); // Refresh dashboard data
    });

    realtimeService.on('new_order', (data: any) => {
      console.log('📱 New order notification:', data);
    });

    // Cleanup listeners on unmount
    return () => {
      realtimeService.off('order_status_update');
      realtimeService.off('new_order');
    };
  }, [isClient, router]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log('❌ No token in fetchDashboardData, redirecting to sign-in');
        router.push("/auth/sign-in");
        return;
      }

      console.log('🔍 Fetching dashboard data with token length:', token.length);
      
      const response = await fetch('/api/customers/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Dashboard API response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Dashboard data received:', {
          customer: data.customer ? 'Found' : 'Not found',
          recentOrders: data.recentOrders?.length || 0,
          stats: data.stats
        });
        setCustomer(data.customer);
        setRecentOrders(data.recentOrders || []);
        setStats(data.stats);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch dashboard data:', errorData);
        setMessage("Failed to load dashboard data: " + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Dashboard fetch error:', error);
      setMessage("Error loading dashboard: " + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/customers/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableProducts(data.products || []);
      }
    } catch (error) {
      console.error('Products fetch error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Customer Not Found</h2>
          <p className="text-gray-600">Please contact support if this issue persists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Customer Dashboard</h1>
              <p className="text-gray-600">Welcome back, {customer.contactName}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Company</p>
                <p className="font-semibold">{customer.companyName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {customer.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message && (
          <div className="mb-6 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
            {message}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setActiveTab('products');
                fetchProducts();
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Products ({stats.availableProducts})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Orders ({stats.totalOrders})
            </button>
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.totalOrders}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Pending Orders</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.pendingOrders}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Approved Orders</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.approvedOrders}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Available Products</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.availableProducts}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Managers Info */}
            {(customer.assignedManagers && customer.assignedManagers.length > 0) || customer.assignedManager ? (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Your Assigned Manager{customer.assignedManagers && customer.assignedManagers.length > 1 ? 's' : ''}
                  </h3>
                  
                  {/* Display all assigned managers from assignedManagers array */}
                  {customer.assignedManagers && customer.assignedManagers.length > 0 ? (
                    <div className="space-y-4">
                      {customer.assignedManagers.map((am, index) => {
                        const manager = am.manager_id;
                        const managerName = manager.firstName && manager.lastName 
                          ? `${manager.firstName} ${manager.lastName}`
                          : manager.email || manager.user_id || 'Unknown Manager';
                        const categories = Array.isArray(manager.assignedCategories)
                          ? manager.assignedCategories.map((cat: any) => typeof cat === 'string' ? cat : (cat.category || cat))
                          : [];
                        
                        return (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Manager Details</h4>
                                <p className="mt-1 text-sm font-medium text-gray-900">{managerName}</p>
                                {manager.email && (
                                  <p className="text-sm text-gray-500">{manager.email}</p>
                                )}
                                <p className="text-sm text-gray-500">Level: {manager.managerLevel || 'N/A'}</p>
                                {am.assignedAt && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    Assigned: {new Date(am.assignedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Assigned Categories</h4>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {categories.length > 0 ? (
                                    categories.map((category: string, catIndex: number) => (
                                      <span
                                        key={catIndex}
                                        className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                                      >
                                        {category}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-gray-400">No categories assigned</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : customer.assignedManager ? (
                    // Fallback to single assignedManager for backward compatibility
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Manager Details</h4>
                        <p className="mt-1 text-sm text-gray-900">
                          {customer.assignedManager.assignedBy?.firstName} {customer.assignedManager.assignedBy?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{customer.assignedManager.assignedBy?.email}</p>
                        <p className="text-sm text-gray-500">Level: {customer.assignedManager.manager_id?.managerLevel}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Assigned Categories</h4>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {customer.assignedManager.manager_id?.assignedCategories?.map((category: any, index: number) => (
                            <span
                              key={index}
                              className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                            >
                              {typeof category === 'string' ? category : category.category}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Your Assigned Manager</h3>
                  <p className="text-sm text-gray-500">No manager has been assigned to your account yet.</p>
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Orders</h3>
                {recentOrders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentOrders.map((order) => (
                          <tr key={order._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {order.orderNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(order.total)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(order.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">No recent orders found.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Available Products ({availableProducts.length})
              </h3>
              {availableProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableProducts.map((product) => (
                    <div key={product._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-lg font-bold text-primary">{formatCurrency(product.price)}</span>
                        <span className="text-sm text-gray-500">SKU: {product.sku}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Stock: {product.stock}
                        </span>
                        <span className="text-sm text-gray-500">
                          {typeof product.category === 'string' ? product.category : product.category?.mainCategory}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No products available for your assigned categories.</p>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Your Orders</h3>
              <p className="text-gray-500">Order management functionality will be implemented here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
