"use client";

import { useUser } from "@/components/Auth/user-context";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

interface Invoice {
  _id: string;
  invoiceNumber: string;
  orderNumber: string;
  customer: {
    _id: string;
    companyName: string;
    email: string;
  };
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  total: number;
  paidAmount: number;
  remainingAmount: number;
  invoiceDate: string;
  createdAt?: string;
  dueDate: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    finalAmount: number;
    discountAmount: number;
  }>;
}

interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  draftInvoices: number;
  sentInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
}

export default function InvoicesPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats>({
    totalInvoices: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    draftInvoices: 0,
    sentInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [filter, setFilter] = useState({
    status: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/sign-in");
    }
  }, [user, loading, router]);

  // Update date and time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      fetchInvoices();
      // For managers we calculate stats on the client from their filtered invoices
      if (!user.isManager) {
        fetchInvoiceStats();
      }
    }
  }, [user, filter]);

  // Recalculate stats for scoped users (customers and managers) when invoices change
  useEffect(() => {
    if (user?.isCustomer || user?.isManager) {
      const scopedInvoices = invoices;
      const calculatedStats = {
        totalInvoices: scopedInvoices.length,
        totalAmount: scopedInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        paidAmount: scopedInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0),
        pendingAmount: scopedInvoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0),
        draftInvoices: scopedInvoices.filter(inv => inv.status === 'draft').length,
        sentInvoices: scopedInvoices.filter(inv => inv.status === 'sent').length,
        paidInvoices: scopedInvoices.filter(inv => inv.status === 'paid').length,
        overdueInvoices: scopedInvoices.filter(inv => {
          if (inv.status === 'paid' || inv.status === 'cancelled') return false;
          const dueDate = new Date(inv.dueDate);
          return dueDate < new Date();
        }).length
      };
      
      console.log('   📊 Calculated scoped invoice stats (customer/manager):', calculatedStats);
      setInvoiceStats(calculatedStats);
    }
  }, [invoices, user?.isCustomer, user?.isManager]);

  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      console.log('🔍 Fetching invoices...');
      console.log('   User authenticated:', !!user);
      console.log('   Is customer:', user?.isCustomer);
      console.log('   User email:', user?.email);

      const queryParams = new URLSearchParams();
      if (filter.status) queryParams.append('status', filter.status);
      if (filter.search) queryParams.append('search', filter.search);
      if (filter.dateFrom) {
        queryParams.append('dateFrom', filter.dateFrom);
        console.log('   Date From filter:', filter.dateFrom);
      }
      if (filter.dateTo) {
        queryParams.append('dateTo', filter.dateTo);
        console.log('   Date To filter:', filter.dateTo);
      }
      // For customers and company admins, request all invoices (use high limit)
      if (user?.isCustomer || user?.isCompanyAdmin || user?.isSuperAdmin) {
        queryParams.append('limit', '1000');
      }
      
      console.log('   Query params:', queryParams.toString());

      const response = await fetch(`/api/invoices?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('   Response status:', response.status);
      console.log('   Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        const invoicesData = data.data || [];
        
        console.log('   Invoices fetched:', invoicesData.length);
        console.log('   Sample invoices:', invoicesData.slice(0, 2).map((inv: Invoice) => ({
          invoiceNumber: inv.invoiceNumber,
          orderNumber: inv.orderNumber,
          customer: inv.customer?.companyName || inv.customer
        })));
        
        // Defensive client-side filtering for customers (backup to backend filtering)
        // Only show invoices that belong to the current customer
        let filteredInvoices = invoicesData;
        if (user?.isCustomer) {
          // Try multiple ways to identify the customer
          const customerId = user?.customerProfile?.customer_id;
          const customerEmail = user?.email;
          
          filteredInvoices = invoicesData.filter((inv: Invoice) => {
            // Check if invoice customer matches current customer by ID
            if (customerId) {
              const invoiceCustomerId = typeof inv.customer === 'object' 
                ? inv.customer._id 
                : inv.customer;
              if (invoiceCustomerId === customerId || 
                  (typeof invoiceCustomerId === 'string' && customerId.toString() === invoiceCustomerId.toString())) {
                return true;
              }
            }
            
            // Fallback: Check by email if customer ID doesn't match
            if (customerEmail && typeof inv.customer === 'object' && inv.customer.email) {
              return inv.customer.email.toLowerCase() === customerEmail.toLowerCase();
            }
            
            return false;
          });
          
          console.log('   Customer filtering applied:', {
            customerId,
            customerEmail,
            totalInvoices: invoicesData.length,
            filteredInvoices: filteredInvoices.length
          });
        }
        
        setInvoices(filteredInvoices);
        console.log('📄 Invoices fetched successfully');
      } else {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("userType");
          localStorage.removeItem("userRole");
          router.push("/auth/sign-in");
          return;
        }
        console.error('Failed to fetch invoices:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchInvoiceStats = async () => {
    try {
      setLoadingStats(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      console.log('🔍 Fetching invoice stats...');
      console.log('   User authenticated:', !!user);
      console.log('   Is customer:', user?.isCustomer);
      console.log('   User email:', user?.email);

      const response = await fetch(`/api/invoices/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('   Stats response status:', response.status);
      console.log('   Stats response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        const stats = data.data || {};
        console.log('   Invoice stats fetched from backend:', stats);
        
        // For customers, we'll calculate stats from filtered invoices in a separate effect
        // For non-customers, use backend stats directly
        if (!user?.isCustomer) {
          setInvoiceStats({
            totalInvoices: stats.totalInvoices || 0,
            totalAmount: stats.totalAmount || 0,
            paidAmount: stats.paidAmount || 0,
            pendingAmount: stats.pendingAmount || 0,
            draftInvoices: stats.draftInvoices || 0,
            sentInvoices: stats.sentInvoices || 0,
            paidInvoices: stats.paidInvoices || 0,
            overdueInvoices: stats.overdueInvoices || 0
          });
        }
        // For customers, stats will be calculated from filtered invoices in useEffect
      } else {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("userType");
          localStorage.removeItem("userRole");
          router.push("/auth/sign-in");
          return;
        }
        console.error('Failed to fetch invoice stats:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching invoice stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleCreateInvoice = async (invoiceData: any) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Invoice created:', data);
        setShowCreateModal(false);
        fetchInvoices(); // Refresh the list
        fetchInvoiceStats(); // Refresh stats
      } else {
        const errorData = await response.json();
        console.error('Failed to create invoice:', errorData);
        alert('Failed to create invoice: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice');
    }
  };

  const handleUpdateInvoice = async (invoiceId: string, updateData: any) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/invoices?id=${invoiceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Invoice updated:', data);
        setShowEditModal(false);
        setSelectedInvoice(null);
        fetchInvoices(); // Refresh the list
        fetchInvoiceStats(); // Refresh stats
      } else {
        const errorData = await response.json();
        console.error('Failed to update invoice:', errorData);
        alert('Failed to update invoice: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Error updating invoice');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/invoices?id=${invoiceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ Invoice deleted');
        setShowDeleteModal(false);
        setSelectedInvoice(null);
        fetchInvoices(); // Refresh the list
        fetchInvoiceStats(); // Refresh stats
      } else {
        const errorData = await response.json();
        console.error('Failed to delete invoice:', errorData);
        alert('Failed to delete invoice: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Error deleting invoice');
    }
  };

  const handleDuplicateInvoice = async (invoiceId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/invoices/${invoiceId}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Invoice duplicated:', data);
        fetchInvoices(); // Refresh the list
        fetchInvoiceStats(); // Refresh stats
      } else {
        const errorData = await response.json();
        console.error('Failed to duplicate invoice:', errorData);
        alert('Failed to duplicate invoice: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error duplicating invoice:', error);
      alert('Error duplicating invoice');
    }
  };

  const handleUpdateStatus = async (invoiceId: string, status: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Invoice status updated:', data);
        setShowStatusModal(false);
        setSelectedInvoice(null);
        fetchInvoices(); // Refresh the list
        fetchInvoiceStats(); // Refresh stats
      } else {
        const errorData = await response.json();
        console.error('Failed to update status:', errorData);
        alert('Failed to update status: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  const handleAddPayment = async (invoiceId: string, amount: number, notes: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/invoices/${invoiceId}/payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, notes }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Payment added:', data);
        setShowPaymentModal(false);
        setSelectedInvoice(null);
        fetchInvoices(); // Refresh the list
        fetchInvoiceStats(); // Refresh stats
      } else {
        const errorData = await response.json();
        console.error('Failed to add payment:', errorData);
        alert('Failed to add payment: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Error adding payment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen">
      <Breadcrumb pageName="Invoices" />

      {/* Header Section */}
      <div className="mb-6">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20 p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-16 h-16 bg-blue-900 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-white mb-2">
                Invoice Management
              </h1>
              <p className="text-blue-700 dark:text-blue-300 text-sm sm:text-base">
                Manage invoices generated from approved orders
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Statistics & Date/Time */}
      <div className="mb-6">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20 p-6">
          {/* Date and Time */}
          <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Date & Time</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentDateTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-400">
                  {currentDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          {loadingStats ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading statistics...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Invoices */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Invoices</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                      {invoiceStats.totalInvoices}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Total Amount: {formatCurrency(invoiceStats.totalAmount)}
                </p>
              </div>

              {/* Draft Invoices */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/20 dark:to-gray-600/20 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Draft</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {invoiceStats.draftInvoices}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Paid Invoices */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">Paid</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                      {invoiceStats.paidInvoices}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  Amount: {formatCurrency(invoiceStats.paidAmount)}
                </p>
              </div>

              {/* Unpaid/Overdue Invoices */}
              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-4 border border-red-200 dark:border-red-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">Unpaid/Overdue</p>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-1">
                      {invoiceStats.sentInvoices + invoiceStats.overdueInvoices}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Pending: {formatCurrency(invoiceStats.pendingAmount)} | Overdue: {invoiceStats.overdueInvoices}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col gap-4">
            {/* First Row: Search, Status, Create Button */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={filter.search}
                  onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={filter.status}
                  onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 text-blue-900"
                >
                  <option value="" className="text-blue-900 dark:text-white">All Status</option>
                  <option value="draft" className="text-blue-900 dark:text-white">Draft</option>
                  <option value="sent" className="text-blue-900 dark:text-white">Sent</option>
                  <option value="paid" className="text-blue-900 dark:text-white">Paid</option>
                  <option value="overdue" className="text-blue-900 dark:text-white">Overdue</option>
                  <option value="cancelled" className="text-blue-900 dark:text-white">Cancelled</option>
                </select>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Invoice
              </button>
            </div>
            
            {/* Second Row: Date Range Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 sm:flex-none sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Invoice Date From
                </label>
                <input
                  type="date"
                  value={filter.dateFrom}
                  onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full sm:w-48 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
                />
              </div>
              <div className="flex-1 sm:flex-none sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Invoice Date To
                </label>
                <input
                  type="date"
                  value={filter.dateTo}
                  onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full sm:w-48 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
                />
              </div>
              {(filter.dateFrom || filter.dateTo) && (
                <button
                  onClick={() => setFilter(prev => ({ ...prev, dateFrom: '', dateTo: '' }))}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Dates
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        {loadingInvoices ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading invoices...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center p-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-blue-900 dark:text-white mb-2">No invoices found</h3>
            <p className="text-gray-600 dark:text-gray-400">Invoices will appear here when orders are approved.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 dark:text-white uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 dark:text-white uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 dark:text-white uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 dark:text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 dark:text-white uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 dark:text-white uppercase tracking-wider">
                    Invoice Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 dark:text-white uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 dark:text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {invoices.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-900 dark:text-white">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-900 dark:text-white">
                      {invoice.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-blue-900 dark:text-white">
                          {invoice.customer.companyName}
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          {invoice.customer.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-900 dark:text-white">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-900 dark:text-white">
                      {formatDate(invoice.invoiceDate || invoice.createdAt || new Date().toISOString())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-900 dark:text-white">
                      {invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/invoices/${invoice._id}`)}
                          className="text-blue-900 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowEditModal(true);
                          }}
                          className="text-blue-900 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDuplicateInvoice(invoice._id)}
                          className="text-blue-900 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowStatusModal(true);
                          }}
                          className="text-blue-900 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Status
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowPaymentModal(true);
                          }}
                          className="text-blue-900 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Payment
                        </button>
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <CreateInvoiceModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateInvoice}
        />
      )}

      {/* Edit Invoice Modal */}
      {showEditModal && selectedInvoice && (
        <EditInvoiceModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowEditModal(false);
            setSelectedInvoice(null);
          }}
          onSubmit={handleUpdateInvoice}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedInvoice && (
        <DeleteInvoiceModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedInvoice(null);
          }}
          onConfirm={handleDeleteInvoice}
        />
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedInvoice && (
        <StatusUpdateModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedInvoice(null);
          }}
          onSubmit={handleUpdateStatus}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
          onSubmit={handleAddPayment}
        />
      )}
    </div>
  );
}

// Create Invoice Modal Component
function CreateInvoiceModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    items: [{ productName: '', quantity: 1, unitPrice: 0, finalAmount: 0 }],
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-white">Create New Invoice</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-blue-900 dark:text-white">Customer Name</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-blue-900 dark:text-white">Customer Email</label>
            <input
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-blue-900 dark:text-white">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-blue-900 dark:text-white hover:text-blue-800 dark:hover:text-blue-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
            >
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Invoice Modal Component
function EditInvoiceModal({ invoice, onClose, onSubmit }: { invoice: Invoice; onClose: () => void; onSubmit: (id: string, data: any) => void }) {
  const [formData, setFormData] = useState({
    customerName: invoice.customer.companyName,
    customerEmail: invoice.customer.email,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(invoice._id, formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-white">Edit Invoice</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-blue-900 dark:text-white">Customer Name</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-blue-900 dark:text-white">Customer Email</label>
            <input
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-blue-900 dark:text-white">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-blue-900 dark:text-white hover:text-blue-800 dark:hover:text-blue-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
            >
              Update Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteInvoiceModal({ invoice, onClose, onConfirm }: { invoice: Invoice; onClose: () => void; onConfirm: (id: string) => void }) {
  const handleConfirm = () => {
    onConfirm(invoice._id);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-white">Delete Invoice</h2>
        <p className="mb-6 text-blue-900 dark:text-white">
          Are you sure you want to delete invoice <strong className="text-blue-900 dark:text-white">{invoice.invoiceNumber}</strong>? 
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-blue-900 dark:text-white hover:text-blue-800 dark:hover:text-blue-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

// Status Update Modal Component
function StatusUpdateModal({ invoice, onClose, onSubmit }: { invoice: Invoice; onClose: () => void; onSubmit: (id: string, status: string) => void }) {
  const [status, setStatus] = useState(invoice.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(invoice._id, status);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-white">Update Invoice Status</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-blue-900 dark:text-white">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 text-blue-900"
            >
              <option value="draft" className="text-blue-900 dark:text-white">Draft</option>
              <option value="sent" className="text-blue-900 dark:text-white">Sent</option>
              <option value="paid" className="text-blue-900 dark:text-white">Paid</option>
              <option value="overdue" className="text-blue-900 dark:text-white">Overdue</option>
              <option value="cancelled" className="text-blue-900 dark:text-white">Cancelled</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-blue-900 dark:text-white hover:text-blue-800 dark:hover:text-blue-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
            >
              Update Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Payment Modal Component
function PaymentModal({ invoice, onClose, onSubmit }: { invoice: Invoice; onClose: () => void; onSubmit: (id: string, amount: number, notes: string) => void }) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(invoice._id, parseFloat(amount), notes);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-white">Add Payment</h2>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
          Invoice: {invoice.invoiceNumber} | Total: {formatCurrency(invoice.total)} | 
          Paid: {formatCurrency(invoice.paidAmount)} | Remaining: {formatCurrency(invoice.remainingAmount)}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-blue-900 dark:text-white">Payment Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={invoice.remainingAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-blue-900 dark:text-white">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-blue-900 dark:text-white hover:text-blue-800 dark:hover:text-blue-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
            >
              Add Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
