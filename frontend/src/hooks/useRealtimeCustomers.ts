'use client';

import { useEffect, useState, useCallback } from 'react';
import realtimeNotificationService from '@/services/realtimeNotificationService';

interface RealtimeNotification {
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: string;
  data?: any;
}
import { getAuthHeaders } from '@/lib/auth';

interface Customer {
  _id?: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  status: string;
  customerType?: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrderDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UseRealtimeCustomersReturn {
  customers: Customer[];
  isConnected: boolean;
  refreshCustomers: () => Promise<void>;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  removeCustomer: (customerId: string) => void;
}

export const useRealtimeCustomers = (): UseRealtimeCustomersReturn => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Fetch customers from API
  const fetchCustomers = useCallback(async () => {
    try {
      const response = await fetch('/api/customers', {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const customersData = Array.isArray(data) ? data : data.customers || [];
        setCustomers(customersData);
        console.log('🔄 Customers refreshed from API:', customersData.length);
      }
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
    }
  }, []);

  // Handle real-time notifications for customer updates
  const handleRealtimeNotification = useCallback((notification: RealtimeNotification) => {
    console.log('🔔 Customer real-time notification received:', notification);
    
    // Check if this is a customer-related notification
    if (notification.data?.entityType === 'customer') {
      const action = notification.data.action;
      const customerId = notification.data.entityId;
      
      console.log(`🔄 Customer ${action} notification:`, { action, customerId });
      
      // Refresh customers list when customer data changes
      fetchCustomers();
      
      // Show a toast notification
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            tag: `customer_${action}`,
          });
        } catch (error) {
          console.log('Browser notification failed:', error);
        }
      }
    }
  }, [fetchCustomers]);

  // Add customer to local state
  const addCustomer = useCallback((customer: Customer) => {
    setCustomers(prev => [customer, ...prev]);
    console.log('➕ Customer added to local state:', customer.companyName);
  }, []);

  // Update customer in local state
  const updateCustomer = useCallback((updatedCustomer: Customer) => {
    setCustomers(prev => 
      prev.map(customer => 
        customer._id === updatedCustomer._id ? updatedCustomer : customer
      )
    );
    console.log('✏️ Customer updated in local state:', updatedCustomer.companyName);
  }, []);

  // Remove customer from local state
  const removeCustomer = useCallback((customerId: string) => {
    setCustomers(prev => prev.filter(customer => customer._id !== customerId));
    console.log('🗑️ Customer removed from local state:', customerId);
  }, []);

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Set up real-time connection and listeners
  useEffect(() => {
    if (!isClient) return;
    
    console.log('🔌 Setting up real-time customer updates...');
    
    // Add notification listener for customer updates
    realtimeNotificationService.addListener(handleRealtimeNotification);
    
    // Connect to WebSocket
    realtimeNotificationService.connect();
    
    // Check connection status periodically
    const statusInterval = setInterval(() => {
      const status = realtimeNotificationService.getConnectionStatus();
      setIsConnected(status.isConnected);
    }, 1000);

    // Initial fetch
    fetchCustomers();

    return () => {
      console.log('🔌 Cleaning up real-time customer updates...');
      realtimeNotificationService.removeListener(handleRealtimeNotification);
      clearInterval(statusInterval);
    };
  }, [isClient, handleRealtimeNotification, fetchCustomers]);

  return {
    customers,
    isConnected,
    refreshCustomers: fetchCustomers,
    addCustomer,
    updateCustomer,
    removeCustomer
  };
};
