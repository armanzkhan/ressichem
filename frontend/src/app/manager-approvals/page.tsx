"use client";

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import { useUser } from "@/components/Auth/user-context";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeaders, handleAuthError } from "@/lib/auth";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Package,
  User,
  DollarSign,
  MessageSquare,
  AlertTriangle,
  Edit,
  Eye,
  Percent,
  Calculator,
  FileText,
  MoreVertical,
  Receipt
} from "lucide-react";

interface ItemApproval {
  _id: string;
  orderId: string;
  itemIndex: number;
  product: {
    _id: string;
    name: string;
    description: string;
    price: number;
  } | null;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  originalAmount: number;
  comments?: string;
  discountPercentage?: number;
  discountAmount?: number;
  approvedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  order: {
    _id: string;
    orderNumber: string;
    status?: string;
    customer: {
      companyName: string;
      contactName: string;
      email: string;
    };
    createdAt: string;
  };
}

export default function ManagerApprovalsPage() {
  const { user, loading: userLoading } = useUser();
  const [approvals, setApprovals] = useState<ItemApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedApproval, setSelectedApproval] = useState<ItemApproval | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [comments, setComments] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemApproval | null>(null);
  const [editData, setEditData] = useState({
    quantity: 1,
    unitPrice: 0,
    total: 0
  });
  const [recentlyProcessed, setRecentlyProcessed] = useState<Set<string>>(new Set());
  const [processedWithDiscount, setProcessedWithDiscount] = useState<Set<string>>(new Set());
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false);
  const [showDeleteInvoiceModal, setShowDeleteInvoiceModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoiceFormData, setInvoiceFormData] = useState({
    customerName: '',
    customerEmail: '',
    notes: ''
  });
  const [status, setStatus] = useState<'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'>('draft');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [newlyCreatedInvoice, setNewlyCreatedInvoice] = useState<string | null>(null);
  const [assignedCustomers, setAssignedCustomers] = useState<any[]>([]);
  const router = useRouter();

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

  // Invoice CRUD operations
  const handleCreateInvoice = async () => {
    try {
      setInvoiceLoading(true);
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          customerName: invoiceFormData.customerName,
          customerEmail: invoiceFormData.customerEmail,
          notes: invoiceFormData.notes
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ Invoice created successfully: ${result.invoiceNumber}`);
        setShowCreateInvoiceModal(false);
        setInvoiceFormData({ customerName: '', customerEmail: '', notes: '' });
        await fetchInvoices();
        setTimeout(() => setMessage(""), 5000);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to create invoice: ${errorData.message || 'Unknown error'}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('❌ Error creating invoice:', error);
      setMessage(`❌ Error creating invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleUpdateInvoice = async () => {
    if (!selectedInvoice) return;
    
    try {
      setInvoiceLoading(true);
      const response = await fetch(`/api/invoices/${selectedInvoice._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          customerName: invoiceFormData.customerName,
          customerEmail: invoiceFormData.customerEmail,
          notes: invoiceFormData.notes
        })
      });

      if (response.ok) {
        setMessage('✅ Invoice updated successfully!');
        setShowEditInvoiceModal(false);
        setSelectedInvoice(null);
        setInvoiceFormData({ customerName: '', customerEmail: '', notes: '' });
        await fetchInvoices();
        setTimeout(() => setMessage(""), 5000);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to update invoice: ${errorData.message || 'Unknown error'}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('❌ Error updating invoice:', error);
      setMessage(`❌ Error updating invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;
    
    try {
      setInvoiceLoading(true);
      const response = await fetch(`/api/invoices/${selectedInvoice._id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setMessage('✅ Invoice deleted successfully!');
        setShowDeleteInvoiceModal(false);
        setSelectedInvoice(null);
        await fetchInvoices();
        setTimeout(() => setMessage(""), 5000);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to delete invoice: ${errorData.message || 'Unknown error'}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('❌ Error deleting invoice:', error);
      setMessage(`❌ Error deleting invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleDuplicateInvoice = async () => {
    if (!selectedInvoice) return;
    
    try {
      setInvoiceLoading(true);
      const response = await fetch(`/api/invoices/${selectedInvoice._id}/duplicate`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ Invoice duplicated successfully: ${result.invoiceNumber}`);
        await fetchInvoices();
        setTimeout(() => setMessage(""), 5000);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to duplicate invoice: ${errorData.message || 'Unknown error'}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('❌ Error duplicating invoice:', error);
      setMessage(`❌ Error duplicating invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedInvoice) return;
    
    try {
      setInvoiceLoading(true);
      const response = await fetch(`/api/invoices/${selectedInvoice._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        setMessage('✅ Invoice status updated successfully!');
        setShowStatusModal(false);
        setSelectedInvoice(null);
        await fetchInvoices();
        setTimeout(() => setMessage(""), 5000);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to update status: ${errorData.message || 'Unknown error'}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('❌ Error updating status:', error);
      setMessage(`❌ Error updating status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedInvoice) return;
    
    try {
      setInvoiceLoading(true);
      const response = await fetch(`/api/invoices/${selectedInvoice._id}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          amount: paymentAmount,
          date: paymentDate,
          method: paymentMethod,
          notes: paymentNotes
        })
      });

      if (response.ok) {
        setMessage('✅ Payment added successfully!');
        setShowPaymentModal(false);
        setSelectedInvoice(null);
        setPaymentAmount(0);
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('cash');
        setPaymentNotes('');
        await fetchInvoices();
        setTimeout(() => setMessage(""), 5000);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to add payment: ${errorData.message || 'Unknown error'}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('❌ Error adding payment:', error);
      setMessage(`❌ Error adding payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setInvoiceLoading(false);
    }
  };

  // Modal handlers
  const openCreateInvoiceModal = () => {
    setInvoiceFormData({ customerName: '', customerEmail: '', notes: '' });
    setShowCreateInvoiceModal(true);
  };

  const openEditInvoiceModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setInvoiceFormData({
      customerName: invoice.customer?.name || invoice.customerName || '',
      customerEmail: invoice.customer?.email || invoice.customerEmail || '',
      notes: invoice.notes || ''
    });
    setShowEditInvoiceModal(true);
  };

  const openDeleteInvoiceModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setShowDeleteInvoiceModal(true);
  };

  const openStatusModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setStatus(invoice.status);
    setShowStatusModal(true);
  };

  const openPaymentModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(0);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  // Fetch pending approvals for the current manager
  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching pending approvals for manager...');
      
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      console.log('🔍 Token from localStorage:', token ? `Present (${token.substring(0, 20)}...)` : 'Missing');
      console.log('🔍 Full token:', token);
      
      if (!token) {
        console.error('❌ No token found, redirecting to login');
        setMessage('❌ Please log in to view approvals');
        setTimeout(() => {
          window.location.href = '/auth/sign-in';
        }, 2000);
        return;
      }
      
      const response = await fetch('/api/orders/manager/all-approvals', {
        headers: getAuthHeaders()
      });

      console.log('📡 Approvals response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Approvals data received:', data);
        console.log('✅ Approvals count:', data.approvals?.length || 0);
        
        // Debug discount data
        data.approvals?.forEach((approval: any, index: number) => {
          if (approval.discountAmount && approval.discountAmount > 0) {
            console.log(`💰 Approval ${index}: ${approval.product?.name} - Original: ${approval.originalAmount}, Discount: ${approval.discountAmount}, Final: ${approval.originalAmount - approval.discountAmount}`);
          }
        });
        
        setApprovals(data.approvals || []);
        
        const pendingCount = data.approvals?.filter((a: any) => a.status === 'pending').length || 0;
        const approvedCount = data.approvals?.filter((a: any) => a.status === 'approved').length || 0;
        const rejectedCount = data.approvals?.filter((a: any) => a.status === 'rejected').length || 0;
        
        setMessage(`✅ Loaded ${data.approvals?.length || 0} total approvals (${pendingCount} pending, ${approvedCount} approved, ${rejectedCount} rejected)`);
        setTimeout(() => setMessage(""), 5000);
      } else {
        console.error('❌ Response not OK:', response.status, response.statusText);
        
        if (handleAuthError(response.status, "Please log in to view approvals")) {
          return;
        }
        
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          const errorText = await response.text();
          console.error('❌ Failed to parse error response:', errorText);
          setMessage(`❌ Server error: ${response.status} ${response.statusText}`);
          setTimeout(() => setMessage(""), 5000);
          return;
        }
        
        console.error('❌ Failed to fetch approvals:', errorData);
        setMessage(`❌ Failed to fetch approvals: ${errorData.message || 'Unknown error'}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('❌ Error fetching approvals:', error);
      setMessage(`❌ Error fetching approvals: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Fetch invoices for the current manager
  const fetchInvoices = async () => {
    try {
      setInvoicesLoading(true);
      console.log('🔍 Fetching invoices for current manager...');
      
      // Check if user is authenticated
      if (!user) {
        console.error('❌ No user found - not authenticated');
        setMessage('❌ Please log in to access this page.');
        setTimeout(() => setMessage(''), 5000);
        return;
      }
      
      // Check if token is present
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No token found in localStorage');
        setMessage('❌ Authentication token missing. Please log in again.');
        setTimeout(() => setMessage(''), 5000);
        return;
      }
      
      console.log('🔍 Token present:', token.substring(0, 20) + '...');
      
      // Get manager ID from user context - use User._id (preferred) as approvedBy stores User._id
      // Fallback to manager_id if _id is not available
      const managerId = user?._id || user?.managerProfile?.manager_id || user?.user_id;
      console.log('🔍 Manager ID from managerProfile:', user?.managerProfile?.manager_id);
      console.log('🔍 User ID as fallback:', user?.user_id);
      console.log('🔍 Final Manager ID:', managerId);
      console.log('🔍 User roles:', user?.roles);
      console.log('🔍 Is Manager:', user?.isManager);
      
      if (!managerId) {
        console.error('❌ No manager ID or user ID found for current user');
        setMessage('❌ User profile incomplete. Please contact administrator.');
        setTimeout(() => setMessage(''), 5000);
        return;
      }
      
      // Check if user has manager role or is a manager
      const hasManagerRole = user?.roles?.some(role => 
        role.toLowerCase().includes('manager') || 
        role.toLowerCase().includes('admin')
      ) || user?.isManager || user?.isSuperAdmin;
      
      if (!hasManagerRole) {
        console.warn('⚠️ User does not have manager role, but proceeding with user ID filtering');
        setMessage('⚠️ Limited access: You may not have full manager permissions.');
        setTimeout(() => setMessage(''), 3000);
      }
      
      // Add managerId as query parameter - only if we have a valid manager ID
      let url = '/api/invoices';
      if (managerId) {
        url = `/api/invoices?managerId=${managerId}&managerApprovedOnly=true`;
      }
      console.log('🔍 Fetching from URL:', url);
      console.log('🔍 Auth headers:', getAuthHeaders());
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('🔍 Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Response data:', data);
        setInvoices(data.data || []);
        console.log(`✅ Fetched ${data.data?.length || 0} invoices for manager ${managerId}`);
      } else {
        console.log('🔍 Response not ok, attempting to parse error...');
        let errorData;
        try {
          const responseText = await response.text();
          console.log('🔍 Raw response text:', responseText);
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          console.log('🔍 Failed to parse response as JSON:', parseError);
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        console.error('❌ Failed to fetch invoices:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: url
        });
        setMessage(`Failed to fetch invoices: ${errorData.message || response.statusText}`);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error('❌ Error fetching invoices:', error);
      setMessage('Error fetching invoices');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setInvoicesLoading(false);
    }
  };

  // Handle approval/rejection with specific discount data
  const handleItemActionWithDiscount = async (approvalId: string, action: 'approve' | 'reject', discountComments: string, discountAmountValue: number) => {
    try {
      setActionLoading(approvalId);
      console.log(`🔍 ${action}ing item approval ${approvalId} with discount...`);
      console.log(`🔍 Discount amount: ${discountAmountValue}, Comments: ${discountComments}`);

      // Check if the item is still pending before making the request
      const currentApproval = approvals.find(a => a._id === approvalId);
      if (!currentApproval) {
        setMessage(`❌ Item not found`);
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      if (currentApproval.status !== 'pending') {
        setMessage(`⚠️ This item has already been ${currentApproval.status}`);
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      const response = await fetch('/api/orders/approve-item', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          approvalId,
          action: action === 'approve' ? 'approved' : 'rejected',
          comments: discountComments.trim() || undefined,
          discountPercentage: 0, // Always 0 since we're using amount-based discount
          discountAmount: discountAmountValue || 0
        })
      });

      console.log(`📡 ${action} response status:`, response.status);
      console.log(`📡 ${action} response headers:`, Object.fromEntries(response.headers.entries()));
      console.log(`📡 ${action} response ok:`, response.ok);
      console.log(`📡 ${action} response type:`, response.type);

      if (response.ok) {
        let data;
        try {
          data = await response.json();
          console.log(`✅ Item ${action}d successfully with discount:`, data);
        } catch (jsonError) {
          const textData = await response.text();
          console.error(`❌ Failed to parse success response as JSON:`, textData);
          data = { message: 'Success but invalid JSON response' };
        }
        setMessage(`✅ Item ${action === 'approve' ? 'approved' : 'rejected'} successfully with discount!`);
        
        // Mark this item as recently processed
        setRecentlyProcessed(prev => new Set([...prev, approvalId]));
        
        // Clear the recently processed flag after a delay
        setTimeout(() => {
          setRecentlyProcessed(prev => {
            const newSet = new Set(prev);
            newSet.delete(approvalId);
            return newSet;
          });
          setProcessedWithDiscount(prev => {
            const newSet = new Set(prev);
            newSet.delete(approvalId);
            return newSet;
          });
        }, 3000);
        
        setTimeout(() => setMessage(""), 3000);
        
        // Refresh the approvals list
        await fetchPendingApprovals();
        console.log('🔄 Approvals list refreshed after approval with discount');
        
        // Close modal and reset form
        setShowActionModal(false);
        setSelectedApproval(null);
        setComments("");
        setDiscountPercentage(0);
        setDiscountAmount(0);
      } else {
        console.error(`❌ Response not OK - Status: ${response.status}, StatusText: ${response.statusText}`);
        
        let errorData;
        let responseText;
        try {
          responseText = await response.text();
          console.log(`📡 Raw response text:`, responseText);
          
          if (responseText.trim()) {
            try {
              errorData = JSON.parse(responseText);
            } catch (jsonError) {
              console.error(`❌ Failed to parse JSON:`, jsonError);
              errorData = { 
                message: `Server error: ${response.status} ${response.statusText}`,
                rawResponse: responseText
              };
            }
          } else {
            errorData = { message: `Empty response from server (${response.status})` };
          }
        } catch (parseError) {
          console.error(`❌ Failed to parse error response:`, parseError);
          console.error(`❌ Raw response text:`, responseText || 'No response text');
          errorData = { 
            message: `Server error: ${response.status} ${response.statusText}`,
            rawResponse: responseText || 'No response text'
          };
        }
        
        console.error(`❌ Failed to ${action} item:`, errorData);
        console.error(`❌ Response status:`, response.status);
        console.error(`❌ Response statusText:`, response.statusText);
        console.error(`❌ Full error details:`, {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorData
        });
        
        const errorMessage = errorData?.message || errorData?.error || `Server error: ${response.status} ${response.statusText}`;
        
        // Different styling for different error types
        if (response.status === 400) {
          setMessage(`⚠️ ${errorMessage}`);
        } else {
          setMessage(`❌ Failed to ${action} item: ${errorMessage}`);
        }
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error(`❌ Error ${action}ing item:`, error);
      setMessage(`❌ Error ${action}ing item: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle approval/rejection
  const handleItemAction = async (approvalId: string, action: 'approve' | 'reject') => {
    try {
      setActionLoading(approvalId);
      console.log(`🔍 ${action}ing item approval ${approvalId}...`);
      console.log(`🔍 Sending action: ${action === 'approve' ? 'approved' : 'rejected'} to backend`);

      // Check if the item is still pending before making the request
      const currentApproval = approvals.find(a => a._id === approvalId);
      if (!currentApproval) {
        setMessage(`❌ Item not found`);
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      if (currentApproval.status !== 'pending') {
        setMessage(`⚠️ This item has already been ${currentApproval.status}`);
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      const response = await fetch('/api/orders/approve-item', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          approvalId,
          action: action === 'approve' ? 'approved' : 'rejected', // Convert to backend expected format
          comments: comments.trim() || undefined,
          discountPercentage: 0, // Always 0 since we're using amount-based discount
          discountAmount: discountAmount || 0
        })
      });

      console.log(`📡 ${action} response status:`, response.status);
      console.log(`📡 ${action} response headers:`, Object.fromEntries(response.headers.entries()));
      console.log(`📡 ${action} response ok:`, response.ok);
      console.log(`📡 ${action} response type:`, response.type);

      if (response.ok) {
        let data;
        try {
          data = await response.json();
          console.log(`✅ Item ${action}d successfully:`, data);
        } catch (jsonError) {
          const textData = await response.text();
          console.error(`❌ Failed to parse success response as JSON:`, textData);
          data = { message: 'Success but invalid JSON response' };
        }
        setMessage(`✅ Item ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
        
        // Mark this item as recently processed
        setRecentlyProcessed(prev => new Set([...prev, approvalId]));
        
        // Clear the recently processed flag after a delay
        setTimeout(() => {
          setRecentlyProcessed(prev => {
            const newSet = new Set(prev);
            newSet.delete(approvalId);
            return newSet;
          });
          setProcessedWithDiscount(prev => {
            const newSet = new Set(prev);
            newSet.delete(approvalId);
            return newSet;
          });
        }, 3000);
        
        setTimeout(() => setMessage(""), 3000);
        
        // Refresh the approvals list
        await fetchPendingApprovals();
        console.log('🔄 Approvals list refreshed after approval');
        
        // Close modal and reset form
        setShowActionModal(false);
        setSelectedApproval(null);
        setComments("");
        setDiscountPercentage(0);
        setDiscountAmount(0);
      } else {
        console.error(`❌ Response not OK - Status: ${response.status}, StatusText: ${response.statusText}`);
        
        let errorData;
        let responseText;
        try {
          responseText = await response.text();
          console.log(`📡 Raw response text:`, responseText);
          
          if (responseText.trim()) {
            try {
              errorData = JSON.parse(responseText);
            } catch (jsonError) {
              console.error(`❌ Failed to parse JSON:`, jsonError);
              errorData = { 
                message: `Server error: ${response.status} ${response.statusText}`,
                rawResponse: responseText
              };
            }
          } else {
            errorData = { message: `Empty response from server (${response.status})` };
          }
        } catch (parseError) {
          console.error(`❌ Failed to parse error response:`, parseError);
          console.error(`❌ Raw response text:`, responseText || 'No response text');
          errorData = { 
            message: `Server error: ${response.status} ${response.statusText}`,
            rawResponse: responseText || 'No response text'
          };
        }
        
        console.error(`❌ Failed to ${action} item:`, errorData);
        console.error(`❌ Response status:`, response.status);
        console.error(`❌ Response statusText:`, response.statusText);
        console.error(`❌ Full error details:`, {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorData
        });
        
        const errorMessage = errorData?.message || errorData?.error || `Server error: ${response.status} ${response.statusText}`;
        
        // Different styling for different error types
        if (response.status === 400) {
          setMessage(`⚠️ ${errorMessage}`);
        } else {
          setMessage(`❌ Failed to ${action} item: ${errorMessage}`);
        }
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error(`❌ Error ${action}ing item:`, error);
      setMessage(`❌ Error ${action}ing item: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  // Open action modal
  const openActionModal = (approval: ItemApproval, action: 'approve' | 'reject') => {
    setSelectedApproval(approval);
    setActionType(action);
    setShowActionModal(true);
    setComments("");
    setDiscountPercentage(0);
    setDiscountAmount(0);
  };

  // Open view modal
  const openViewModal = (item: ItemApproval) => {
    setSelectedItem(item);
    setShowViewModal(true);
  };

  // Open edit modal
  const openEditModal = (item: ItemApproval) => {
    setSelectedItem(item);
    setEditData({
      quantity: 1, // This would come from the actual order item        
      unitPrice: item.product?.price || 0,
      total: item.originalAmount
    });
    setShowEditModal(true);
  };

  // Open discount modal
  const openDiscountModal = (item: ItemApproval) => {
    setSelectedItem(item);
    // Load existing discount data if item is already approved
    setDiscountAmount(item.discountAmount || 0);
    setComments(item.comments || ""); // Load existing comments
    setShowDiscountModal(true);
  };

  // Handle edit save
  const handleEditSave = async () => {
    if (!selectedItem) return;
    
    try {
      // Here you would call an API to update the order item
      console.log('Saving edit for item:', selectedItem._id, editData);
      setMessage('✅ Item updated successfully!');
      setTimeout(() => setMessage(""), 3000);
      setShowEditModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error saving edit:', error);
      setMessage('❌ Error updating item');
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Handle discount apply
  const handleDiscountApply = async () => {
    if (!selectedItem) return;
    
    try {
      console.log('🔍 Applying discount for item:', selectedItem._id, {
        amount: discountAmount,
        comments: comments,
        status: selectedItem.status
      });
      
      // Show loading state
      setMessage('🔄 Applying discount...');
      
      // Mark as processed with discount
      setProcessedWithDiscount(prev => new Set([...prev, selectedItem._id]));
      
      if (selectedItem.status === 'pending') {
        // For pending items, approve with discount
        await handleItemActionWithDiscount(selectedItem._id, 'approve', comments, discountAmount);
      } else if (selectedItem.status === 'approved') {
        // For already approved items, update discount
        await handleDiscountUpdate(selectedItem._id, discountAmount, comments);
      } else {
        setMessage('❌ Cannot apply discount to rejected items');
        setTimeout(() => setMessage(""), 3000);
        return;
      }
      
      // Close discount modal
      setShowDiscountModal(false);
      setSelectedItem(null);
      setDiscountAmount(0);
      setComments("");
      
    } catch (error) {
      console.error('Error applying discount:', error);
      setMessage('❌ Error applying discount');
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Handle discount update for already approved items
  const handleDiscountUpdate = async (approvalId: string, discountAmountValue: number, discountComments: string) => {
    try {
      setActionLoading(approvalId);
      console.log(`🔍 Updating discount for approved item ${approvalId}...`);
      console.log(`🔍 New discount amount: ${discountAmountValue}, Comments: ${discountComments}`);

      const response = await fetch('/api/orders/update-discount', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          approvalId,
          discountAmount: discountAmountValue || 0,
          comments: discountComments.trim() || undefined
        })
      });

      console.log(`📡 Update discount response status:`, response.status);
      console.log(`📡 Update discount response ok:`, response.ok);

      if (response.ok) {
        let data;
        try {
          data = await response.json();
          console.log(`✅ Discount updated successfully:`, data);
        } catch (jsonError) {
          const textData = await response.text();
          console.error(`❌ Failed to parse success response as JSON:`, textData);
          data = { message: 'Success but invalid JSON response' };
        }
        setMessage(`✅ Discount updated successfully!`);
        
        // Mark this item as recently processed
        setRecentlyProcessed(prev => new Set([...prev, approvalId]));
        
        // Clear the recently processed flag after a delay
        setTimeout(() => {
          setRecentlyProcessed(prev => {
            const newSet = new Set(prev);
            newSet.delete(approvalId);
            return newSet;
          });
          setProcessedWithDiscount(prev => {
            const newSet = new Set(prev);
            newSet.delete(approvalId);
            return newSet;
          });
        }, 3000);
        
        setTimeout(() => setMessage(""), 3000);
        
        // Refresh the approvals list
        await fetchPendingApprovals();
        console.log('🔄 Approvals list refreshed after discount update');
        
      } else {
        console.error(`❌ Response not OK - Status: ${response.status}, StatusText: ${response.statusText}`);
        
        let errorData;
        let responseText;
        try {
          responseText = await response.text();
          console.log(`📡 Raw response text:`, responseText);
          
          if (responseText.trim()) {
            try {
              errorData = JSON.parse(responseText);
            } catch (jsonError) {
              console.error(`❌ Failed to parse JSON:`, jsonError);
              errorData = { 
                message: `Server error: ${response.status} ${response.statusText}`,
                rawResponse: responseText
              };
            }
          } else {
            errorData = { message: `Empty response from server (${response.status})` };
          }
        } catch (parseError) {
          console.error(`❌ Failed to parse error response:`, parseError);
          console.error(`❌ Raw response text:`, responseText || 'No response text');
          errorData = { 
            message: `Server error: ${response.status} ${response.statusText}`,
            rawResponse: responseText || 'No response text'
          };
        }
        
        console.error(`❌ Failed to update discount:`, errorData);
        console.error(`❌ Response status:`, response.status);
        console.error(`❌ Response statusText:`, response.statusText);
        
        const errorMessage = errorData?.message || errorData?.error || `Server error: ${response.status} ${response.statusText}`;
        
        // Different styling for different error types
        if (response.status === 400) {
          setMessage(`⚠️ ${errorMessage}`);
        } else {
          setMessage(`❌ Failed to update discount: ${errorMessage}`);
        }
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error(`❌ Error updating discount:`, error);
      setMessage(`❌ Error updating discount: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle invoice creation for individual approved items
  const handleCreateInvoiceFromApproval = async (approval: ItemApproval) => {
    try {
      setInvoiceLoading(true);
      setSelectedItem(approval);
      setShowInvoiceModal(true);
      
      // Create simplified invoice data - only need orderId
      const invoiceData = {
        orderId: approval.orderId,
        orderNumber: approval.order.orderNumber,
        customer: approval.order.customer,
        product: approval.product,
        originalAmount: approval.originalAmount,
        discountAmount: approval.discountAmount || 0,
        finalAmount: approval.originalAmount - (approval.discountAmount || 0),
        category: approval.category
      };
      
      setInvoiceData(invoiceData);
      setMessage("📄 Preparing invoice for approved item...");
      setTimeout(() => setMessage(""), 3000);
      
    } catch (error) {
      console.error('❌ Error preparing invoice:', error);
      setMessage(`❌ Error preparing invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setInvoiceLoading(false);
    }
  };

  // Handle invoice creation API call
  const handleInvoiceCreate = async () => {
    try {
      setInvoiceLoading(true);
      console.log('🔍 Creating invoice from approved item...');
      console.log('🔍 Invoice data:', invoiceData);
      console.log('🔍 Order ID:', invoiceData?.orderId);
      
      const requestBody = {
        orderId: invoiceData?.orderId
      };
      console.log('🔍 Request body:', requestBody);
      
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(requestBody)
      });

      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Invoice created successfully:', result);
        const invoiceNumber = result.data?.invoiceNumber || result.invoiceNumber || 'Invoice created';
        
        // Set success message and show toast
        setMessage(`✅ Invoice created successfully: ${invoiceNumber}`);
        setSuccessMessage(`Invoice ${invoiceNumber} created successfully!`);
        setShowSuccessToast(true);
        setNewlyCreatedInvoice(invoiceNumber);
        
        // Close modal first
        setShowInvoiceModal(false);
        setInvoiceData(null);
        setSelectedItem(null);
        
        // Refresh the invoices list
        await fetchInvoices();
        
        // Hide toast after 5 seconds
        setTimeout(() => {
          setShowSuccessToast(false);
          setSuccessMessage('');
        }, 5000);
        
        // Remove highlight after 10 seconds
        setTimeout(() => {
          setNewlyCreatedInvoice(null);
        }, 10000);
        
        // Keep success message visible longer
        setTimeout(() => setMessage(""), 8000);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to create invoice:', errorData);
        setMessage(`❌ Failed to create invoice: ${errorData.message || 'Unknown error'}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('❌ Error creating invoice:', error);
      setMessage(`❌ Error creating invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setInvoiceLoading(false);
    }
  };

  // Fetch manager profile with assigned customers
  const fetchManagerProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log('🔍 Token check:', { 
        tokenExists: !!token, 
        tokenType: typeof token, 
        tokenLength: token?.length,
        tokenValue: token ? token.substring(0, 20) + '...' : 'null'
      });
      
      if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
        console.log('⚠️ No valid token found, cannot fetch manager profile');
        setAssignedCustomers([]);
        return;
      }

      console.log('🔍 Fetching manager profile with token...');
      const response = await fetch('/api/managers/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Manager profile response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Manager profile data received:', data);
        const manager = data.manager || data;
        const customers = manager.assignedCustomers || [];
        console.log('👥 Assigned customers from response:', customers);
        setAssignedCustomers(customers);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.log('⚠️ Could not fetch manager profile:', errorData);
        setAssignedCustomers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching manager profile:', error);
      setAssignedCustomers([]);
    }
  };

  useEffect(() => {
    console.log('🔍 Manager Approvals page loaded');
    console.log('🔍 Loading state:', loading);
    console.log('🔍 User state:', user);
    console.log('🔍 Token present:', typeof window !== 'undefined' && localStorage.getItem('token') ? 'Yes' : 'No');
    
    // Only fetch data if user is authenticated
    if (user && !userLoading) {
      console.log('🔍 User authenticated, fetching data...');
      fetchPendingApprovals();
      fetchInvoices();
      // Fetch manager profile if user is a manager
      if (user.isManager) {
        fetchManagerProfile();
      }
    } else {
      console.log('🔍 User not authenticated or still loading, skipping data fetch');
    }
  }, [user, userLoading]);

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {userLoading ? 'Loading user...' : 'Loading manager approvals...'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            If this takes too long, please check your internet connection or try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  console.log('🔍 Manager Approvals render - loading:', loading, 'user:', user);
  
  // Check if user has appropriate permissions for this page
  const hasManagerAccess = user?.roles?.some(role => 
    role.toLowerCase().includes('manager') || 
    role.toLowerCase().includes('admin')
  ) || user?.isManager || user?.isSuperAdmin;
  
  if (!hasManagerAccess) {
  return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You don't have permission to access the Manager Approvals page.
            </p>
            <p className="text-sm text-gray-500">
              Required roles: Manager, Admin, or Super Admin
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Your roles: {user?.roles?.join(', ') || 'None'}
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }
  
  return (
    <ProtectedRoute>
    <div className="w-full min-w-0 max-w-full overflow-x-hidden min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 p-3 sm:p-4">
      <Breadcrumb pageName="Manager Approvals" />
      <div className="mb-4 sm:mb-6 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/30 dark:border-gray-700 px-4 sm:px-6 py-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Manager Approvals</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Review, approve, or reject item-level requests with clear context and quick actions.</p>
      </div>

        {/* Success Toast Notification */}
        {showSuccessToast && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
            <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-green-800">{successMessage}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        const newInvoice = invoices.find(inv => inv.invoiceNumber === newlyCreatedInvoice);
                        if (newInvoice) {
                          router.push(`/invoices/${newInvoice._id}`);
                        }
                        setShowSuccessToast(false);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Invoice
                    </button>
                    <button
                      onClick={() => router.push('/invoices')}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 transition-colors"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      All Invoices
                    </button>
                  </div>
                </div>
                <div className="ml-3">
                  <button
                    type="button"
                    onClick={() => setShowSuccessToast(false)}
                    className="inline-flex text-green-400 hover:text-green-600 focus:outline-none focus:text-green-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {message && (
        <div className={`mb-4 p-4 rounded-lg border-l-4 ${
          message.includes('✅') ? 'bg-green-50 border-green-400 text-green-800 dark:bg-green-900/20 dark:text-green-200 dark:border-green-600' :
          message.includes('❌') ? 'bg-red-50 border-red-400 text-red-800 dark:bg-red-900/20 dark:text-red-200 dark:border-red-600' :
          'bg-blue-50 border-blue-400 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-600'
        }`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {message.includes('✅') ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : message.includes('❌') ? (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">{message}</p>
              {message.includes('✅') && message.includes('Invoice created successfully') && newlyCreatedInvoice && (
                <div className="mt-2">
                  <button
                    onClick={() => {
                      const newInvoice = invoices.find(inv => inv.invoiceNumber === newlyCreatedInvoice);
                      if (newInvoice) {
                        router.push(`/invoices/${newInvoice._id}`);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Created Invoice
                  </button>
                </div>
              )}
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  type="button"
                  onClick={() => setMessage("")}
                  className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    message.includes('✅') ? 'text-green-500 hover:bg-green-100 focus:ring-green-600' :
                    message.includes('❌') ? 'text-red-500 hover:bg-red-100 focus:ring-red-600' :
                    'text-blue-500 hover:bg-blue-100 focus:ring-blue-600'
                  }`}
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Quick Actions for Newly Created Invoice */}
        {newlyCreatedInvoice && (
          <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                    Invoice {newlyCreatedInvoice} Created Successfully!
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    Your invoice has been created and is ready for viewing or editing.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const newInvoice = invoices.find(inv => inv.invoiceNumber === newlyCreatedInvoice);
                    if (newInvoice) {
                      router.push(`/invoices/${newInvoice._id}`);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Invoice
                </button>
                <button
                  onClick={() => router.push('/invoices')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  All Invoices
                </button>
                <button
                  onClick={() => setNewlyCreatedInvoice(null)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Dismiss
                </button>
              </div>
            </div>
        </div>
      )}

      {/* Debug Information */}
      <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Debug Information</h3>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <p>User Loading: {userLoading ? 'Yes' : 'No'}</p>
          <p>Data Loading: {loading ? 'Yes' : 'No'}</p>
          <p>User: {user ? `${user.email} (${user.roles?.join(', ')})` : 'Not authenticated'}</p>
          <p>User ID: {user?.user_id || 'Not found'}</p>
          <p>Manager Profile: {user?.managerProfile ? 'Present' : 'Missing'}</p>
          <p>Manager ID: {user?.managerProfile?.manager_id || 'Not found'}</p>
          <p>Is Manager: {user?.isManager ? 'Yes' : 'No'}</p>
          <p>Manager Roles: {user?.roles?.filter(role => role.includes('manager') || role.includes('Manager')).join(', ') || 'None'}</p>
          <p>Approvals Count: {approvals.length}</p>
          <p>Invoices Count: {invoices.length}</p>
          <p>Token Present: {typeof window !== 'undefined' && localStorage.getItem('token') ? 'Yes' : 'No'}</p>
          <p>Current Time: {new Date().toLocaleTimeString()}</p>
          <p>Page Status: Manager Approvals Page is Working!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-title-md font-bold text-black dark:text-white">
                {approvals.length}
              </h4>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Pending Approvals</p>
            </div>
            <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
              <Clock className="h-6 w-6 text-meta-3" />
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-title-md font-bold text-black dark:text-white">
                {approvals.filter(a => a.status === 'pending').length}
              </h4>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Awaiting Action</p>
            </div>
            <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-title-md font-bold text-black dark:text-white">
                {new Set(approvals.map(a => a.orderId)).size}
              </h4>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Unique Orders</p>
            </div>
            <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
              <Package className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              Pending Item Approvals
            </h3>
          </div>

          {approvals.length === 0 ? (
            <div className="p-6 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No pending approvals found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                You have no items awaiting your approval
              </p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid gap-4">
                {approvals.map((approval) => (
                  <div key={approval._id} className={`border border-stroke rounded-lg p-4 dark:border-strokedark transition-all duration-500 ${
                    recentlyProcessed.has(approval._id) 
                      ? processedWithDiscount.has(approval._id)
                        ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'
                        : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                      : ''
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-black dark:text-white">
                            {approval.product?.name || 'Product Not Found'}
                          </h4>
                          {recentlyProcessed.has(approval._id) && (
                            <div className={`flex items-center gap-1 ${
                              processedWithDiscount.has(approval._id)
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-green-600 dark:text-green-400'
                            }`}>
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-xs font-medium">
                                {processedWithDiscount.has(approval._id) ? 'Approved with Discount' : 'Approved'}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Order: {approval.order.orderNumber}
                        </p>
                        {approval.order.status && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Order Status: <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              (approval.order.status === 'processing' || (approval.order.status === 'approved' && approval.status === 'approved'))
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200'
                                : approval.order.status === 'approved'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                                : approval.order.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
                                : approval.order.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200'
                            }`}>
                              {(approval.order.status === 'processing' || (approval.order.status === 'approved' && approval.status === 'approved')) ? '⚙️ Processing' : 
                               approval.order.status === 'approved' ? '✅ Approved' :
                               approval.order.status === 'pending' ? '⏳ Pending' :
                               approval.order.status === 'completed' ? '✅ Completed' :
                               approval.order.status}
                            </span>
                          </p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Category: {approval.category}
                        </p>
                        <div className="mt-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            approval.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
                              : approval.status === 'approved'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                          }`}>
                            {approval.status === 'pending' ? '⏳ Pending' : 
                             approval.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                          </span>
                          {approval.approvedAt && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              {new Date(approval.approvedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-black dark:text-white">
                          {approval.status === 'approved' && approval.discountAmount && approval.discountAmount > 0 ? (
                            <div className="text-right">
                              <div className="text-sm text-gray-500 line-through">
                                PKR {approval.originalAmount.toLocaleString()}
                              </div>
                              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                                PKR {(approval.originalAmount - (approval.discountAmount || 0)).toLocaleString()}
                              </div>
                              <div className="text-xs text-purple-600 dark:text-purple-400">
                                -PKR {(approval.discountAmount || 0).toLocaleString()} discount
                              </div>
                            </div>
                          ) : (
                            `PKR ${approval.originalAmount.toLocaleString()}`
                          )}
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          approval.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' :
                          approval.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                        }`}>
                          {approval.status}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {approval.product?.description || 'No description available'}
                      </p>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <p>Customer: {approval.order.customer.companyName}</p>
                        <p>Contact: {approval.order.customer.contactName}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {/* View Button */}
                        <button
                          onClick={() => openViewModal(approval)}
                          className="flex items-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                          title="View Details"
                        >
                          <Eye className="h-3 w-3" />
                          <span className="hidden sm:inline">View</span>
                        </button>

                        {/* Edit Button - Only for pending items */}
                        {approval.status === 'pending' && (
                          <button
                            onClick={() => openEditModal(approval)}
                            className="flex items-center gap-1 px-2 py-1.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm"
                            title="Edit Item"
                          >
                            <Edit className="h-3 w-3" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                        )}

                        {/* Discount Button - Only for pending items */}
                        {approval.status === 'pending' && (
                          <button
                            onClick={() => openDiscountModal(approval)}
                            className="flex items-center gap-1 px-2 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                            title="Apply Discount"
                          >
                            <Percent className="h-3 w-3" />
                            <span className="hidden sm:inline">Discount</span>
                          </button>
                        )}

                        {/* Action Buttons */}
                        {approval.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openActionModal(approval, 'approve')}
                              className="flex items-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                              title="Approve Item"
                            >
                              <CheckCircle className="h-3 w-3" />
                              <span className="hidden sm:inline">Approve</span>
                            </button>
                            <button
                              onClick={() => openActionModal(approval, 'reject')}
                              className="flex items-center gap-1 px-2 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                              title="Reject Item"
                            >
                              <XCircle className="h-3 w-3" />
                              <span className="hidden sm:inline">Reject</span>
                            </button>
                          </>
                        )}
                        
                        {/* Approved Item Actions */}
                        {approval.status === 'approved' && (
                          <>
                            <PermissionGate permission="invoices.create">
                              <button
                                onClick={() => handleCreateInvoiceFromApproval(approval)}
                                disabled={invoiceLoading}
                                className="flex items-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                                title="Create Invoice for this Item"
                              >
                                <Receipt className="h-3 w-3" />
                                <span className="hidden sm:inline">
                                  {invoiceLoading ? 'Creating...' : 'Invoice'}
                                </span>
                              </button>
                            </PermissionGate>
                            <button
                              onClick={() => openEditModal(approval)}
                              className="flex items-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                              title="Edit Approved Item"
                            >
                              <Edit className="h-3 w-3" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                              onClick={() => openDiscountModal(approval)}
                              className="flex items-center gap-1 px-2 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                              title="Modify Discount"
                            >
                              <Percent className="h-3 w-3" />
                              <span className="hidden sm:inline">Discount</span>
                            </button>
                          </>
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

      {/* Invoices Section */}
      <div className="mb-6 bg-white dark:bg-boxdark rounded-lg shadow-1">
        <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
          <div className="flex justify-between items-center">
            <div>
          <h3 className="font-medium text-black dark:text-white flex items-center gap-2">
            <Receipt className="h-5 w-5" />
                Invoices from My Approved Items
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage invoices created from items you approved
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={openCreateInvoiceModal}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors text-sm"
              >
                <Receipt className="h-4 w-4" />
                Create Invoice
              </button>
              <button
                onClick={() => router.push('/invoices')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
              >
                <Eye className="h-4 w-4" />
                View All
              </button>
            </div>
          </div>
        </div>
        
        {invoicesLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-6 text-center">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No invoices found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Invoices will appear here when items you approved are used to create invoices
            </p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid gap-4">
              {invoices.slice(0, 5).map((invoice) => (
                <div 
                  key={invoice._id} 
                  className={`border rounded-lg p-4 hover:shadow-md transition-all duration-300 ${
                    newlyCreatedInvoice === invoice.invoiceNumber 
                      ? 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-600 shadow-lg ring-2 ring-green-200 dark:ring-green-800' 
                      : 'border-stroke dark:border-strokedark'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-black dark:text-white">
                        {invoice.invoiceNumber}
                      </h4>
                        {newlyCreatedInvoice === invoice.invoiceNumber && (
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200 animate-pulse">
                            NEW
                          </span>
                        )}
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          invoice.status === 'draft' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' :
                          invoice.status === 'sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200' :
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Order: {invoice.orderNumber || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Customer: {invoice.customer?.name || invoice.customerName || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600 dark:text-green-400 text-lg">
                        {formatCurrency(invoice.total || 0)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Created: {formatDate(invoice.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => router.push(`/invoices/${invoice._id}`)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs"
                      title="View Invoice"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </button>
                    
                    <button
                      onClick={() => openEditInvoiceModal(invoice)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-xs"
                      title="Edit Invoice"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        handleDuplicateInvoice();
                      }}
                      className="flex items-center gap-1 px-2 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-xs"
                      title="Duplicate Invoice"
                    >
                      <FileText className="h-3 w-3" />
                      Duplicate
                    </button>
                    
                    <button
                      onClick={() => openStatusModal(invoice)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-xs"
                      title="Update Status"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Status
                    </button>
                    
                    <button
                      onClick={() => openPaymentModal(invoice)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                      title="Add Payment"
                    >
                      <DollarSign className="h-3 w-3" />
                      Payment
                    </button>
                    
                    <button
                      onClick={() => openDeleteInvoiceModal(invoice)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs"
                      title="Delete Invoice"
                    >
                      <XCircle className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {invoices.length > 5 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => router.push('/invoices')}
                  className="text-primary hover:text-primary-dark text-sm font-medium"
                >
                  View All Invoices ({invoices.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showActionModal && selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-black dark:text-white mb-4">
              {actionType === 'approve' ? 'Approve Item' : 'Reject Item'}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                <strong>Product:</strong> {selectedApproval.product?.name || 'Product Not Found'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                <strong>Order:</strong> {selectedApproval.order.orderNumber}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                <strong>Amount:</strong> PKR {selectedApproval.originalAmount.toLocaleString()}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-black dark:text-white mb-2">
                Comments
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                rows={3}
                placeholder="Add comments (optional)"
              />
            </div>

            {actionType === 'approve' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Discount Amount (PKR)
                </label>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                  min="0"
                  max={selectedApproval?.originalAmount || 0}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Maximum discount: PKR {selectedApproval?.originalAmount?.toLocaleString() || 0}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowActionModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleItemAction(selectedApproval._id, actionType)}
                disabled={actionLoading === selectedApproval._id}
                className={`px-4 py-2 rounded-md text-white ${
                  actionType === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {actionLoading === selectedApproval._id ? 'Processing...' : 
                 actionType === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-black dark:text-white">
                Order Item Details
              </h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-black dark:text-white">Product Information</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {selectedItem.product?.name || 'Product Not Found'}</p>
                  <p><strong>Description:</strong> {selectedItem.product?.description || 'No description available'}</p>
                  <p><strong>Price:</strong> PKR {selectedItem.product?.price?.toLocaleString() || '0'}</p>
                  <p><strong>Category:</strong> {selectedItem.category}</p>
                </div>
              </div>

              {/* Order Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-black dark:text-white">Order Information</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Order Number:</strong> {selectedItem.order.orderNumber}</p>
                  <p><strong>Customer:</strong> {selectedItem.order.customer.companyName}</p>
                  <p><strong>Contact:</strong> {selectedItem.order.customer.contactName}</p>
                  <p><strong>Email:</strong> {selectedItem.order.customer.email}</p>
                  <p><strong>Amount:</strong> PKR {selectedItem.originalAmount.toLocaleString()}</p>
                  <p><strong>Status:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      selectedItem.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' :
                      selectedItem.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                    }`}>
                      {selectedItem.status}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-black dark:text-white mb-4">
              Edit Order Item
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  value={selectedItem.product?.name || 'Product Not Found'}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  value={editData.quantity}
                  onChange={(e) => setEditData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Unit Price (PKR)
                </label>
                <input
                  type="number"
                  value={editData.unitPrice}
                  onChange={(e) => setEditData(prev => ({ ...prev, unitPrice: Number(e.target.value) }))}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Total Amount (PKR)
                </label>
                <input
                  type="number"
                  value={editData.total}
                  onChange={(e) => setEditData(prev => ({ ...prev, total: Number(e.target.value) }))}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                  min="0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-black dark:text-white mb-4">
              {selectedItem.status === 'pending' ? 'Apply Discount' : 'Update Discount'}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                <strong>Product:</strong> {selectedItem.product?.name || 'Product Not Found'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                <strong>Original Amount:</strong> PKR {selectedItem.originalAmount.toLocaleString()}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Discount Amount (PKR)
                </label>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                  min="0"
                  max={selectedItem.originalAmount}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Maximum discount: PKR {selectedItem.originalAmount.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Comments (Optional)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                  rows={3}
                  placeholder="Add comments about the discount (optional)"
                />
              </div>

              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Original Amount:</strong> PKR {selectedItem.originalAmount.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Discount Amount:</strong> PKR {discountAmount.toLocaleString()}
                </p>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  <strong>Final Amount:</strong> PKR {(selectedItem.originalAmount - discountAmount).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowDiscountModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscountApply}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                {selectedItem.status === 'pending' ? 'Approve with Discount' : 'Update Discount'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedItem && invoiceData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-black dark:text-white mb-4">
              Create Invoice for Approved Item
            </h3>
            
            <div className="space-y-4">
              {/* Item Details */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium text-black dark:text-white mb-2">Item Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Product:</span>
                    <span className="ml-2 text-black dark:text-white">{selectedItem.product?.name || 'Product Not Found'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Order:</span>
                    <span className="ml-2 text-black dark:text-white">{selectedItem.order.orderNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                    <span className="ml-2 text-black dark:text-white">{selectedItem.order.customer.companyName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Category:</span>
                    <span className="ml-2 text-black dark:text-white">{selectedItem.category}</span>
                  </div>
                </div>
              </div>

              {/* Pricing Details */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium text-black dark:text-white mb-2">Pricing Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Original Amount:</span>
                    <span className="text-black dark:text-white">PKR {selectedItem.originalAmount.toLocaleString()}</span>
                  </div>
                  {selectedItem.discountAmount && selectedItem.discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                      <span className="text-red-600 dark:text-red-400">-PKR {selectedItem.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Final Amount:</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      PKR {(selectedItem.originalAmount - (selectedItem.discountAmount || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Invoice Preview */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium text-black dark:text-white mb-2">Invoice Preview</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>This will create an invoice for the approved item with the following details:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Invoice will be generated for {selectedItem.order.customer.companyName}</li>
                    <li>Item: {selectedItem.product?.name || 'Product Not Found'}</li>
                    <li>Total Amount: PKR {(selectedItem.originalAmount - (selectedItem.discountAmount || 0)).toLocaleString()}</li>
                    <li>Invoice will be available in the Invoices section</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setInvoiceData(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleInvoiceCreate}
                disabled={invoiceLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {invoiceLoading ? 'Creating Invoice...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-black dark:text-white mb-4">Create New Invoice</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={invoiceFormData.customerName}
                  onChange={(e) => setInvoiceFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                  placeholder="Enter customer name"
                />
    </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Customer Email
                </label>
                <input
                  type="email"
                  value={invoiceFormData.customerEmail}
                  onChange={(e) => setInvoiceFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                  placeholder="Enter customer email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Notes
                </label>
                <textarea
                  value={invoiceFormData.notes}
                  onChange={(e) => setInvoiceFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                  rows={3}
                  placeholder="Enter invoice notes (optional)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateInvoiceModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={invoiceLoading}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {invoiceLoading ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {showEditInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-black dark:text-white mb-4">Edit Invoice</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={invoiceFormData.customerName}
                  onChange={(e) => setInvoiceFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Customer Email
                </label>
                <input
                  type="email"
                  value={invoiceFormData.customerEmail}
                  onChange={(e) => setInvoiceFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Notes
                </label>
                <textarea
                  value={invoiceFormData.notes}
                  onChange={(e) => setInvoiceFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowEditInvoiceModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateInvoice}
                disabled={invoiceLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {invoiceLoading ? 'Updating...' : 'Update Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Invoice Modal */}
      {showDeleteInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-black dark:text-white mb-4">Delete Invoice</h3>
            
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                Are you sure you want to delete this invoice?
              </p>
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                <p className="font-medium text-black dark:text-white">{selectedInvoice.invoiceNumber}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Customer: {selectedInvoice.customer?.name || selectedInvoice.customerName || 'N/A'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Amount: {formatCurrency(selectedInvoice.total || 0)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteInvoiceModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteInvoice}
                disabled={invoiceLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {invoiceLoading ? 'Deleting...' : 'Delete Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-black dark:text-white mb-4">Update Invoice Status</h3>
            
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                Invoice: {selectedInvoice.invoiceNumber}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current Status: {selectedInvoice.status}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-black dark:text-white mb-2">
                New Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled')}
                className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={invoiceLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {invoiceLoading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-black dark:text-white mb-4">Add Payment</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Invoice: {selectedInvoice.invoiceNumber} | Total: {formatCurrency(selectedInvoice.total || 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Paid: {formatCurrency(selectedInvoice.paidAmount || 0)} | Remaining: {formatCurrency((selectedInvoice.total || 0) - (selectedInvoice.paidAmount || 0))}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Payment Amount
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                  min="0"
                  max={(selectedInvoice.total || 0) - (selectedInvoice.paidAmount || 0)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Payment Notes
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2 border border-stroke rounded-md dark:border-strokedark dark:bg-boxdark dark:text-white"
                  rows={3}
                  placeholder="Enter payment notes (optional)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPayment}
                disabled={invoiceLoading || paymentAmount <= 0}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {invoiceLoading ? 'Adding...' : 'Add Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </ProtectedRoute>
  );
}