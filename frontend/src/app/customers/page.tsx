"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import { getAuthHeaders, handleAuthError } from "@/lib/auth";
import { Search, Plus, Filter, Download, MoreVertical, Edit, Trash2, Eye, Phone, Mail, MapPin, Building, User, Calendar, DollarSign, Wifi, WifiOff } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useRealtimeCustomers } from "@/hooks/useRealtimeCustomers";

type Customer = {
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
};

export default function CustomersPage() {
  const router = useRouter();
  
  // Use real-time customers hook
  const { customers, isConnected, refreshCustomers, addCustomer, updateCustomer, removeCustomer } = useRealtimeCustomers();
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [formData, setFormData] = useState<Customer>({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "Pakistan",
    status: "active",
    customerType: "regular",
  });

  const API_URL = "/api/customers";

  // ✅ Fetch customers (now using real-time hook)
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      await refreshCustomers();
    } catch (err: any) {
      console.error("❌ Error fetching customers:", err);
      toast.error(err.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please log in to access customers");
      router.push("/auth/sign-in");
      return;
    }
    
    fetchCustomers();
  }, [router]);

  // Auto-refresh every 30 seconds to ensure data is up-to-date
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing customers data...');
      fetchCustomers();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // ✅ Add / Update customer
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const method = editingCustomer ? "PUT" : "POST";
      const url = editingCustomer ? `${API_URL}/${editingCustomer._id}` : API_URL;

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        if (handleAuthError(res.status, "Please log in to save customers")) {
          return;
        }
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save customer");
      }

      toast.success(editingCustomer ? "Customer updated successfully" : "Customer added successfully");
      resetForm();
      fetchCustomers();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error saving customer");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Edit existing customer
  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      companyName: customer.companyName || "",
      contactName: customer.contactName || "",
      email: customer.email || "",
      phone: customer.phone || "",
      street: customer.street || "",
      city: customer.city || "",
      state: customer.state || "",
      zip: customer.zip || "",
      country: customer.country || "Pakistan",
      status: customer.status || "active",
      customerType: customer.customerType || "regular",
    });
    setShowAddForm(true);
  };

  // ✅ Delete customer
  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const res = await fetch(`${API_URL}/${id}`, { 
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        if (handleAuthError(res.status, "Please log in to delete customers")) {
          return;
        }
        const errorData = await res.json();
        throw new Error(errorData.error || "Delete failed");
      }

      // Remove customer from local state immediately
      removeCustomer(id);
      toast.success("Customer deleted successfully");
      
      // The real-time hook will automatically refresh the list
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error deleting customer");
    }
  };

  // ✅ Change status (active/inactive/suspended)
  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      
      if (!res.ok) {
        if (handleAuthError(res.status, "Please log in to update customer status")) {
          return;
        }
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      toast.success("Status updated successfully");
      fetchCustomers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error updating status");
    }
  };

  // ✅ Reset form
  const resetForm = () => {
    setFormData({
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "Pakistan",
      status: "active",
      customerType: "regular",
    });
    setEditingCustomer(null);
    setShowAddForm(false);
  };

  // ✅ Filter customers
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ✅ Pagination logic
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  // ✅ Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // ✅ Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <ProtectedRoute requiredPermission="customers.read">
      <div className="w-full min-w-0">
        <Breadcrumb pageName="Customers" />
        
        {/* Real-time Connection Status */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Wifi className="w-4 h-4" />
                <span className="text-sm font-medium">Real-time Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-medium">Real-time Disconnected</span>
              </div>
            )}
          </div>
          <Button
            onClick={fetchCustomers}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Refresh
          </Button>
        </div>
        
        {/* Header Section */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 xl:p-8">
            <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6">
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-blue-900 dark:text-white truncate">
                Customer Management
              </h1>
                  <p className="text-blue-700 dark:text-blue-300 text-xs sm:text-sm lg:text-base mt-1 truncate">
                Manage your customer relationships and track their status
              </p>
            </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={fetchCustomers}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg sm:rounded-xl border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-center font-medium text-gray-700 hover:border-blue-900 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-blue-400 disabled:opacity-50 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base"
                >
                  <svg className={`mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Refresh</span>
                  <span className="sm:hidden">↻</span>
                </button>
                <PermissionGate permission="customers.create">
                  <button 
                  onClick={() => router.push('/customers/create')}
                    className="inline-flex items-center justify-center rounded-lg sm:rounded-xl bg-blue-900 px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-3 text-center font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/50 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base"
                  >
                    <svg className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">Add Customer</span>
                    <span className="sm:hidden">Add</span>
                  </button>
              </PermissionGate>
                <button className="inline-flex items-center justify-center rounded-lg sm:rounded-xl border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-center font-medium text-gray-700 hover:border-gray-500 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-gray-400 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base">
                  <svg className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">Export</span>
                  <span className="sm:hidden">Export</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 xl:gap-6">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 hover:shadow-lg sm:hover:shadow-xl lg:hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] lg:hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Total Customers</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {customers.length}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">All customers</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
              </div>
              </div>
            </div>
          
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 hover:shadow-lg sm:hover:shadow-xl lg:hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] lg:hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Active</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {customers.filter(c => c.status === 'active').length}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">Active customers</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
              </div>
              </div>
            </div>
          
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 hover:shadow-lg sm:hover:shadow-xl lg:hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] lg:hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Inactive</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {customers.filter(c => c.status === 'inactive').length}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">Inactive customers</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
              </div>
              </div>
            </div>
          
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 hover:shadow-lg sm:hover:shadow-xl lg:hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] lg:hover:scale-105 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Total Revenue</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    PKR {customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">Total earnings</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col gap-2 sm:gap-3 lg:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                  placeholder="Search customers by name, contact, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 pl-8 sm:pl-10 lg:pl-12 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                />
                  <svg className="absolute left-2 sm:left-3 lg:left-4 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
              </div>
                </div>
              <div className="sm:w-48">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 pr-6 sm:pr-8 lg:pr-10 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 appearance-none transition-all duration-300 text-xs sm:text-sm lg:text-base"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <svg className="absolute right-1.5 sm:right-2 lg:right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Add/Edit Customer Form */}
        {showAddForm && (
          <Card className="mb-8 shadow-xl border-2 border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  {editingCustomer ? <Edit className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <CardTitle className="text-xl text-blue-900 dark:text-white">
                    {editingCustomer ? "Edit Customer" : "Add New Customer"}
                  </CardTitle>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {editingCustomer ? "Update customer information" : "Create a new customer profile"}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSaveCustomer} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-900 dark:text-white">
                    <Building className="h-5 w-5 text-blue-900 dark:text-blue-400" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Company Name *
                      </label>
                      <Input
                        placeholder="Enter company name"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        required
                        className="h-12"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Contact Name *
                      </label>
                      <Input
                        placeholder="Enter contact name"
                        value={formData.contactName}
                        onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                        required
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-900 dark:text-white">
                    <Phone className="h-5 w-5 text-blue-900 dark:text-blue-400" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Email Address *
                      </label>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="h-12"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Phone Number *
                      </label>
                      <Input
                        placeholder="Enter phone number"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-900 dark:text-white">
                    <MapPin className="h-5 w-5 text-blue-900 dark:text-blue-400" />
                    Address Information
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Street Address *
                      </label>
                      <Input
                        placeholder="Enter street address"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        required
                        className="h-12"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                          City *
                        </label>
                        <Input
                          placeholder="Enter city"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          required
                          className="h-12"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                          State/Province
                        </label>
                        <Input
                          placeholder="Enter state/province"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className="h-12"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                          ZIP/Postal Code
                        </label>
                        <Input
                          placeholder="Enter ZIP/postal code"
                          value={formData.zip}
                          onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                          className="h-12"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Country
                      </label>
                      <Input
                        placeholder="Enter country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>

                {/* Status and Type */}
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-900 dark:text-white">
                    <User className="h-5 w-5 text-blue-900 dark:text-blue-400" />
                    Customer Status & Type
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Status
                      </label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Customer Type
                      </label>
                      <Select
                        value={formData.customerType}
                        onValueChange={(value) => setFormData({ ...formData, customerType: value })}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select customer type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="vip">VIP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 h-12 bg-primary hover:bg-primary/90"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Saving...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {editingCustomer ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {editingCustomer ? "Update Customer" : "Add Customer"}
                      </div>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    className="flex-1 h-12"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Customer List */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4 lg:mb-6">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-blue-900 dark:text-white">Customers</h2>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
                </div>
            </div>
          
            {loading ? (
            <div className="flex items-center justify-center py-6 sm:py-8 lg:py-12">
              <div className="text-center">
                <div className="inline-block h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 animate-spin rounded-full border-2 border-solid border-green-500 border-r-transparent"></div>
                <p className="mt-2 sm:mt-3 lg:mt-4 text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400">Loading customers...</p>
              </div>
              </div>
          ) : filteredCustomers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 xl:gap-6">
                  {paginatedCustomers.map((customer) => (
                <div key={customer._id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 hover:shadow-lg sm:hover:shadow-xl lg:hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] lg:hover:scale-105">
                  <div className="flex items-start justify-between mb-2 sm:mb-3 lg:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-blue-900 dark:text-white text-xs sm:text-sm lg:text-lg truncate">
                                {customer.companyName}
                              </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                          {customer.contactName}
                        </p>
                            </div>
                            </div>
                    
                    <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium ${
                        customer.status === 'active'
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : customer.status === 'inactive'
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}>
                              {customer.status}
                      </span>
                          </div>
                        </div>
                        
                  <div className="space-y-1.5 sm:space-y-2 lg:space-y-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <a href={`mailto:${customer.email}`} className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline truncate">
                              {customer.email}
                            </a>
                          </div>
                    
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <a href={`tel:${customer.phone}`} className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline">
                              {customer.phone}
                            </a>
                        </div>
                        
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                        {customer.city}, {customer.state}
                      </span>
                    </div>
                        </div>
                        
                  <div className="mt-3 sm:mt-4 flex items-center justify-between">
                    <div className="flex gap-1 sm:gap-2">
                      <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium text-gray-800 dark:text-gray-200">
                              {customer.customerType || "regular"}
                      </span>
                            {customer.totalOrders && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium text-blue-800 dark:text-blue-200">
                                {customer.totalOrders} orders
                        </span>
                            )}
                          </div>
                    
                    <div className="flex gap-1 sm:gap-1.5">
                      <PermissionGate permission="customers.update">
                        <button 
                                onClick={() => handleEdit(customer)}
                          className="p-1 sm:p-1.5 lg:p-2 rounded-md sm:rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          title="Edit Customer"
                        >
                          <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                            </PermissionGate>
                      <PermissionGate permission="customers.delete">
                        <button 
                                onClick={() => handleDelete(customer._id)}
                          className="p-1 sm:p-1.5 lg:p-2 rounded-md sm:rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          title="Delete Customer"
                        >
                          <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                            </PermissionGate>
                          </div>
                        </div>
                </div>
                  ))}
                </div>
          ) : (
            <div className="text-center py-6 sm:py-8 lg:py-12">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 lg:mb-4">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-blue-900 dark:text-white mb-1 sm:mb-2">
                {searchTerm || statusFilter !== "all" 
                  ? "No customers match your search criteria" 
                  : "No customers found"
                }
                          </h3>
              <p className="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filter criteria" 
                  : "Add your first customer to get started"
                }
              </p>
              {!searchTerm && statusFilter === "all" && (
                <PermissionGate permission="customers.create">
                  <button 
                    onClick={() => router.push('/customers/create')} 
                    className="inline-flex items-center justify-center rounded-md sm:rounded-lg bg-blue-900 px-3 py-2 sm:px-4 sm:py-3 text-center font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/50 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base"
                  >
                    <svg className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add First Customer
                  </button>
                          </PermissionGate>
              )}
                        </div>
          )}
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredCustomers.length)} of {filteredCustomers.length} customers
                    </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        Previous
                  </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          const page = i + 1;
                          return (
                        <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                          className={`px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-300 ${
                            currentPage === page
                              ? "bg-blue-900 text-white"
                              : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                          }`}
                            >
                              {page}
                        </button>
                          );
                        })}
                      </div>
                      
                  <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        Next
                  </button>
                </div>
              </div>
                    </div>
                  </div>
                )}
      </div>
    </ProtectedRoute>
  );
}
