'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/lib/auth';
import { useUser } from '@/components/Auth/user-context';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { CustomerLedger, LedgerSummary, AgingReport } from '@/types/customerLedger';

const CustomerLedgerPage = () => {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [ledgers, setLedgers] = useState<CustomerLedger[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [agingReport, setAgingReport] = useState<AgingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({
    status: '',
    minBalance: ''
  });

  useEffect(() => {
    console.log('🔍 Customer Ledger useEffect triggered');
    console.log('🔍 User:', user);
    console.log('🔍 UserLoading:', userLoading);
    console.log('🔍 Filter:', filter);
    
    if (user && !userLoading) {
      console.log('🔍 Calling fetchData...');
      fetchData();
    } else {
      console.log('🔍 Not calling fetchData - user:', !!user, 'userLoading:', userLoading);
    }
  }, [user, userLoading, filter]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('🔍 Loading timeout reached, forcing loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching customer ledger data...');
      
      // Fetch all customer ledgers
      const ledgersResponse = await fetch('/api/customer-ledger', {
        method: 'GET',
        headers: getAuthHeaders()
      });

      console.log('🔍 Ledgers response status:', ledgersResponse.status);
      console.log('🔍 Ledgers response ok:', ledgersResponse.ok);

      if (ledgersResponse.ok) {
        const ledgersData = await ledgersResponse.json();
        console.log('🔍 Ledgers data received:', ledgersData);
        setLedgers(ledgersData.data || []);
        console.log(`✅ Fetched ${ledgersData.data?.length || 0} customer ledgers`);
      } else {
        const errorData = await ledgersResponse.json();
        console.error('❌ Failed to fetch customer ledgers:', errorData);
        setMessage(`Failed to fetch customer ledgers: ${errorData.message || 'Unknown error'}`);
        // Set empty data to show the page
        setLedgers([]);
      }

      // Fetch summary
      const summaryResponse = await fetch('/api/customer-ledger/summary', {
        method: 'GET',
        headers: getAuthHeaders()
      });

      console.log('🔍 Summary response status:', summaryResponse.status);

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        console.log('🔍 Summary data received:', summaryData);
        setSummary(summaryData.data);
        console.log('✅ Fetched customer ledger summary');
      } else {
        console.log('⚠️ Summary fetch failed, continuing without summary');
      }

      // Fetch aging report
      const agingResponse = await fetch('/api/customer-ledger/aging', {
        method: 'GET',
        headers: getAuthHeaders()
      });

      console.log('🔍 Aging response status:', agingResponse.status);

      if (agingResponse.ok) {
        const agingData = await agingResponse.json();
        console.log('🔍 Aging data received:', agingData);
        setAgingReport(agingData.data);
        console.log('✅ Fetched aging report');
      } else {
        console.log('⚠️ Aging fetch failed, continuing without aging report');
      }

    } catch (error) {
      console.error('❌ Error fetching customer ledger data:', error);
      setMessage('Error fetching customer ledger data');
      // Set empty data to show the page
      setLedgers([]);
    } finally {
      console.log('🔍 Setting loading to false');
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      case 'Suspended': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case 'Closed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      case 'On Hold': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance === 0) return 'text-green-600 dark:text-green-400';
    if (balance > 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  console.log('🔍 Render check - userLoading:', userLoading, 'loading:', loading);
  console.log('🔍 User:', user);
  console.log('🔍 Ledgers count:', ledgers.length);
  console.log('🔍 Message:', message);
  
  if (userLoading || loading) {
    console.log('🔍 Showing loading screen - userLoading:', userLoading, 'loading:', loading);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-900 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {userLoading ? 'Loading user...' : 'Loading customer ledger...'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Debug: userLoading={userLoading ? 'true' : 'false'}, loading={loading ? 'true' : 'false'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            User: {user ? 'Present' : 'Missing'}, Ledgers: {ledgers.length}
          </p>
        </div>
      </div>
    );
  }

  // Check if user has appropriate permissions or is a customer
  // Customers can view their own ledger
  const hasAccess = user?.roles?.some(role => 
    role.toLowerCase().includes('admin') || 
    role.toLowerCase().includes('manager')
  ) || user?.isSuperAdmin || user?.isManager || user?.isCustomer;

  if (!hasAccess) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-blue-900 dark:text-white mb-4">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You don't have permission to access the Customer Ledger page.
            </p>
            <p className="text-sm text-gray-500">
              Required roles: Admin, Manager, or Customer
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
          {/* Hero Header */}
          <div className="relative mb-8 overflow-hidden rounded-3xl bg-blue-900 p-8 text-white shadow-2xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat'
              }}></div>
            </div>
            
            <div className="relative">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl mb-2">
                    💰 {user?.isCustomer ? 'Your Ledger' : 'Customer Ledger'}
                  </h1>
                  <p className="text-blue-100 text-lg sm:text-xl">
                    {user?.isCustomer ? 'View your financial account, balance, and transaction history' : 'Comprehensive financial tracking and payment management'}
                  </p>
                </div>
                {!user?.isCustomer && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => router.push('/customers')}
                      className="group flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-sm px-6 py-3 text-white transition-all duration-300 hover:bg-white/30 hover:scale-105"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      <span className="font-medium">View Customers</span>
                    </button>
                    <button
                      onClick={() => router.push('/invoices')}
                      className="group flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-sm px-6 py-3 text-white transition-all duration-300 hover:bg-white/30 hover:scale-105"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-medium">View Invoices</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Message */}
        {message && (
          <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-6 dark:bg-red-900/20 dark:border-red-800 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-red-800 dark:text-red-200 font-medium">{message}</p>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Outstanding / Your Outstanding Balance */}
            <div className="group relative overflow-hidden rounded-2xl bg-blue-900 p-6 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/90 text-sm font-medium">
                      {user?.isCustomer ? 'Your Outstanding Balance' : 'Total Outstanding'}
                    </p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(summary.totalOutstanding)}
                    </p>
                    <p className="text-white/80 text-xs mt-1">
                      {user?.isCustomer ? 'Amount you owe' : 'Amount owed by customers'}
                    </p>
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Customers / Account Status (for customers) */}
            {user?.isCustomer ? (
              <div className="group relative overflow-hidden rounded-2xl bg-blue-900 p-6 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/90 text-sm font-medium">Total Invoiced</p>
                      <p className="text-3xl font-bold">
                        {formatCurrency(summary.totalInvoiced || 0)}
                      </p>
                      <p className="text-white/80 text-xs mt-1">Total amount invoiced</p>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="group relative overflow-hidden rounded-2xl bg-blue-900 p-6 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/90 text-sm font-medium">Total Customers</p>
                      <p className="text-3xl font-bold">
                        {summary.totalCustomers}
                      </p>
                      <p className="text-white/80 text-xs mt-1">Registered customers</p>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Customers / Total Paid (for customers) */}
            {user?.isCustomer ? (
              <div className="group relative overflow-hidden rounded-2xl bg-blue-900 p-6 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/90 text-sm font-medium">Total Paid</p>
                      <p className="text-3xl font-bold">
                        {formatCurrency(summary.totalPaid || 0)}
                      </p>
                      <p className="text-white/80 text-xs mt-1">Total amount paid</p>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="group relative overflow-hidden rounded-2xl bg-blue-900 p-6 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/90 text-sm font-medium">Active Customers</p>
                      <p className="text-3xl font-bold">
                        {summary.activeCustomers}
                      </p>
                      <p className="text-white/80 text-xs mt-1">Currently active accounts</p>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Overdue Accounts / Account Status (for customers) */}
            {user?.isCustomer ? (
              <div className="group relative overflow-hidden rounded-2xl bg-blue-900 p-6 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/90 text-sm font-medium">Account Status</p>
                      <p className="text-3xl font-bold">
                        {ledgers.length > 0 && ledgers[0]?.accountStatus ? ledgers[0].accountStatus : 'Active'}
                      </p>
                      <p className="text-white/80 text-xs mt-1">Your account status</p>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="group relative overflow-hidden rounded-2xl bg-blue-900 p-6 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/90 text-sm font-medium">Overdue Accounts</p>
                      <p className="text-3xl font-bold">
                        {summary.overdueCustomers}
                      </p>
                      <p className="text-white/80 text-xs mt-1">Require attention</p>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Aging Analysis */}
        {agingReport && (
          <div className="mb-8 rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-2xl border border-white/20 dark:bg-gray-800/80 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-900">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-blue-900 dark:text-white">Aging Analysis</h3>
                <p className="text-gray-600 dark:text-gray-400">Outstanding amounts by age</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div className="group text-center p-4 rounded-2xl bg-white border border-blue-900/20 dark:bg-gray-800 dark:border-gray-700/50 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-900 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">Current (0-30 days)</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-white">
                  {formatCurrency(agingReport.totalAging.current)}
                </p>
              </div>
              <div className="group text-center p-4 rounded-2xl bg-white border border-blue-900/20 dark:bg-gray-800 dark:border-gray-700/50 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-900 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">31-60 days</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-white">
                  {formatCurrency(agingReport.totalAging.days31to60)}
                </p>
              </div>
              <div className="group text-center p-4 rounded-2xl bg-white border border-blue-900/20 dark:bg-gray-800 dark:border-gray-700/50 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-900 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">61-90 days</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-white">
                  {formatCurrency(agingReport.totalAging.days61to90)}
                </p>
              </div>
              <div className="group text-center p-4 rounded-2xl bg-white border border-blue-900/20 dark:bg-gray-800 dark:border-gray-700/50 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-900 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">Over 90 days</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-white">
                  {formatCurrency(agingReport.totalAging.over90)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters - Only show for admin/manager users */}
        {!user?.isCustomer && (
          <div className="mb-8 rounded-3xl bg-white/80 backdrop-blur-sm p-6 shadow-xl border border-white/20 dark:bg-gray-800/80 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-900 dark:text-white">Filters & Search</h3>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-blue-900 dark:text-white">
                  Account Status
                </label>
                <select
                  value={filter.status}
                  onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all duration-300"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Closed">Closed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-blue-900 dark:text-white">
                  Min Balance
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400">Rs</span>
                  </div>
                  <input
                    type="number"
                    value={filter.minBalance}
                    onChange={(e) => setFilter({ ...filter, minBalance: e.target.value })}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all duration-300"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-blue-900 dark:text-white">
                  Search Customer
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by customer name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all duration-300"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilter({ status: '', minBalance: '' });
                  }}
                  className="w-full px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Customer Ledger Table */}
        <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow-2xl border border-white/20 dark:bg-gray-800/80 dark:border-gray-700/50 overflow-hidden">
          <div className="px-8 py-6 bg-blue-900">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {user?.isCustomer ? 'Your Account' : 'Customer Accounts'}
                </h3>
                <p className="text-white/80">
                  {user?.isCustomer ? 'View your financial account and balance' : 'Manage customer financial accounts and balances'}
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-8 py-4 text-left text-xs font-bold text-blue-900 dark:text-white uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 dark:text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 dark:text-white uppercase tracking-wider">
                    Current Balance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 dark:text-white uppercase tracking-wider">
                    Credit Limit
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 dark:text-white uppercase tracking-wider">
                    Payment Terms
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 dark:text-white uppercase tracking-wider">
                    Last Payment
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 dark:text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {ledgers.map((ledger) => (
                  <tr key={ledger._id} className="group hover:bg-blue-900/5 dark:hover:bg-gray-700 transition-all duration-300">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-14 w-14">
                          <div className="h-14 w-14 rounded-2xl bg-blue-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <span className="text-lg font-bold text-white">
                              {ledger.customerId?.companyName?.charAt(0) || 'C'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-lg font-semibold text-blue-900 dark:text-white group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors duration-300">
                            {ledger.customerId?.companyName || 'Unknown Customer'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {ledger.customerId?.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap">
                      <span className={`inline-flex px-4 py-2 text-sm font-bold rounded-full shadow-sm ${
                        ledger.accountStatus === 'Active' 
                          ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-200'
                          : ledger.accountStatus === 'Suspended'
                          ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 dark:from-yellow-900/30 dark:to-amber-900/30 dark:text-yellow-200'
                          : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 dark:from-red-900/30 dark:to-pink-900/30 dark:text-red-200'
                      }`}>
                        {ledger.accountStatus}
                      </span>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap">
                      <div className="text-right">
                        <span className={`text-lg font-bold ${
                          ledger.currentBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }`}>
                          {formatCurrency(ledger.currentBalance)}
                        </span>
                        <div className={`text-xs ${
                          ledger.currentBalance > 0 ? 'text-red-500 dark:text-red-300' : 'text-green-500 dark:text-green-300'
                        }`}>
                          {ledger.currentBalance > 0 ? 'Outstanding' : 'In Credit'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-sm text-blue-900 dark:text-white font-medium">
                      {formatCurrency(ledger.creditLimit)}
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-sm text-blue-900 dark:text-white font-medium">
                      {ledger.paymentTerms}
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {ledger.lastPaymentDate ? (
                        <div>
                          <div className="font-medium">{new Date(ledger.lastPaymentDate).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-400">Last payment</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Never</span>
                      )}
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/customer-ledger/${ledger.customerId._id}`)}
                          className="group/btn inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                        >
                          <svg className="h-4 w-4 group-hover/btn:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        <button
                          onClick={() => router.push(`/customer-ledger/${ledger.customerId._id}/payment`)}
                          className="group/btn inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                        >
                          <svg className="h-4 w-4 group-hover/btn:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          Pay
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Empty State */}
          {ledgers.length === 0 && !loading && (
            <div className="text-center py-16 px-8">
              <div className="flex flex-col items-center gap-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                  <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-blue-900 dark:text-white mb-2">No Customer Ledgers Found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                    Customer ledgers will appear here once customers make their first purchase or payment.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => router.push('/customers')}
                      className="px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    >
                      View Customers
                    </button>
                    <button
                      onClick={() => router.push('/invoices')}
                      className="px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    >
                      View Invoices
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {loading && (
            <div className="text-center py-16 px-8">
              <div className="flex flex-col items-center gap-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-blue-900 dark:text-white mb-2">Loading Customer Ledgers</h3>
                  <p className="text-gray-600 dark:text-gray-400">Please wait while we fetch the latest data...</p>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default CustomerLedgerPage;
