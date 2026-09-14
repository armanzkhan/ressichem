'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Customer {
  _id: string;
  companyName: string;
  contactName: string;
  email: string;
  assignedManager?: {
    manager_id: string;
    assignedBy: string;
    assignedAt: string;
    isActive: boolean;
    notes: string;
  };
}

interface Manager {
  _id: string;
  user_id: string;
  assignedCategories: Array<{
    category: string;
    isActive: boolean;
  }>;
  managerLevel: string;
}

export default function CustomerAssignment() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/sign-in");
        return;
      }

      // Fetch customers
      const customersResponse = await fetch('/api/customers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (customersResponse.ok) {
        const customersData = await customersResponse.json();
        setCustomers(customersData.customers || []);
      }

      // Fetch managers
      const managersResponse = await fetch('/api/managers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (managersResponse.ok) {
        const managersData = await managersResponse.json();
        setManagers(managersData.managers || []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedManager) {
      setMessage('Please select both customer and manager');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/customers/assign-manager', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: selectedCustomer,
          managerId: selectedManager,
          notes: assignmentNotes
        }),
      });

      if (response.ok) {
        setMessage('Customer assigned to manager successfully');
        setSelectedCustomer('');
        setSelectedManager('');
        setAssignmentNotes('');
        fetchData(); // Refresh data
      } else {
        const data = await response.json();
        setMessage(data.message || 'Assignment failed');
      }
    } catch (error) {
      console.error('Assignment error:', error);
      setMessage('Assignment failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Customer Assignment</h1>
          <p className="text-gray-600">Assign customers to managers for personalized service</p>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assignment Form */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Assign Customer to Manager</h2>
            
            <form onSubmit={handleAssignment} className="space-y-6">
              <div>
                <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
                  Select Customer
                </label>
                <select
                  id="customer"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  required
                >
                  <option value="">Choose a customer...</option>
                  {customers.map((customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.companyName} - {customer.contactName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="manager" className="block text-sm font-medium text-gray-700">
                  Select Manager
                </label>
                <select
                  id="manager"
                  value={selectedManager}
                  onChange={(e) => setSelectedManager(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  required
                >
                  <option value="">Choose a manager...</option>
                  {managers.map((manager) => (
                    <option key={manager._id} value={manager._id}>
                      {manager.user_id} - {manager.managerLevel} ({manager.assignedCategories.length} categories)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Assignment Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Add any notes about this assignment..."
                />
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Assign Customer to Manager
              </button>
            </form>
          </div>

          {/* Current Assignments */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Current Assignments</h2>
            
            <div className="space-y-4">
              {customers.filter(c => c.assignedManager).map((customer) => (
                <div key={customer._id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{customer.companyName}</h3>
                      <p className="text-sm text-gray-500">{customer.contactName}</p>
                      <p className="text-sm text-gray-500">{customer.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Assigned
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(customer.assignedManager!.assignedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {customer.assignedManager!.notes && (
                    <p className="text-sm text-gray-600 mt-2">
                      Notes: {customer.assignedManager!.notes}
                    </p>
                  )}
                </div>
              ))}
              
              {customers.filter(c => !c.assignedManager).length > 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    {customers.filter(c => !c.assignedManager).length} customers not assigned
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
