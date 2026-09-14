"use client";

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRealtimeUsers } from "@/hooks/useRealtimeUsers";
import { Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface User {
  _id: string;
  user_id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  company_id: string;
  isActive?: boolean;
  isSuperAdmin?: boolean;
  isCompanyAdmin?: boolean;
  isCustomer?: boolean;
  isManager?: boolean;
  customerProfile?: {
    customer_id: string;
    companyName: string;
    customerType: string;
    assignedManager?: {
      manager_id: string;
      assignedBy: string;
      assignedAt: string;
      isActive: boolean;
    };
    preferences?: {
      preferredCategories: string[];
      notificationPreferences: {
        orderUpdates: boolean;
        statusChanges: boolean;
        newProducts: boolean;
      };
    };
  };
  managerProfile?: {
    manager_id: string;
    assignedCategories: string[];
    managerLevel: string;
    canAssignCategories: boolean;
    notificationPreferences: {
      orderUpdates: boolean;
      stockAlerts: boolean;
      statusChanges: boolean;
      newOrders: boolean;
      lowStock: boolean;
      categoryReports: boolean;
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

export default function UsersPage() {
  const router = useRouter();
  
  // Use real-time users hook
  const { users, isConnected, refreshUsers, addUser, updateUser, removeUser } = useRealtimeUsers();
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");

  // Fetch users (now using real-time hook)
  const fetchUsers = async () => {
    try {
      setLoading(true);
      await refreshUsers();
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Refresh data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUsers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Auto-refresh every 30 seconds to ensure data is up-to-date
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing users data...');
      fetchUsers();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Filter users
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    
    // Check if search term matches name or email
    const matchesNameOrEmail = (user.firstName || '').toLowerCase().includes(searchLower) ||
                              (user.lastName || '').toLowerCase().includes(searchLower) ||
                              (user.email || '').toLowerCase().includes(searchLower);
    
    // Check if search term matches a role name - if so, also verify the user has that role
    let matchesRoleFromSearch = true;
    if (searchTerm) {
      const searchLowerTrimmed = searchLower.trim();
      
      // If searching for "manager", only show actual managers (exclude customers)
      if (searchLowerTrimmed === 'manager' || searchLowerTrimmed === 'managers') {
        const isActuallyManager = Boolean(user.isManager === true || user.role === 'Manager' || user.managerProfile?.manager_id);
        const isNotCustomer = user.isCustomer !== true; // Exclude if user is marked as customer
        matchesRoleFromSearch = isActuallyManager && isNotCustomer;
        // If search term is "manager" but user is not a manager or is a customer, don't show
        if (!matchesRoleFromSearch) {
          return false;
        }
      }
      // If searching for "customer", only show actual customers
      else if (searchLowerTrimmed === 'customer' || searchLowerTrimmed === 'customers') {
        matchesRoleFromSearch = Boolean(user.isCustomer === true || user.role === 'Customer' || user.customerProfile?.customer_id);
        // If search term is "customer" but user is not a customer, don't show even if name matches
        if (!matchesRoleFromSearch) {
          return false;
        }
      }
      // If searching for "admin", only show admins
      else if (searchLowerTrimmed === 'admin' || searchLowerTrimmed === 'administrator' || searchLowerTrimmed === 'administrators') {
        matchesRoleFromSearch = user.isCompanyAdmin === true || user.isSuperAdmin === true || 
                               user.role === 'Company Admin' || user.role === 'Super Admin';
        if (!matchesRoleFromSearch) {
          return false;
        }
      }
    }
    
    // Enhanced role matching logic for dropdown filter
    let matchesRole = true;
    if (filterRole) {
      if (filterRole === 'Company Admin') {
        matchesRole = Boolean(user.role === 'Company Admin' || user.isCompanyAdmin || user.department === 'Administration') && 
                     !user.isCustomer && !user.isManager;
      } else if (filterRole === 'Super Admin') {
        matchesRole = Boolean(user.role === 'Super Admin' || user.isSuperAdmin) && 
                     !user.isCustomer && !user.isManager;
      } else if (filterRole === 'Customer') {
        matchesRole = Boolean(user.role === 'Customer' || user.isCustomer || user.customerProfile?.customer_id) && 
                     !user.isManager && !user.isCompanyAdmin && !user.isSuperAdmin;
      } else if (filterRole === 'Manager') {
        // When filtering for Manager, ensure user is actually a manager AND NOT a customer
        // Priority: If user has isCustomer flag set to true, exclude them from manager list
        // even if they're also a manager (users can't be both in the filter)
        const isActuallyManager = Boolean(user.role === 'Manager' || user.isManager === true || user.managerProfile?.manager_id);
        // Exclude if user is marked as customer (isCustomer flag takes priority)
        const isNotCustomer = user.isCustomer !== true;
        matchesRole = isActuallyManager && isNotCustomer;
      } else {
        matchesRole = (user.role || user.department || 'Staff') === filterRole;
      }
    }
    
    // Combine search and role filters
    return matchesNameOrEmail && matchesRoleFromSearch && matchesRole;
  });

  // Handle delete user
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}?`)) return;
    
    console.log('Attempting to delete user with ID:', userId);
    console.log('Current users in state:', users.map(u => ({ id: u._id, name: `${u.firstName} ${u.lastName}` })));
    
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove user from local state immediately
        removeUser(userId);
        // Show success message
        alert(`User ${userName} has been deleted successfully.`);
        
        // The real-time hook will automatically refresh the list
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || 'Unknown error occurred';
        console.error('Failed to delete user:', errorMessage);
        alert(`Failed to delete user: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(`Error deleting user: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  };

  return (
    <ProtectedRoute 
      requiredPermission="users.read"
    >
      <div className="w-full min-w-0">
          <Breadcrumb pageName="Users" />
          
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
              onClick={fetchUsers}
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-blue-900 dark:text-white truncate">
                      User Management
                    </h1>
                    <p className="text-blue-700 dark:text-blue-300 text-xs sm:text-sm lg:text-base mt-1 truncate">
                      Manage system users and their roles
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={fetchUsers}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-lg sm:rounded-xl border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-center font-medium text-gray-700 hover:border-blue-900 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-blue-400 disabled:opacity-50 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base"
                  >
                    <svg className={`mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="hidden sm:inline">Refresh</span>
                    <span className="sm:hidden">↻</span>
                  </button>
                  <PermissionGate permission="users.create">
                    <Link
                      href="/users/create"
                      className="inline-flex items-center justify-center rounded-lg sm:rounded-xl bg-blue-900 px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-3 text-center font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/50 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base"
                    >
                      <svg className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="hidden sm:inline">Add User</span>
                      <span className="sm:hidden">Add</span>
                    </Link>
                  </PermissionGate>
                </div>
              </div>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 xl:gap-6">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 hover:shadow-lg sm:hover:shadow-xl lg:hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] lg:hover:scale-105">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Administrators</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                      {users.filter(u => u.role === 'Super Admin' || u.isSuperAdmin || u.isCompanyAdmin || u.role === 'Company Admin').length}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">Full system access</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 hover:shadow-lg sm:hover:shadow-xl lg:hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] lg:hover:scale-105">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Staff Members</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                      {users.filter(u => u.role !== 'Super Admin').length}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">Order & customer management</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 hover:shadow-lg sm:hover:shadow-xl lg:hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] lg:hover:scale-105 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Total Users</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                      {users.length}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">All system users</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
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
                      placeholder="Search users by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-md sm:rounded-lg lg:rounded-xl border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 pl-8 sm:pl-10 lg:pl-12 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                    />
                    <svg className="absolute left-2 sm:left-3 lg:left-4 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <div className="sm:w-48">
                  <div className="relative">
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="w-full rounded-md sm:rounded-lg lg:rounded-xl border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 pr-6 sm:pr-8 lg:pr-10 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 appearance-none transition-all duration-300 text-xs sm:text-sm lg:text-base"
                    >
                      <option value="">All Roles</option>
                      <option value="Company Admin">Company Admin</option>
                      <option value="Customer">Customer</option>
                      <option value="Manager">Manager</option>
                      <option value="Staff">Staff</option>
                    </select>
                    <svg className="absolute right-1.5 sm:right-2 lg:right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
            
          {/* Users List */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4 lg:mb-6">
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-blue-900 dark:text-white">System Users</h2>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
              </div>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-6 sm:py-8 lg:py-12">
                <div className="text-center">
                  <div className="inline-block h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 animate-spin rounded-full border-2 border-solid border-blue-900 border-r-transparent"></div>
                  <p className="mt-2 sm:mt-3 lg:mt-4 text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400">Loading users...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 xl:gap-6">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <div key={user._id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 hover:shadow-lg sm:hover:shadow-xl lg:hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] lg:hover:scale-105">
                      <div className="flex items-start justify-between mb-2 sm:mb-3 lg:mb-4">
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                            <span className="text-white font-semibold text-xs sm:text-sm lg:text-lg">
                              {(user.firstName || 'U').charAt(0)}{(user.lastName || 'U').charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm lg:text-lg truncate">
                              {user.firstName || 'Unknown'} {user.lastName || 'User'}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{user.email || 'No email'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 flex-shrink-0">
                          <PermissionGate permission="users.edit">
                            <button 
                              onClick={() => router.push(`/users/edit/${user._id}`)}
                              className="p-1 sm:p-1.5 lg:p-2 rounded-md sm:rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                              title="Edit User"
                            >
                              <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </PermissionGate>
                          <PermissionGate permission="users.delete">
                            <button
                              onClick={() => handleDeleteUser(user._id, `${user.firstName || 'Unknown'} ${user.lastName || 'User'}`)}
                              className="p-1 sm:p-1.5 lg:p-2 rounded-md sm:rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                              title="Delete User"
                            >
                              <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </PermissionGate>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 sm:space-y-2 lg:space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Role</span>
                          <span className={`inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium ${
                            user.isSuperAdmin || user.role === 'Super Admin' || user.department === 'Super Admin'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : user.isCompanyAdmin || user.role === 'Company Admin' || user.department === 'Administration'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                              : user.isCustomer || user.role === 'Customer'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                              : user.isManager || user.role === 'Manager'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            <span className="truncate max-w-16 sm:max-w-20 lg:max-w-none">
                              {user.isCustomer ? 'Customer' : user.isManager ? 'Manager' : user.isCompanyAdmin ? 'Company Admin' : user.role || user.department || 'Staff'}
                            </span>
                          </span>
                        </div>
                        
                        {user.isCustomer && user.customerProfile && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Company</span>
                            <span className="text-xs sm:text-sm text-gray-900 dark:text-white truncate max-w-20 sm:max-w-24 lg:max-w-none">
                              {user.customerProfile.companyName || 'N/A'}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Status</span>
                          <span className={`inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        {user.phone && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Phone</span>
                            <span className="text-xs sm:text-sm text-gray-900 dark:text-white truncate max-w-20 sm:max-w-24 lg:max-w-none">{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-6 sm:py-8 lg:py-12">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 lg:mb-4">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">No users found</h3>
                    <p className="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
                  </div>
                )}
              </div>
            )}
          </div>
      </div>
    </ProtectedRoute>
  );
}