'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/lib/auth';
import { useUser } from '@/components/Auth/user-context';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { 
  ArrowLeft, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle2,
  AlertCircle,
  Building2,
  TrendingDown,
  Wallet
} from 'lucide-react';

interface PaymentData {
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  description: string;
  notes: string;
}

interface CustomerLedgerPaymentPageProps {
  params: Promise<{ customerId: string }>;
}

const CustomerLedgerPaymentPage = ({ params }: CustomerLedgerPaymentPageProps) => {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [customerId, setCustomerId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [paymentData, setPaymentData] = useState<PaymentData>({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    description: '',
    notes: ''
  });
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [outstandingBalance, setOutstandingBalance] = useState(0);

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setCustomerId(resolvedParams.customerId);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (customerId && user && !userLoading) {
      fetchCustomerLedger();
    }
  }, [customerId, user, userLoading]);

  const fetchCustomerLedger = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching customer ledger for:', customerId);
      
      const response = await fetch(`/api/customer-ledger/${customerId}/ledger`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        const ledger = data.data || data;
        setCustomerInfo(ledger.customer || ledger.customerId);
        setOutstandingBalance(ledger.currentBalance || ledger.balance || 0);
        console.log('✅ Fetched customer ledger data');
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch customer ledger:', errorData);
        setMessage(`Failed to fetch customer ledger: ${errorData.message || 'Unknown error'}`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('❌ Error fetching customer ledger:', error);
      setMessage('Error fetching customer ledger');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentData.amount <= 0) {
      setMessage('Payment amount must be greater than 0');
      setMessageType('error');
      return;
    }

    if (paymentData.amount > outstandingBalance) {
      setMessage(`Payment amount cannot exceed outstanding balance of PKR ${outstandingBalance.toLocaleString()}`);
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      
      console.log('💰 Recording payment for customer:', customerId);
      console.log('💰 Payment data:', paymentData);
      
      const response = await fetch(`/api/customer-ledger/${customerId}/payments`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Payment recorded successfully:', data);
        setMessage('Payment recorded successfully!');
        setMessageType('success');
        
        // Reset form
        setPaymentData({
          amount: 0,
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'Cash',
          description: '',
          notes: ''
        });
        
        // Refresh ledger data
        await fetchCustomerLedger();
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push(`/customer-ledger/${customerId}`);
        }, 2000);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to record payment:', errorData);
        setMessage(`Failed to record payment: ${errorData.message || 'Unknown error'}`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('❌ Error recording payment:', error);
      setMessage('Error recording payment');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
            <Wallet className="h-8 w-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mt-4">Loading payment form...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Breadcrumb pageName="Record Payment" />
        
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Record Payment</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Enter payment details to update customer ledger</p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/customer-ledger/${customerId}`)}
                className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-stroke bg-white dark:bg-dark-2 dark:border-dark-3 text-dark dark:text-white font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back to Ledger
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && !customerInfo && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mb-4"></div>
                  <Building2 className="h-6 w-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Loading customer information...</p>
              </div>
            </div>
          )}

          {/* Customer Info Card */}
          {customerInfo && (
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-xl text-white transform hover:scale-[1.02] transition-transform duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-bold">Customer Information</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="text-blue-100 text-sm font-medium">Company Name</p>
                    <p className="text-white text-lg font-semibold">
                      {customerInfo.companyName || customerInfo.name || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-5 w-5 text-blue-200" />
                      <p className="text-blue-100 text-xs font-medium">Outstanding Balance</p>
                    </div>
                    <p className="text-white text-2xl font-bold">
                      PKR {outstandingBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Message Alert */}
          {message && (
            <div className={`mb-6 p-4 rounded-xl shadow-lg flex items-start gap-3 animate-in slide-in-from-top-5 duration-300 ${
              messageType === 'success' 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-800'
            }`}>
              {messageType === 'success' ? (
                <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
              )}
              <p className={`font-medium ${messageType === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                {message}
              </p>
            </div>
          )}

          {/* Payment Form Card */}
          <div className="rounded-2xl bg-white dark:bg-gray-dark shadow-xl border border-stroke dark:border-dark-3 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 px-6 py-4 border-b border-stroke dark:border-dark-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Details
              </h2>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-6">
              {/* Payment Amount */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Payment Amount (PKR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                    PKR
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={outstandingBalance}
                    required
                    value={paymentData.amount || ''}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-16 pr-4 py-3.5 rounded-xl border-2 border-stroke dark:border-dark-3 bg-gray-50 dark:bg-dark-2 text-dark dark:text-white font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200"
                    placeholder="0.00"
                  />
                </div>
                {outstandingBalance > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <span className="font-medium">Maximum:</span> PKR {outstandingBalance.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Payment Date */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <Calendar className="h-4 w-4 text-primary" />
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-stroke dark:border-dark-3 bg-gray-50 dark:bg-dark-2 text-dark dark:text-white font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-stroke dark:border-dark-3 bg-gray-50 dark:bg-dark-2 text-dark dark:text-white font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200 cursor-pointer"
                >
                  <option value="Cash">💵 Cash</option>
                  <option value="Bank Transfer">🏦 Bank Transfer</option>
                  <option value="Cheque">📄 Cheque</option>
                  <option value="Credit Card">💳 Credit Card</option>
                  <option value="Other">📝 Other</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <FileText className="h-4 w-4 text-primary" />
                  Description
                </label>
                <input
                  type="text"
                  value={paymentData.description}
                  onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-stroke dark:border-dark-3 bg-gray-50 dark:bg-dark-2 text-dark dark:text-white font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200"
                  placeholder="Enter payment description (e.g., Invoice #1234 payment)"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <FileText className="h-4 w-4 text-primary" />
                  Additional Notes
                </label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-stroke dark:border-dark-3 bg-gray-50 dark:bg-dark-2 text-dark dark:text-white font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200 resize-none"
                  placeholder="Enter any additional notes or remarks about this payment..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-stroke dark:border-dark-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="group flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                      <span>Recording Payment...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
                      <span>Record Payment</span>
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => router.push(`/customer-ledger/${customerId}`)}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-2 border-stroke dark:border-dark-3 bg-white dark:bg-dark-2 text-dark dark:text-white font-semibold hover:border-primary hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default CustomerLedgerPaymentPage;

