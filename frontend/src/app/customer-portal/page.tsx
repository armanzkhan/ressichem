'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/Auth/user-context';
import CustomerLayout from '../../components/Layouts/CustomerLayout';
import { formatPKR } from '@/utils/currency';

interface Customer {
  _id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  assignedManager?: {
    manager_id?: any;
    assignedBy?: any;
  };
}

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  total: number; // Backend uses 'total' not 'totalAmount'
  totalAmount?: number; // Keep for backward compatibility
  createdAt: string;
  items?: any[];
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  orderNumber: string;
  status: string;
  total: number; // Backend uses 'total' not 'totalAmount'
  totalAmount?: number; // Keep for backward compatibility
  createdAt: string;
  invoiceDate?: string;
  dueDate?: string;
}

interface Ledger {
  customerId: string;
  balance: number;
  transactions?: any[];
}

interface OrderStats {
  total: number;
  pending: number;
  approved: number;
  completed: number;
  cancelled: number;
}

export default function CustomerPortal() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [orderStats, setOrderStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const { user } = useUser();
  const routerNav = useRouter();

  // Update date and time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      if (!token) {
        window.location.href = "/auth/sign-in";
        return;
      }

      // Fetch customer dashboard data
      const dashboardResponse = await fetch('/api/customers/dashboard', {
        headers: getAuthHeaders(),
      });

      // Handle token expiry (401/403)
      if (dashboardResponse.status === 401 || dashboardResponse.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userType");
        localStorage.removeItem("userRole");
        window.location.href = "/auth/sign-in";
        return;
      }

      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        console.log('Dashboard data:', dashboardData);
        
        // Set customer info
        if (dashboardData.customer) {
          setCustomer(dashboardData.customer);
        }

        // Set order stats
        if (dashboardData.stats) {
          setOrderStats({
            total: dashboardData.stats.totalOrders || 0,
            pending: dashboardData.stats.pendingOrders || 0,
            approved: dashboardData.stats.approvedOrders || 0,
            completed: 0,
            cancelled: 0
          });
        }

        // Fetch all orders
        const ordersResponse = await fetch('/api/customers/orders?limit=1000&page=1', {
          headers: getAuthHeaders(),
        });

        // Handle token expiry (401/403)
        if (ordersResponse.status === 401 || ordersResponse.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("userType");
          localStorage.removeItem("userRole");
          window.location.href = "/auth/sign-in";
          return;
        }

        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          const ordersList = Array.isArray(ordersData) ? ordersData : (ordersData.orders || []);
          
          // Map orders to ensure totalAmount is set from total (backend uses 'total')
          const mappedOrders = ordersList.map((order: any) => ({
            ...order,
            totalAmount: order.total || order.totalAmount || 0, // Use 'total' field from backend
            createdAt: order.createdAt || order.orderDate || new Date().toISOString()
          }));
          
          setOrders(mappedOrders.slice(0, 10)); // Show last 10 orders

          // Calculate order stats from actual orders
          const stats = {
            total: mappedOrders.length,
            pending: mappedOrders.filter((o: Order) => o.status === 'pending').length,
            approved: mappedOrders.filter((o: Order) => o.status === 'approved').length,
            completed: mappedOrders.filter((o: Order) => o.status === 'completed' || o.status === 'delivered').length,
            cancelled: mappedOrders.filter((o: Order) => o.status === 'cancelled').length
          };
          setOrderStats(stats);
        }

        // Fetch customer ledger if customer ID is available
        if (dashboardData.customer?._id) {
          try {
            const ledgerResponse = await fetch(`/api/customer-ledger/${dashboardData.customer._id}/ledger?limit=50&page=1`, {
              headers: getAuthHeaders(),
            });

            // Handle token expiry (401/403)
            if (ledgerResponse.status === 401 || ledgerResponse.status === 403) {
              localStorage.removeItem("token");
              localStorage.removeItem("refreshToken");
              localStorage.removeItem("userType");
              localStorage.removeItem("userRole");
              window.location.href = "/auth/sign-in";
              return;
            }

            if (ledgerResponse.ok) {
              const ledgerData = await ledgerResponse.json();
              console.log('💰 Ledger API response:', ledgerData);
              
              // The response structure is: { success: true, data: { ledger, transactions, pagination } }
              if (ledgerData.success && ledgerData.data) {
                const ledgerInfo = ledgerData.data.ledger || ledgerData.data;
                const transactions = ledgerData.data.transactions || [];
                
                // Balance is stored as currentBalance in the ledger model
                const balance = ledgerInfo.currentBalance || ledgerInfo.balance || 0;
                
                console.log('💰 Ledger balance:', balance);
                console.log('💰 Transactions count:', transactions.length);
                
                setLedger({
                  customerId: dashboardData.customer._id,
                  balance: balance,
                  transactions: transactions
                });
              }
            }
          } catch (ledgerError) {
            console.error('Error fetching ledger:', ledgerError);
          }
        }

        // Fetch invoices
        const invoicesResponse = await fetch('/api/invoices?limit=50', {
          headers: getAuthHeaders(),
        });

        // Handle token expiry (401/403)
        if (invoicesResponse.status === 401 || invoicesResponse.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("userType");
          localStorage.removeItem("userRole");
          window.location.href = "/auth/sign-in";
          return;
        }

        if (invoicesResponse.ok) {
          const invoicesData = await invoicesResponse.json();
          console.log('🧾 Invoices API response:', invoicesData);
          
          const invoicesList = invoicesData.data || invoicesData.invoices || [];
          console.log('🧾 Invoices list:', invoicesList.length);
          
          // Map invoices to ensure totalAmount is set from total
          const mappedInvoices = invoicesList.map((inv: any) => ({
            ...inv,
            totalAmount: inv.total || inv.totalAmount || 0, // Use 'total' field from backend
            createdAt: inv.invoiceDate || inv.createdAt || new Date().toISOString()
          }));
          
          console.log('🧾 Mapped invoices:', mappedInvoices.slice(0, 3).map((i: any) => ({
            invoiceNumber: i.invoiceNumber,
            total: i.total,
            totalAmount: i.totalAmount
          })));
          
          setInvoices(mappedInvoices.slice(0, 10)); // Show last 10 invoices
        }

        setMessage('✅ Dashboard loaded successfully!');
      } else {
        const errorData = await dashboardResponse.json().catch(() => ({ message: 'Unknown error' }));
        setMessage(`❌ Failed to load dashboard: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setMessage('❌ Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Loading Dashboard...</h2>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.startsWith('✅') 
              ? 'bg-green-100 border border-green-400 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300' 
              : 'bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300'
          }`}>
            {message}
          </div>
        )}

        {/* Header with Date and Time */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome, {customer?.contactName || customer?.companyName || 'Customer'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {customer?.companyName && customer.companyName}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentDateTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <div className="text-lg text-gray-600 dark:text-gray-400">
                {currentDateTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information Card */}
        {customer && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">👤</span>
              Customer Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Company Name</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{customer.companyName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Contact Name</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{customer.contactName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{customer.email}</p>
              </div>
              {customer.phone && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{customer.phone}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Statistics */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="mr-2">📊</span>
            Order Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{orderStats.total}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{orderStats.pending}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Approved</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{orderStats.approved}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{orderStats.completed}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cancelled</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{orderStats.cancelled}</p>
            </div>
          </div>
        </div>

        {/* Customer Ledger */}
        {ledger && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">💰</span>
              Account Ledger
            </h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Balance</p>
              <p className={`text-3xl font-bold ${ledger.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatPKR(ledger.balance)}
              </p>
            </div>
            {ledger.transactions && ledger.transactions.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Recent Transactions</p>
                <div className="space-y-2">
                  {ledger.transactions.slice(0, 5).map((transaction: any, index: number) => {
                    // Handle different transaction structures
                    const transactionType = transaction.transactionType || transaction.type || 'Transaction';
                    const transactionDate = transaction.transactionDate || transaction.date || transaction.createdAt;
                    // Transactions can have debitAmount/creditAmount or netAmount or amount
                    const amount = transaction.netAmount || transaction.amount || (transaction.debitAmount || 0) - (transaction.creditAmount || 0);
                    const balance = transaction.balance || 0;
                    
                    return (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {transactionType}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {transaction.referenceNumber || transaction.referenceId || ''}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(transactionDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {amount >= 0 ? '+' : ''}{formatPKR(Math.abs(amount))}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Balance: {formatPKR(balance)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Orders and Invoices Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2">📋</span>
                Recent Orders
              </h2>
              <button
                onClick={() => routerNav.push('/customer-orders')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View All
              </button>
            </div>
            {orders.length > 0 ? (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => routerNav.push(`/orders/${order._id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{order.orderNumber}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Total: {formatPKR(order.totalAmount || order.total || 0)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No orders found</p>
              </div>
            )}
          </div>

          {/* Recent Invoices */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2">🧾</span>
                Recent Invoices
              </h2>
              <button
                onClick={() => routerNav.push('/invoices')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View All
              </button>
            </div>
            {invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div
                    key={invoice._id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => routerNav.push(`/invoices/${invoice._id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Order: {invoice.orderNumber}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(invoice.createdAt || invoice.invoiceDate || new Date()).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        Amount: {formatPKR(invoice.totalAmount || invoice.total || 0)}
                      </p>
                      {invoice.dueDate && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Due: {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No invoices found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}

