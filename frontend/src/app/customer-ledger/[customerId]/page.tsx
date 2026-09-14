'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/lib/auth';
import { useUser } from '@/components/Auth/user-context';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { CustomerLedgerData, PaymentData } from '@/types/customerLedger';

interface CustomerLedgerDetailPageProps {
  params: Promise<{ customerId: string }>;
}

const CustomerLedgerDetailPage = ({ params }: CustomerLedgerDetailPageProps) => {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [customerId, setCustomerId] = useState<string>('');
  const [ledgerData, setLedgerData] = useState<CustomerLedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    description: '',
    notes: ''
  });

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setCustomerId(resolvedParams.customerId);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (customerId && user && !userLoading) {
      fetchLedgerData();
    }
  }, [customerId, user, userLoading]);

  const fetchLedgerData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching customer ledger for:', customerId);
      
      const response = await fetch(`/api/customer-ledger/${customerId}/ledger`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setLedgerData(data.data);
        console.log('✅ Fetched customer ledger data');
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch customer ledger:', errorData);
        setMessage(`Failed to fetch customer ledger: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error fetching customer ledger:', error);
      setMessage('Error fetching customer ledger');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      console.log('🔍 Recording payment:', paymentData);
      
      const response = await fetch(`/api/customer-ledger/${customerId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(paymentData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Payment recorded successfully:', data);
        setMessage('Payment recorded successfully!');
        setShowPaymentModal(false);
        setPaymentData({
          amount: 0,
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'Cash',
          description: '',
          notes: ''
        });
        // Refresh ledger data
        await fetchLedgerData();
        setTimeout(() => setMessage(''), 5000);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to record payment:', errorData);
        setMessage(`Failed to record payment: ${errorData.message || 'Unknown error'}`);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error('❌ Error recording payment:', error);
      setMessage('Error recording payment');
      setTimeout(() => setMessage(''), 5000);
    } finally {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'Invoice': return 'text-red-600 dark:text-red-400';
      case 'Payment': return 'text-green-600 dark:text-green-400';
      case 'Credit': return 'text-blue-600 dark:text-blue-400';
      case 'Adjustment': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-900 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {userLoading ? 'Loading user...' : 'Loading customer ledger...'}
          </p>
        </div>
      </div>
    );
  }

  if (!ledgerData) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-blue-900 dark:text-white mb-4">Customer Ledger Not Found</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The customer ledger you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <button
              onClick={() => router.push('/customer-ledger')}
              className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
            >
              Back to Customer Ledger
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const { ledger, transactions } = ledgerData;

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-title-md2 font-semibold text-blue-900 dark:text-white">
              {ledger.customerId.companyName} - Customer Ledger
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {ledger.customerId.email}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-white hover:bg-blue-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Record Payment
            </button>
            <button
              onClick={() => router.push('/customer-ledger')}
              className="flex items-center gap-2 rounded-lg border border-blue-900/20 bg-white px-4 py-2 text-blue-900 hover:bg-blue-900/5 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Ledger
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-4 dark:bg-green-900/20 dark:border-green-800">
            <p className="text-green-800 dark:text-green-200">{message}</p>
          </div>
        )}

        {/* Account Summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-blue-900/20 bg-white p-6 shadow-1 dark:border-gray-700 dark:bg-boxdark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-white">Current Balance</p>
                <p className={`text-2xl font-bold ${ledger.currentBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(ledger.currentBalance)}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-900">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-900/20 bg-white p-6 shadow-1 dark:border-gray-700 dark:bg-boxdark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-white">Credit Limit</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-white">
                  {formatCurrency(ledger.creditLimit)}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-900">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-900/20 bg-white p-6 shadow-1 dark:border-gray-700 dark:bg-boxdark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-white">Total Invoiced</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-white">
                  {formatCurrency(ledger.totalInvoiced)}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-900">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-900/20 bg-white p-6 shadow-1 dark:border-gray-700 dark:bg-boxdark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-white">Total Paid</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-white">
                  {formatCurrency(ledger.totalPaid)}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-900">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="mb-6 rounded-lg border border-stroke bg-white p-6 shadow-1 dark:border-strokedark dark:bg-boxdark">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-4">Account Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Account Status</p>
              <p className="text-sm text-blue-900 dark:text-white">{ledger.accountStatus}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Payment Terms</p>
              <p className="text-sm text-blue-900 dark:text-white">{ledger.paymentTerms}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Payment</p>
              <p className="text-sm text-blue-900 dark:text-white">
                {ledger.lastPaymentDate ? formatDate(ledger.lastPaymentDate) : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Payment Amount</p>
              <p className="text-sm text-blue-900 dark:text-white">
                {formatCurrency(ledger.lastPaymentAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Credit Utilization</p>
              <p className="text-sm text-blue-900 dark:text-white">
                {ledger.creditUtilization.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Days Since Last Payment</p>
              <p className="text-sm text-blue-900 dark:text-white">
                {ledger.daysSinceLastPayment || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="rounded-lg border border-blue-900/20 bg-white shadow-1 dark:border-gray-700 dark:bg-boxdark">
          <div className="px-6 py-4 border-b border-blue-900/20 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-white">Transaction History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 dark:text-white uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 dark:text-white uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 dark:text-white uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 dark:text-white uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 dark:text-white uppercase tracking-wider">
                    Debit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 dark:text-white uppercase tracking-wider">
                    Credit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 dark:text-white uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-boxdark divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-blue-900/5 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-900 dark:text-white">
                      {formatDate(transaction.transactionDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getTransactionTypeColor(transaction.transactionType)}`}>
                        {transaction.transactionType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-900 dark:text-white">
                      {transaction.referenceNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-900 dark:text-white">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                      {transaction.debitAmount > 0 ? formatCurrency(transaction.debitAmount) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                      {transaction.creditAmount > 0 ? formatCurrency(transaction.creditAmount) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-900 dark:text-white">
                      {formatCurrency(transaction.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-4">Record Payment</h3>
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-blue-900 outline-none transition focus:border-blue-900 active:border-blue-900 disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-blue-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-blue-900 outline-none transition focus:border-blue-900 active:border-blue-900 disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-blue-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">
                    Payment Method *
                  </label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value as any })}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-blue-900 outline-none transition focus:border-blue-900 active:border-blue-900 disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-blue-400"
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={paymentData.description}
                    onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}
                    placeholder="Payment description"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-blue-900 outline-none transition focus:border-blue-900 active:border-blue-900 disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">
                    Notes
                  </label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    placeholder="Additional notes"
                    rows={3}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-blue-900 outline-none transition focus:border-blue-900 active:border-blue-900 disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-blue-400"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
                  >
                    {loading ? 'Recording...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default CustomerLedgerDetailPage;
