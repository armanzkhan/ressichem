"use client";

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/Auth/user-context";
import { getAuthHeaders, handleAuthError } from "@/lib/auth";
import { toast } from "sonner";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  orderNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  totalDiscount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  customer: {
    _id: string;
    companyName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface InvoiceStats {
  totalInvoices: number;
  totalRevenue: number;
  averageInvoiceValue: number;
  totalPaid: number;
  totalPending: number;
  invoicesByStatus: Record<string, number>;
  invoicesByPaymentStatus: Record<string, number>;
  monthlyTrend: Array<{
    month: string;
    invoices: number;
    revenue: number;
    paid: number;
  }>;
}

function InvoicesReportsPageContent() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoices: 0,
    totalRevenue: 0,
    averageInvoiceValue: 0,
    totalPaid: 0,
    totalPending: 0,
    invoicesByStatus: {},
    invoicesByPaymentStatus: {},
    monthlyTrend: [],
  });
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/auth/sign-in");
    }
  }, [user, userLoading, router]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        handleAuthError(401, "Please log in to view reports");
        return;
      }

      const queryParams = new URLSearchParams();
      if (dateRange.from) queryParams.append('dateFrom', dateRange.from);
      if (dateRange.to) queryParams.append('dateTo', dateRange.to);
      queryParams.append('limit', '5000'); // Fetch enough invoices for reports

      const response = await fetch(`/api/invoices?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const fetchedInvoices = Array.isArray(data) ? data : data.invoices || data.data || [];
        
        // Filter invoices by date range
        const filteredInvoices = fetchedInvoices.filter((invoice: Invoice) => {
          if (!dateRange.from && !dateRange.to) {
            return true; // If no date range specified, show all
          }
          
          const invoiceDate = new Date(invoice.invoiceDate || invoice.createdAt);
          
          if (dateRange.from) {
            const fromDate = new Date(dateRange.from);
            fromDate.setHours(0, 0, 0, 0);
            if (invoiceDate < fromDate) return false;
          }
          
          if (dateRange.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999); // Include entire end date
            if (invoiceDate > toDate) return false;
          }
          
          return true;
        });

        setInvoices(filteredInvoices);
        calculateStats(filteredInvoices);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to fetch invoices: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Error fetching invoices for reports');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (invoicesList: Invoice[]) => {
    // Define all possible invoice statuses
    const allPossibleStatuses = [
      'draft',
      'sent',
      'paid',
      'overdue',
      'cancelled'
    ];

    // Define all possible payment statuses
    const allPossiblePaymentStatuses = [
      'unpaid',
      'partial',
      'paid'
    ];

    const newStats: InvoiceStats = {
      totalInvoices: invoicesList.length,
      totalRevenue: 0,
      averageInvoiceValue: 0,
      totalPaid: 0,
      totalPending: 0,
      invoicesByStatus: {},
      invoicesByPaymentStatus: {},
      monthlyTrend: []
    };

    // Initialize all statuses with 0
    allPossibleStatuses.forEach(status => {
      newStats.invoicesByStatus[status] = 0;
    });

    allPossiblePaymentStatuses.forEach(status => {
      newStats.invoicesByPaymentStatus[status] = 0;
    });

    const monthlyData: Record<string, { invoices: number; revenue: number; paid: number }> = {};

    invoicesList.forEach(invoice => {
      const invoiceTotal = invoice.total || 0;
      const invoicePaid = invoice.paidAmount || 0;
      const invoicePending = invoice.remainingAmount || (invoiceTotal - invoicePaid);

      newStats.totalRevenue += invoiceTotal;
      newStats.totalPaid += invoicePaid;
      newStats.totalPending += invoicePending;

      // Invoices by status
      const invoiceStatus = invoice.status || 'draft';
      if (newStats.invoicesByStatus.hasOwnProperty(invoiceStatus)) {
        newStats.invoicesByStatus[invoiceStatus] = (newStats.invoicesByStatus[invoiceStatus] || 0) + 1;
      } else {
        newStats.invoicesByStatus[invoiceStatus] = (newStats.invoicesByStatus[invoiceStatus] || 0) + 1;
      }

      // Invoices by payment status
      const paymentStatus = invoice.paymentStatus || 'unpaid';
      if (newStats.invoicesByPaymentStatus.hasOwnProperty(paymentStatus)) {
        newStats.invoicesByPaymentStatus[paymentStatus] = (newStats.invoicesByPaymentStatus[paymentStatus] || 0) + 1;
      } else {
        newStats.invoicesByPaymentStatus[paymentStatus] = (newStats.invoicesByPaymentStatus[paymentStatus] || 0) + 1;
      }

      // Monthly trend
      const invoiceDate = new Date(invoice.invoiceDate || invoice.createdAt);
      const month = invoiceDate.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { invoices: 0, revenue: 0, paid: 0 };
      }
      monthlyData[month].invoices++;
      monthlyData[month].revenue += invoiceTotal;
      monthlyData[month].paid += invoicePaid;
    });

    // Calculate average
    newStats.averageInvoiceValue = newStats.totalInvoices > 0 
      ? newStats.totalRevenue / newStats.totalInvoices 
      : 0;

    // Convert monthly data to sorted array
    newStats.monthlyTrend = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    setStats(newStats);
  };

  useEffect(() => {
    if (user) { // Only fetch if user is logged in
      fetchInvoices();
    }
  }, [user, dateRange]); // Refetch when user or dateRange changes

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <ProtectedRoute requiredPermission="invoices.read">
      <div className="w-full min-w-0">
        <Breadcrumb pageName="Invoice Reports" />

        {/* Header Section */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 xl:p-8">
            <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6">
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-blue-900 dark:text-white truncate">
                    Invoice Reports
                  </h1>
                  <p className="text-blue-700 dark:text-blue-300 text-xs sm:text-sm lg:text-base mt-1 truncate">
                    Comprehensive insights into your invoice performance.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-end">
                <div className="flex-1 min-w-0">
                  <label htmlFor="dateFrom" className="block text-xs sm:text-sm font-medium text-blue-900 dark:text-white mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    id="dateFrom"
                    name="from"
                    value={dateRange.from}
                    onChange={handleDateChange}
                    className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label htmlFor="dateTo" className="block text-xs sm:text-sm font-medium text-blue-900 dark:text-white mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    id="dateTo"
                    name="to"
                    value={dateRange.to}
                    onChange={handleDateChange}
                    className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                  />
                </div>
                <button
                  onClick={fetchInvoices}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg sm:rounded-xl border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-center font-medium text-gray-700 hover:border-blue-900 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-blue-400 disabled:opacity-50 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base"
                >
                  <svg className={`mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Refresh</span>
                  <span className="sm:hidden">↻</span>
                </button>
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
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Total Invoices</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {stats.totalInvoices}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">Invoices in selected period</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">Total invoice amount</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Total Paid</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {formatCurrency(stats.totalPaid)}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">Amount received</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-600 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Total Pending</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                    {formatCurrency(stats.totalPending)}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">Amount outstanding</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-orange-600 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices by Status */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-white mb-4 sm:mb-6">
              Invoices by Status
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-blue-900 border-r-transparent"></div>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {Object.entries(stats.invoicesByStatus).length > 0 ? (
                  Object.entries(stats.invoicesByStatus)
                    .sort(([, a], [, b]) => {
                      if (b !== a) return b - a;
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
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">No status data available</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Invoices by Payment Status */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-white mb-4 sm:mb-6">
              Invoices by Payment Status
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-blue-900 border-r-transparent"></div>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {Object.entries(stats.invoicesByPaymentStatus).length > 0 ? (
                  Object.entries(stats.invoicesByPaymentStatus)
                    .sort(([, a], [, b]) => {
                      if (b !== a) return b - a;
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
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">No payment status data available</p>
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
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-blue-900 dark:text-white">Invoices</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-blue-900 dark:text-white">Revenue</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-blue-900 dark:text-white">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.monthlyTrend.length > 0 ? (
                      stats.monthlyTrend.map((trend, index) => (
                        <tr key={trend.month} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-blue-900 dark:text-white">{trend.month}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right text-blue-600 dark:text-blue-400">{trend.invoices}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right font-bold text-blue-900 dark:text-white">{formatCurrency(trend.revenue)}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right text-green-600 dark:text-green-400">{formatCurrency(trend.paid)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-sm text-gray-600 dark:text-gray-400">No monthly trend data available</td>
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

// Wrap the component with Suspense
export default function InvoicesReportsPage() {
  return (
    <Suspense>
      <InvoicesReportsPageContent />
    </Suspense>
  );
}

