"use client";

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    _id: string;
    companyName: string;
    contactName: string;
    email: string;
  };
  status: string;
  total: number;
  orderDate: string;
  createdAt: string;
  items: any[];
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'on_hold': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
    case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    case 'processing': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    case 'allocated': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
    case 'dispatched': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400';
    case 'shipped': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
};

export default function OrderStatusPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const router = useRouter();

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Handle status update
  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem("token");
      
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        await fetchOrders(); // Refresh the list
      } else {
        console.error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  // Handle delete order
  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Are you sure you want to delete order ${orderNumber}?`)) return;
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem("token");
      
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      
      if (response.ok) {
        await fetchOrders(); // Refresh the list
      } else {
        console.error('Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  // Filter orders based on search term and status
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = searchTerm === "" || 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.contactName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "" || 
        order.status.toLowerCase() === statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  return (
    <ProtectedRoute requiredPermission="orders.read">
      <Breadcrumb pageName="Order Status" />
      
      {/* Status Overview */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h3 className="text-2xl font-bold text-blue-600">{orders.length}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h3 className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h3 className="text-2xl font-bold text-red-600">{orders.filter(o => o.status === 'rejected').length}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Rejected</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h3 className="text-2xl font-bold text-blue-600">{orders.filter(o => o.status === 'active').length}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h3 className="text-2xl font-bold text-purple-600">{orders.filter(o => o.status === 'processing').length}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Processing</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h3 className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'completed').length}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
        </div>
      </div>

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="flex items-center justify-between border-b border-stroke px-7 py-4 dark:border-dark-3">
          <h3 className="font-medium text-dark dark:text-white">
            Order Status Overview
          </h3>
          <div className="flex gap-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-stroke bg-transparent px-3 py-1 text-sm text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="on_hold">On Hold</option>
              <option value="dispatched">Dispatched</option>
            </select>
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded border border-stroke bg-transparent px-3 py-1 text-sm text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>
        </div>
        
        <div className="p-7">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-left dark:bg-dark-2">
                  <th className="px-4 py-3 font-medium text-dark dark:text-white">Order ID</th>
                  <th className="px-4 py-3 font-medium text-dark dark:text-white">Customer</th>
                  <th className="px-4 py-3 font-medium text-dark dark:text-white">Items</th>
                  <th className="px-4 py-3 font-medium text-dark dark:text-white">Amount</th>
                  <th className="px-4 py-3 font-medium text-dark dark:text-white">Date</th>
                  <th className="px-4 py-3 font-medium text-dark dark:text-white">Status</th>
                  <th className="px-4 py-3 font-medium text-dark dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex items-center justify-center">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
                        <span className="ml-2">Loading orders...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr key={order._id} className="border-b border-stroke dark:border-dark-3">
                      <td className="px-4 py-3 text-dark dark:text-white font-medium">
                        {order.orderNumber}
                      </td>
                      <td className="px-4 py-3 text-dark dark:text-white">
                        <div>
                          <div className="font-medium">{order.customer.companyName}</div>
                          <div className="text-sm text-gray-500">{order.customer.contactName}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-dark dark:text-white">
                        {order.items.length} items
                      </td>
                      <td className="px-4 py-3 text-dark dark:text-white font-medium">
                        PKR {order.total.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-dark dark:text-white">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                          className={`rounded-full px-3 py-1 text-xs font-medium border-0 ${getStatusColor(order.status)}`}
                        >
                          <option value="on_hold">On Hold</option>
                          <option value="dispatched">Dispatched</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => router.push(`/orders/${order._id}`)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm"
                          >
                            View
                          </button>
                          <PermissionGate permission="orders.update">
                            <button 
                              onClick={() => router.push(`/orders/${order._id}/edit`)}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 text-sm"
                            >
                              Edit
                            </button>
                          </PermissionGate>
                          <PermissionGate permission="orders.delete">
                            <button 
                              onClick={() => handleDeleteOrder(order._id, order.orderNumber)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 text-sm"
                            >
                              Delete
                            </button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No orders found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredOrders.length} of {orders.length} orders
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm border border-stroke rounded dark:border-dark-3 text-dark dark:text-white hover:bg-gray-50 dark:hover:bg-dark-2">
                Previous
              </button>
              <button className="px-3 py-1 text-sm border border-stroke rounded dark:border-dark-3 text-dark dark:text-white hover:bg-gray-50 dark:hover:bg-dark-2">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
