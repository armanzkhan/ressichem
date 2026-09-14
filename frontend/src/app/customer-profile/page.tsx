'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CustomerLayout from '../../components/Layouts/CustomerLayout';

interface Customer {
  _id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  address?: string;
  assignedManager?: {
    manager_id: {
      _id: string;
      user_id: string;
      assignedCategories: Array<{
        category: string;
        isActive: boolean;
      }>;
    };
    assignedBy: string;
    assignedAt: string;
    isActive: boolean;
  };
}

export default function CustomerProfile() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  useEffect(() => {
    fetchCustomerData();
  }, []);

  const fetchCustomerData = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch('/api/customers/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomer(data.customer);
        setMessage('✅ Profile loaded successfully!');
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to load profile: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      setMessage('❌ Error loading profile');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading Profile...</h2>
        </div>
      </div>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded ${
              message.startsWith('✅') 
                ? 'bg-green-100 border border-green-400 text-green-700' 
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {message}
            </div>
          )}

          {/* Profile Information */}
          {customer && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Company Information</h2>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <p className="text-lg text-gray-900">{customer.companyName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                    <p className="text-lg text-gray-900">{customer.contactName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-lg text-gray-900">{customer.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-lg text-gray-900">{customer.phone || 'Not provided'}</p>
                  </div>
                </div>

                {customer.address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <p className="text-lg text-gray-900">{customer.address}</p>
                  </div>
                )}

                {/* Manager Assignment */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Manager Assignment</h3>
                  
                  {customer.assignedManager ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <span className="text-green-600 text-sm font-medium">✅ Assigned to Manager</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Assigned on: {new Date(customer.assignedManager.assignedAt).toLocaleDateString()}</p>
                        <p>Status: {customer.assignedManager.isActive ? 'Active' : 'Inactive'}</p>
                      </div>
                      
                      {customer.assignedManager.manager_id.assignedCategories.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Manager Categories:</h4>
                          <div className="flex flex-wrap gap-2">
                            {customer.assignedManager.manager_id.assignedCategories.map((category, index) => (
                              <span
                                key={index}
                                className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                              >
                                {category.category}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <span className="text-yellow-600 text-sm font-medium">⚠️ No Manager Assigned</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        You haven't been assigned to a manager yet. Contact support for assistance.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
      </div>
    </CustomerLayout>
  );
}
