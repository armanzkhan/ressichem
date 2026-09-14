"use client";

import { useUser } from "@/components/Auth/user-context";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./print-styles.css";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  orderNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  tax: number;
  taxRate?: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  paymentTerms: string;
  notes: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxId: string;
  };
  customer: {
    name: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const [invoiceId, setInvoiceId] = useState<string>('');
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/sign-in");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setInvoiceId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (user && invoiceId) {
      fetchInvoiceDetails();
    }
  }, [user, invoiceId]);

  const fetchInvoiceDetails = async () => {
    try {
      setLoadingInvoice(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found.");
        setLoadingInvoice(false);
        return;
      }

      const response = await fetch(`/api/invoices/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📄 Invoice details fetched:', data);
        console.log('📄 Invoice company data:', data.data?.company);
        console.log('📄 Invoice customer data:', data.data?.customer);
        
        // Map backend field names to frontend interface
        const invoiceData = data.data;
        if (invoiceData) {
          // Map items: finalAmount -> total
          const mappedItems = (invoiceData.items || []).map((item: any) => ({
            ...item,
            total: item.finalAmount || item.total || (item.unitPrice || 0) * (item.quantity || 1)
          }));
          
          // Map totalDiscount to discount, taxAmount to tax
          const mappedInvoice = {
            ...invoiceData,
            items: mappedItems,
            discount: invoiceData.totalDiscount || invoiceData.discount || 0,
            tax: invoiceData.taxAmount || invoiceData.tax || 0,
            taxRate: invoiceData.taxRate !== undefined ? invoiceData.taxRate : 0, // Get tax rate from invoice
            // Ensure total is calculated correctly
            total: invoiceData.total || (invoiceData.subtotal || 0) - (invoiceData.totalDiscount || 0) + (invoiceData.taxAmount || 0),
            // Fix remaining amount calculation: handle 0 correctly (0 is falsy, so use nullish coalescing)
            remainingAmount: invoiceData.remainingAmount !== undefined ? invoiceData.remainingAmount : ((invoiceData.total || 0) - (invoiceData.paidAmount || 0))
          };
          console.log('📄 Mapped invoice data:', mappedInvoice);
          console.log('📄 Mapped items:', mappedItems);
          setInvoice(mappedInvoice);
        } else {
          setInvoice(null);
        }
      } else {
        // Handle different error status codes
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("userType");
          localStorage.removeItem("userRole");
          setError('Access denied. This invoice does not belong to you or you are not authorized to view it.');
          router.push("/auth/sign-in");
          return;
        }
        
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `Failed to fetch invoice details (${response.status})` };
        }
        setError(errorData.message || 'Failed to fetch invoice details');
        console.error('Failed to fetch invoice details:', response.status, errorData);
      }
    } catch (error: any) {
      setError(error.message || 'Error fetching invoice details');
      console.error('Error fetching invoice details:', error);
    } finally {
      setLoadingInvoice(false);
    }
  };

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
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Show loading only if we don't have invoice data yet
  // This allows print preview to work even if loading state is true
  if ((loading || loadingInvoice) && !invoice && !error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/invoices')}
            className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-900 dark:text-white mb-4">Invoice Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The invoice you're looking for doesn't exist or couldn't be loaded.</p>
          <button
            onClick={() => router.push('/invoices')}
            className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full min-w-0 max-w-full overflow-x-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen">
        <div className="no-print">
          <Breadcrumb pageName={`Invoice ${invoice.invoiceNumber}`} />
        </div>

        {/* Print Area */}
        <div className="print-area">
          {/* Print Header */}
          <div className="print-header hidden">
            <h1>INVOICE</h1>
            <div className="invoice-number">#{invoice.invoiceNumber}</div>
            <div className="invoice-dates">
              Generated on {formatDate(invoice.invoiceDate)} | Due: {formatDate(invoice.dueDate)}
            </div>
          </div>

          {/* Invoice Header */}
          <div className="mb-6">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20 p-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-white mb-2">
                    Invoice {invoice.invoiceNumber}
                  </h1>
                  <p className="text-blue-700 dark:text-blue-300">
                    Order: {invoice.orderNumber}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                    {invoice.paymentStatus.charAt(0).toUpperCase() + invoice.paymentStatus.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Invoice Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Company & Customer Info */}
              <div className="print-company-header hidden">
                <h2>Invoice Details</h2>
                <div className="company-info">
                  <div className="from-section">
                    <div className="section-title">From</div>
                    <div className="company-name">{invoice.company?.name || 'Company Name'}</div>
                    <div className="company-details">
                      {invoice.company?.address || 'Company Address'}<br/>
                      {invoice.company?.phone || 'Company Phone'}<br/>
                      {invoice.company?.email || 'company@example.com'}<br/>
                      Tax ID: {invoice.company?.taxId || 'TAX-ID-XXXXX'}
                    </div>
                  </div>
                  <div className="to-section">
                    <div className="section-title">To</div>
                    <div className="customer-name">{invoice.customer?.name || 'Customer Name'}</div>
                    <div className="customer-details">
                      {invoice.customer?.email || 'customer@example.com'}<br/>
                      {invoice.customer?.address || 'Customer Address'}<br/>
                      {invoice.customer?.city || 'City'}, {invoice.customer?.state || 'State'} {invoice.customer?.zipCode || 'ZIP'}<br/>
                      {invoice.customer?.country || 'Country'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Badges */}
              <div className="print-status-badges hidden">
                <span className={`print-status-badge ${invoice.status.toLowerCase()}`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
                <span className={`print-status-badge ${invoice.paymentStatus.toLowerCase()}`}>
                  {invoice.paymentStatus.charAt(0).toUpperCase() + invoice.paymentStatus.slice(1)}
                </span>
              </div>

              {/* Regular Company & Customer Info for screen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Info */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-4">From</h3>
                  <div className="space-y-2">
                    <p className="font-semibold text-blue-900 dark:text-white">{invoice.company?.name || 'Company Name'}</p>
                    <p className="text-gray-600 dark:text-gray-400">{invoice.company?.address || 'Company Address'}</p>
                    <p className="text-gray-600 dark:text-gray-400">{invoice.company?.phone || 'Company Phone'}</p>
                    <p className="text-gray-600 dark:text-gray-400">{invoice.company?.email || 'company@example.com'}</p>
                    <p className="text-gray-600 dark:text-gray-400">Tax ID: {invoice.company?.taxId || 'TAX-ID-XXXXX'}</p>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-4">To</h3>
                  <div className="space-y-2">
                    <p className="font-semibold text-blue-900 dark:text-white">{invoice.customer?.name || 'Customer Name'}</p>
                    <p className="text-gray-600 dark:text-gray-400">{invoice.customer?.email || 'customer@example.com'}</p>
                    <p className="text-gray-600 dark:text-gray-400">{invoice.customer?.address || 'Customer Address'}</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {invoice.customer?.city || 'City'}, {invoice.customer?.state || 'State'} {invoice.customer?.zipCode || 'ZIP'}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">{invoice.customer?.country || 'Country'}</p>
                  </div>
                </div>
              </div>

              {/* Print Items Table */}
              <div className="print-items-section hidden">
                <h3>Invoice Items</h3>
                <table className="print-items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => (
                      <tr key={index}>
                        <td className="item-name">{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td className="item-price">{formatCurrency(item.unitPrice || 0)}</td>
                        <td className="item-total">{formatCurrency(item.total || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Regular Invoice Items for screen */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-4">Invoice Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-semibold text-blue-900 dark:text-white">Item</th>
                        <th className="text-right py-3 px-4 font-semibold text-blue-900 dark:text-white">Qty</th>
                        <th className="text-right py-3 px-4 font-semibold text-blue-900 dark:text-white">Unit Price</th>
                        <th className="text-right py-3 px-4 font-semibold text-blue-900 dark:text-white">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-3 px-4 text-blue-900 dark:text-white">{item.productName}</td>
                          <td className="py-3 px-4 text-right text-blue-900 dark:text-white">{item.quantity}</td>
                          <td className="py-3 px-4 text-right text-blue-900 dark:text-white">{formatCurrency(item.unitPrice || 0)}</td>
                          <td className="py-3 px-4 text-right text-blue-900 dark:text-white font-semibold">{formatCurrency(item.total || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Print Notes */}
              {(invoice.notes || invoice.orderNumber) && (
                <div className="print-notes-section hidden">
                  <h3>Notes</h3>
                  <div className="print-notes-content">
                    {invoice.notes && <p>{invoice.notes}</p>}
                    {invoice.orderNumber && <p>Invoice generated from order {invoice.orderNumber}</p>}
                  </div>
                </div>
              )}

              {/* Regular Notes for screen */}
              {invoice.notes && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-2">Notes</h3>
                  <p className="text-gray-600 dark:text-gray-400">{invoice.notes}</p>
                </div>
              )}
            </div>

            {/* Print Invoice Details */}
            <div className="print-invoice-details hidden">
              <h3>Invoice Details</h3>
              <div className="print-detail-row">
                <span className="print-detail-label">Invoice Date:</span>
                <span className="print-detail-value">{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div className="print-detail-row">
                <span className="print-detail-label">Due Date:</span>
                <span className="print-detail-value">{formatDate(invoice.dueDate)}</span>
              </div>
              <div className="print-detail-row">
                <span className="print-detail-label">Payment Terms:</span>
                <span className="print-detail-value">{invoice.paymentTerms}</span>
              </div>
            </div>

            {/* Regular Sidebar */}
            <div className="space-y-6">
              {/* Invoice Details */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-4">Invoice Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Invoice Date:</span>
                    <span className="text-blue-900 dark:text-white font-medium">{formatDate(invoice.invoiceDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Due Date:</span>
                    <span className="text-blue-900 dark:text-white font-medium">{formatDate(invoice.dueDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Payment Terms:</span>
                    <span className="text-blue-900 dark:text-white font-medium">{invoice.paymentTerms}</span>
                  </div>
                </div>
              </div>

              {/* Print Financial Summary */}
              <div className="print-financial-summary hidden">
                <h3>Financial Summary</h3>
                <div className="print-financial-row">
                  <span className="print-financial-label">Subtotal:</span>
                  <span className="print-financial-value">{formatCurrency(invoice.subtotal || 0)}</span>
                </div>
                <div className="print-financial-row">
                  <span className="print-financial-label">Discount:</span>
                  <span className="print-financial-value discount">-{formatCurrency(invoice.discount || 0)}</span>
                </div>
                <div className="print-financial-row">
                  <span className="print-financial-label">Tax ({invoice.taxRate !== undefined ? invoice.taxRate : 0}%):</span>
                  <span className="print-financial-value">{formatCurrency(invoice.tax || 0)}</span>
                </div>
                <div className="print-financial-row total-row">
                  <span className="print-financial-label">Total:</span>
                  <span className="print-financial-value total">{formatCurrency(invoice.total || 0)}</span>
                </div>
                <div className="print-financial-row">
                  <span className="print-financial-label">Paid Amount:</span>
                  <span className="print-financial-value">{formatCurrency(invoice.paidAmount || 0)}</span>
                </div>
                <div className="print-financial-row remaining-row">
                  <span className="print-financial-label">Remaining:</span>
                  <span className="print-financial-value">{formatCurrency(invoice.remainingAmount !== undefined ? invoice.remainingAmount : ((invoice.total || 0) - (invoice.paidAmount || 0)))}</span>
                </div>
              </div>

              {/* Regular Financial Summary for screen */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-4">Financial Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="text-blue-900 dark:text-white">{formatCurrency(invoice.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                    <span className="text-red-600 dark:text-red-400">-{formatCurrency(invoice.discount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tax ({invoice.taxRate !== undefined ? invoice.taxRate : 0}%):</span>
                    <span className="text-blue-900 dark:text-white">{formatCurrency(invoice.tax || 0)}</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-blue-900 dark:text-white">Total:</span>
                      <span className="text-blue-900 dark:text-white">{formatCurrency(invoice.total || 0)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Paid Amount:</span>
                    <span className="text-green-600 dark:text-green-400">{formatCurrency(invoice.paidAmount || 0)}</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="flex justify-between font-semibold">
                      <span className="text-blue-900 dark:text-white">Remaining:</span>
                      <span className="text-blue-900 dark:text-white">{formatCurrency(invoice.remainingAmount !== undefined ? invoice.remainingAmount : ((invoice.total || 0) - (invoice.paidAmount || 0)))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Print Footer */}
          <div className="print-footer hidden">
            <p>Thank you for your business!</p>
            <p>For any questions regarding this invoice, please contact us at {invoice.company?.email || 'info@ressichem.com'}</p>
          </div>
        </div>

        {/* Actions - Hidden in Print */}
        <div className="no-print mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-4">Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => window.print()}
                className="w-full px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200"
              >
                Print Invoice
              </button>
              <button
                onClick={() => router.push('/invoices')}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                Back to Invoices
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}