"use client";

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/Auth/user-context";
import { getAuthHeaders } from "@/lib/auth";

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    _id: string;
    companyName: string;
    contactName: string;
  };
  status: string;
  total: number;
  finalTotal?: number;
  totalDiscount?: number;
  orderDate: string;
  createdAt: string;
  categories?: string[];
}

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
  ordersByCategory: Record<string, number>;
  topCustomers: Array<{ name: string; count: number; revenue: number }>;
  monthlyTrend: Array<{ month: string; orders: number; revenue: number }>;
}

export default function OrderReportsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    ordersByStatus: {},
    ordersByCategory: {},
    topCustomers: [],
    monthlyTrend: []
  });
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/auth/sign-in");
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, dateRange]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const queryParams = new URLSearchParams();
      queryParams.append('limit', '1000'); // Get all orders for reporting
      if (dateRange.from) queryParams.append('dateFrom', dateRange.from);
      if (dateRange.to) queryParams.append('dateTo', dateRange.to);

      const response = await fetch(`/api/orders?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const ordersList = Array.isArray(data) ? data : data.orders || [];
        
        // Filter orders by date range
        const filteredOrders = ordersList.filter((order: Order) => {
          if (!dateRange.from && !dateRange.to) {
            return true; // If no date range specified, show all
          }
          
          const orderDate = new Date(order.orderDate || order.createdAt);
          
          if (dateRange.from) {
            const fromDate = new Date(dateRange.from);
            fromDate.setHours(0, 0, 0, 0);
            if (orderDate < fromDate) return false;
          }
          
          if (dateRange.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999); // Include entire end date
            if (orderDate > toDate) return false;
          }
          
          return true;
        });

        setOrders(filteredOrders);
        calculateStats(filteredOrders);
      } else {
        console.error('Failed to fetch orders:', response.status);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ordersList: Order[]) => {
    // Define all possible order statuses (from Order model enum + delivered for compatibility)
    const allPossibleStatuses = [
      'pending',
      'approved',
      'rejected',
      'confirmed',
      'processing',
      'allocated',
      'dispatched',
      'shipped',
      'completed',
      'cancelled',
      'delivered' // Also include delivered even though it's not in enum (for compatibility)
    ];

    const newStats: OrderStats = {
      totalOrders: ordersList.length,
      totalRevenue: 0,
      averageOrderValue: 0,
      ordersByStatus: {},
      ordersByCategory: {},
      topCustomers: [],
      monthlyTrend: []
    };

    // Initialize all statuses with 0
    allPossibleStatuses.forEach(status => {
      newStats.ordersByStatus[status] = 0;
    });

    // Calculate revenue and status breakdown
    const customerMap: Record<string, { count: number; revenue: number }> = {};
    const monthlyData: Record<string, { orders: number; revenue: number }> = {};

    ordersList.forEach(order => {
      const orderTotal = order.finalTotal || order.total || 0;
      newStats.totalRevenue += orderTotal;

      // Orders by status
      const orderStatus = order.status || 'pending';
      if (newStats.ordersByStatus.hasOwnProperty(orderStatus)) {
        newStats.ordersByStatus[orderStatus] = (newStats.ordersByStatus[orderStatus] || 0) + 1;
      } else {
        // If status is not in predefined list, add it dynamically
        newStats.ordersByStatus[orderStatus] = (newStats.ordersByStatus[orderStatus] || 0) + 1;
      }

      // Orders by category
      if (order.categories && Array.isArray(order.categories)) {
        order.categories.forEach(cat => {
          newStats.ordersByCategory[cat] = (newStats.ordersByCategory[cat] || 0) + 1;
        });
      }

      // Top customers
      const customerName = order.customer?.companyName || 'Unknown';
      if (!customerMap[customerName]) {
        customerMap[customerName] = { count: 0, revenue: 0 };
      }
      customerMap[customerName].count += 1;
      customerMap[customerName].revenue += orderTotal;

      // Monthly trend
      const orderDate = new Date(order.orderDate || order.createdAt);
      const month = orderDate.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { orders: 0, revenue: 0 };
      }
      monthlyData[month].orders += 1;
      monthlyData[month].revenue += orderTotal;
    });

    // Calculate average
    newStats.averageOrderValue = newStats.totalOrders > 0 
      ? newStats.totalRevenue / newStats.totalOrders 
      : 0;

    // Convert customer map to sorted array
    newStats.topCustomers = Object.entries(customerMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 customers

    // Convert monthly data to sorted array
    newStats.monthlyTrend = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    setStats(newStats);
  };

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <ProtectedRoute requiredPermission="orders.read">
      <div className="w-full min-w-0">
        <Breadcrumb pageName="Order Reports" />

        {/* Header Section */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 xl:p-8">
            <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6">
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-blue-900 dark:text-white truncate">
                    Order Reports & Analytics
                  </h1>
                  <p className="text-blue-700 dark:text-blue-300 text-xs sm:text-sm lg:text-base mt-1 truncate">
                    Comprehensive order statistics and insights
                  </p>
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex-1">
                  <label className="block text-xs sm:text-sm font-medium text-blue-900 dark:text-white mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs sm:text-sm font-medium text-blue-900 dark:text-white mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={fetchOrders}
                    disabled={loading}
                    className="w-full sm:w-auto rounded-md sm:rounded-lg bg-blue-900 px-4 py-2 sm:px-6 sm:py-3 text-white font-medium hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/50 disabled:opacity-50 transition-all duration-200 text-xs sm:text-sm"
                  >
                    {loading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 xl:gap-6">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Total Orders</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {stats.totalOrders}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Total Revenue</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Average Order Value</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {formatCurrency(stats.averageOrderValue)}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Date Range</p>
                  <p className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reports Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-6 lg:mb-8">
          {/* Orders by Status */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-white mb-4 sm:mb-6">
              Orders by Status
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-blue-900 border-r-transparent"></div>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {Object.entries(stats.ordersByStatus).length > 0 ? (
                  Object.entries(stats.ordersByStatus)
                    .sort(([, a], [, b]) => {
                      // Sort by count (descending), but show all statuses
                      if (b !== a) return b - a;
                      // If counts are equal, sort alphabetically
                      return 0;
                    })
                    .map(([status, count]) => (
                      <div key={status} className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                        count > 0 
                          ? 'bg-gray-50 dark:bg-gray-700/50' 
                          : 'bg-gray-50/50 dark:bg-gray-700/30 opacity-60'
                      }`}>
                        <span className="text-sm sm:text-base font-medium text-blue-900 dark:text-white capitalize">
                          {status}
                        </span>
                        <span className={`text-sm sm:text-base font-bold ${
                          count > 0 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {count}
                        </span>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">No orders found</p>
                )}
              </div>
            )}
          </div>

          {/* Orders by Category */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-white mb-4 sm:mb-6">
              Orders by Category
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-blue-900 border-r-transparent"></div>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {Object.entries(stats.ordersByCategory).length > 0 ? (
                  Object.entries(stats.ordersByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <span className="text-sm sm:text-base font-medium text-blue-900 dark:text-white">
                          {category}
                        </span>
                        <span className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400">
                          {count}
                        </span>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">No category data available</p>
                )}
              </div>
            )}
          </div>
        </div>


        {/* Monthly Trend */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-white mb-4 sm:mb-6">
              Monthly Trend
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-blue-900 border-r-transparent"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-blue-900 dark:text-white">Month</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-blue-900 dark:text-white">Orders</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-blue-900 dark:text-white">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.monthlyTrend.length > 0 ? (
                      stats.monthlyTrend.map((trend) => (
                        <tr key={trend.month} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-blue-900 dark:text-white">
                            {new Date(trend.month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right text-blue-600 dark:text-blue-400">{trend.orders}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right font-bold text-blue-900 dark:text-white">{formatCurrency(trend.revenue)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-sm text-gray-600 dark:text-gray-400">No trend data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

