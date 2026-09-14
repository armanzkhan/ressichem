"use client";

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuthHeaders, handleAuthError } from "@/lib/auth";
import { 
  Users, 
  Package, 
  TrendingUp, 
  Bell, 
  Settings, 
  BarChart3,
  Filter,
  Search,
  Plus,
  Edit,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";

interface Manager {
  _id: string;
  user_id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  fullName?: string;
  assignedCategories: string[];
  managerLevel: string;
  performance: {
    totalOrdersManaged: number;
    totalProductsManaged: number;
    averageResponseTime: number;
    lastActiveAt: string;
  };
  isActive: boolean;
  createdAt: string;
}

interface ManagerOrder {
  _id: string;
  orderNumber: string;
  customer: {
    companyName: string;
    contactName: string;
    email: string;
  };
  status: string;
  total: number;
  items: any[];
  categories: string[];
  createdAt: string;
}

interface ManagerProduct {
  _id: string;
  name: string;
  category: string | {
    mainCategory: string;
    subCategory?: string;
  };
  price: number;
  stock: number;
  isActive: boolean;
}

function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [managerOrders, setManagerOrders] = useState<ManagerOrder[]>([]);
  const [managerProducts, setManagerProducts] = useState<ManagerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showManagerSelectModal, setShowManagerSelectModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [newManager, setNewManager] = useState({
    user_id: '',
    assignedCategories: [] as string[],
    managerLevel: 'junior',
    notificationPreferences: {
      orderUpdates: true,
      stockAlerts: true,
      statusChanges: true,
      newOrders: true,
      lowStock: true,
      categoryReports: true
    }
  });
  const router = useRouter();
  const searchParams = useSearchParams();

  // Clear URL parameters
  const clearUrlParams = () => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('action');
      url.searchParams.delete('tab');
      router.replace(url.pathname + url.search);
    } catch (error) {
      console.error('Error clearing URL params:', error);
    }
  };

  // Fetch managers
  const fetchManagers = async () => {
    try {
      console.log('🔍 Fetching managers...');
      
      const response = await fetch('/api/managers/all', {
        headers: getAuthHeaders(),
      });

      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Managers data:', data);
        console.log('📊 Managers count:', data.managers?.length || 0);
        console.log('👥 Managers list:', data.managers);
        
        // Debug each manager's name data
        if (data.managers) {
          data.managers.forEach((manager: Manager, index: number) => {
            console.log(`Manager ${index + 1}:`, {
              user_id: manager.user_id,
              firstName: manager.firstName,
              lastName: manager.lastName,
              fullName: manager.fullName,
              email: manager.email
            });
          });
        }
        
        setManagers(data.managers || []);
        setMessage(`✅ Loaded ${data.managers?.length || 0} managers`);
        setTimeout(() => setMessage(""), 3000);
      } else {
        if (handleAuthError(response.status, "Please log in to view managers")) {
          return;
        }
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        setMessage(`❌ Failed to fetch managers: ${errorData.message || 'Unknown error'}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('❌ Fetch Error:', error);
      setMessage(`❌ Error fetching managers: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  // Fetch manager orders
  const fetchManagerOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/managers/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setManagerOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching manager orders:', error);
    }
  };

  // Fetch manager products
  const fetchManagerProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/managers/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setManagerProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching manager products:', error);
    }
  };

  // Fetch available categories
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/products/categories?type=main', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const categories = await response.json();
        
        // Allowed categories for manager assignment
        const allowedCategories = [
          'Building Care & Maintenance',
          'Concrete Admixtures',
          'Decorative Concrete',
          'Dry Mix Mortars / Premix Plasters',
          'Epoxy Adhesives and Coatings',
          'Epoxy Floorings & Coatings',
          'Specialty Products',
          'Tiling and Grouting Materials'
        ];
        
        // Filter to only show allowed categories
        const processedCategories = categories
          .map((cat: any) => {
            const categoryName = cat.name || cat.mainCategory || cat;
            return typeof categoryName === 'string' ? categoryName : categoryName;
          })
          .filter((catName: string) => allowedCategories.includes(catName));
        
        setAvailableCategories(processedCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch available users
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/managers/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Create manager
  const createManager = async () => {
    try {
      console.log('🔍 Creating manager...');
      console.log('New manager data:', newManager);
      console.log('Available users:', availableUsers);
      
      // Check if selected user is already a manager
      const selectedUser = availableUsers.find(u => u.user_id === newManager.user_id);
      console.log('Selected user:', selectedUser);
      
      if (selectedUser?.isManager) {
        setMessage("⚠️ This user is already a manager. Use 'Assign Categories' to modify their categories instead.");
        setTimeout(() => setMessage(""), 5000);
        return;
      }

      if (!newManager.user_id) {
        setMessage("❌ Please select a user first.");
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      if (newManager.assignedCategories.length === 0) {
        setMessage("❌ Please select at least one category.");
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      const token = localStorage.getItem("token");
      console.log('Token present:', !!token);
      console.log('Request URL:', '/api/managers');
      console.log('Request body:', JSON.stringify(newManager, null, 2));
      
      const response = await fetch('/api/managers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newManager),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('Manager created:', data);
        setMessage("✅ Manager created successfully!");
        await fetchManagers();
        setShowCreateModal(false);
        setNewManager({
          user_id: '',
          assignedCategories: [] as string[],
          managerLevel: 'junior',
          notificationPreferences: {
            orderUpdates: true,
            stockAlerts: true,
            statusChanges: true,
            newOrders: true,
            lowStock: true,
            categoryReports: true
          }
        });
        setTimeout(() => setMessage(""), 3000);
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('API Error:', errorData);
        console.error('Response status:', response.status);
        console.error('Response statusText:', response.statusText);
        setMessage(`❌ Failed to create manager: ${errorData.message || 'Unknown error'}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('Error creating manager:', error);
      setMessage("❌ Error creating manager");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Update manager
  const updateManager = async () => {
    if (!selectedManager) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/managers/${selectedManager._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedManager),
      });

      if (response.ok) {
        setMessage("✅ Manager updated successfully!");
        await fetchManagers();
        setShowEditModal(false);
        setSelectedManager(null);
        setTimeout(() => setMessage(""), 3000);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to update manager: ${errorData.message}`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      console.error('Error updating manager:', error);
      setMessage("❌ Error updating manager");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // View manager details
  const viewManager = (manager: Manager) => {
    setEditingManager(manager);
    setShowViewModal(true);
  };

  // Edit manager
  const editManager = (manager: Manager) => {
    // Ensure all required properties exist with defaults
    const safeManager: Manager = {
      ...manager,
      user_id: manager.user_id || '',
      managerLevel: manager.managerLevel || 'junior',
      isActive: manager.isActive !== undefined ? manager.isActive : true,
      assignedCategories: manager.assignedCategories && Array.isArray(manager.assignedCategories) 
        ? manager.assignedCategories 
        : [],
      performance: manager.performance || {
        totalOrdersManaged: 0,
        totalProductsManaged: 0,
        averageResponseTime: 0,
        lastActiveAt: new Date().toISOString()
      }
    };
    setEditingManager(safeManager);
    setShowEditModal(true);
  };

  // Update manager
  const updateManagerDetails = async () => {
    if (!editingManager) return;
    
    try {
      const token = localStorage.getItem("token");
      
      // Prepare update data - only send necessary fields
      const updateData = {
        managerLevel: editingManager.managerLevel || 'junior',
        isActive: editingManager.isActive !== undefined ? editingManager.isActive : true,
        assignedCategories: editingManager.assignedCategories && Array.isArray(editingManager.assignedCategories)
          ? editingManager.assignedCategories
          : []
      };
      
      const response = await fetch(`/api/managers/${editingManager._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        setMessage("✅ Manager updated successfully!");
        await fetchManagers();
        setShowEditModal(false);
        setEditingManager(null);
        setTimeout(() => setMessage(""), 3000);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to update manager: ${errorData.message}`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      console.error('Error updating manager:', error);
      setMessage("❌ Error updating manager");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Delete manager
  const deleteManager = async () => {
    if (!selectedManager) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/managers/${selectedManager._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setMessage("✅ Manager deleted successfully!");
        await fetchManagers();
        setShowDeleteModal(false);
        setSelectedManager(null);
        setTimeout(() => setMessage(""), 3000);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to delete manager: ${errorData.message}`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      console.error('Error deleting manager:', error);
      setMessage("❌ Error deleting manager");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        fetchManagers(),
        fetchManagerOrders(),
        fetchManagerProducts(),
        fetchCategories(),
        fetchUsers()
      ]);
      setLoading(false);
    };

    initializeData();
  }, []);

  // Handle URL parameters
  useEffect(() => {
    const action = searchParams.get('action');
    const tab = searchParams.get('tab');
    
    if (action === 'assign' && managers.length > 0) {
      setShowManagerSelectModal(true);
    }
    
    // Handle tab parameter for different views (if needed in future)
    if (tab === 'reports') {
      // Could add reports view logic here
      console.log('Reports tab requested');
    }
  }, [searchParams, managers]);

  // Handle assign categories
  const handleAssignCategories = async (managerId: string, categories: string[]) => {
    try {
      const token = localStorage.getItem("token");
      console.log('🔍 Assigning categories...');
      console.log('Manager ID:', managerId);
      console.log('Categories:', categories);
      console.log('Token present:', !!token);
      
      const response = await fetch('/api/managers/assign-categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          managerId,
          categories
        }),
      });

      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Categories assigned:', data);
        setMessage("✅ Categories assigned successfully!");
        await fetchManagers();
        setShowAssignModal(false);
        clearUrlParams();
        setTimeout(() => setMessage(""), 3000);
      } else {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        setMessage(`❌ Failed to assign categories: ${errorData.message || 'Unknown error'}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('❌ Assign Categories Error:', error);
      setMessage(`❌ Error assigning categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  // Filter managers
  const filteredManagers = managers.filter(manager => {
    if (!manager) return false;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (manager.user_id && manager.user_id.toLowerCase().includes(searchLower)) ||
      (manager.fullName && manager.fullName.toLowerCase().includes(searchLower)) ||
      (manager.firstName && manager.firstName.toLowerCase().includes(searchLower)) ||
      (manager.lastName && manager.lastName.toLowerCase().includes(searchLower)) ||
      (manager.email && manager.email.toLowerCase().includes(searchLower));
    
    // Handle category filtering for both string and object formats
    const matchesCategory = !categoryFilter || (manager.assignedCategories && Array.isArray(manager.assignedCategories) && manager.assignedCategories.some(categoryItem => {
      const categoryName = typeof categoryItem === 'string' 
        ? categoryItem 
        : (categoryItem as any)?.category || categoryItem;
      return categoryName === categoryFilter;
    }));
    
    const matchesStatus = !statusFilter || (statusFilter === 'active' ? manager.isActive : !manager.isActive);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Allowed main categories (8 actual categories)
  const allowedMainCategories = [
    'Building Care & Maintenance',
    'Concrete Admixtures',
    'Decorative Concrete',
    'Dry Mix Mortars / Premix Plasters',
    'Epoxy Adhesives and Coatings',
    'Epoxy Floorings & Coatings',
    'Specialty Products',
    'Tiling and Grouting Materials'
  ];

  // Get unique categories from managers, but only include the 8 main categories
  const allManagerCategories = [...new Set(managers.flatMap(m => 
    (m?.assignedCategories && Array.isArray(m.assignedCategories)) 
      ? m.assignedCategories.map(categoryItem => {
          const categoryName = typeof categoryItem === 'string' 
            ? categoryItem 
            : (categoryItem as any)?.category || categoryItem;
          return categoryName;
        })
      : []
  ))];

  // Filter to only show the 8 main categories (normalize for matching)
  const normalizeCategory = (cat: string): string => {
    if (!cat || typeof cat !== 'string') return '';
    return cat.toLowerCase().trim()
      .replace(/\s*&\s*/g, ' and ')
      .replace(/\s+/g, ' ');
  };

  const managerCategories = allowedMainCategories.filter(allowedCat => {
    const normalizedAllowed = normalizeCategory(allowedCat);
    return allManagerCategories.some(managerCat => {
      const normalizedManager = normalizeCategory(managerCat);
      return normalizedAllowed === normalizedManager || 
             normalizedManager.includes(normalizedAllowed) ||
             normalizedAllowed.includes(normalizedManager);
    });
  });

  // Get status counts
  const statusCounts = {
    total: managers.length,
    active: managers.filter(m => m.isActive).length,
    inactive: managers.filter(m => !m.isActive).length,
    totalOrders: managerOrders.length,
    totalProducts: managerProducts.length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermission="managers.read">
      <div className="w-full min-w-0 max-w-full overflow-x-hidden">
        <Breadcrumb pageName="Manager Dashboard" />
        
        {/* Header Section */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-gradient-to-br from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl border border-white/30 dark:border-gray-700/30 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-blue-900 rounded-2xl flex items-center justify-center shadow-xl flex-shrink-0">
                  <Users className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-blue-900 dark:text-white truncate">
                    Manager Dashboard
                  </h1>
                  <p className="text-blue-700 dark:text-blue-300 text-sm sm:text-base lg:text-lg mt-2 line-clamp-2">
                    Manage category assignments and track manager performance across different product categories
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    fetchManagers();
                    fetchManagerOrders();
                    fetchManagerProducts();
                  }}
                  className="inline-flex items-center justify-center rounded-lg sm:rounded-xl border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-center font-medium text-gray-700 hover:border-blue-900 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-blue-400 disabled:opacity-50 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base"
                >
                  <TrendingUp className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Refresh</span>
                  <span className="sm:hidden">↻</span>
                </button>
                <button
                  onClick={() => {
                    console.log('🔍 Debug Info:');
                    console.log('Managers:', managers);
                    console.log('Available Users:', availableUsers);
                    console.log('Available Categories:', availableCategories);
                    console.log('Token:', localStorage.getItem("token"));
                    setMessage("🔍 Debug info logged to console");
                    setTimeout(() => setMessage(""), 3000);
                  }}
                  className="inline-flex items-center justify-center rounded-lg sm:rounded-xl border border-blue-900 bg-transparent px-3 py-2 sm:px-4 sm:py-3 text-center font-medium text-blue-900 hover:border-blue-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-blue-600 dark:text-blue-400 dark:hover:border-blue-500 text-xs sm:text-sm lg:text-base"
                >
                  <Settings className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Debug</span>
                  <span className="sm:hidden">🔍</span>
                </button>
                <button
                  onClick={async () => {
                    console.log('🧪 Testing API directly...');
                    try {
                      const token = localStorage.getItem("token");
                      const response = await fetch('/api/managers/all', {
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json',
                        },
                      });
                      const data = await response.json();
                      console.log('🧪 Direct API Response:', data);
                      
                      // Debug manager names
                      if (data.managers) {
                        console.log('🧪 Manager Names Debug:');
                        data.managers.forEach((manager: Manager, index: number) => {
                          console.log(`  ${index + 1}. ${manager.user_id}:`, {
                            firstName: manager.firstName,
                            lastName: manager.lastName,
                            fullName: manager.fullName,
                            email: manager.email
                          });
                        });
                      }
                      
                      setMessage(`🧪 API returned ${data.managers?.length || 0} managers`);
                      setTimeout(() => setMessage(""), 3000);
                    } catch (error) {
                      console.error('🧪 API Test Error:', error);
                      setMessage("🧪 API test failed");
                      setTimeout(() => setMessage(""), 3000);
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-lg sm:rounded-xl border border-blue-900 bg-transparent px-3 py-2 sm:px-4 sm:py-3 text-center font-medium text-blue-900 hover:border-blue-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-blue-600 dark:text-blue-400 dark:hover:border-blue-500 text-xs sm:text-sm lg:text-base"
                >
                  <TrendingUp className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Test API</span>
                  <span className="sm:hidden">🧪</span>
                </button>
                <button
                  onClick={async () => {
                    console.log('🔐 Testing Create Manager API...');
                    try {
                      const token = localStorage.getItem("token");
                      const testData = {
                        user_id: 'test_user',
                        assignedCategories: ['Test Category'],
                        managerLevel: 'junior',
                        notificationPreferences: {
                          orderUpdates: true,
                          stockAlerts: true,
                          statusChanges: true,
                          newOrders: true,
                          lowStock: true,
                          categoryReports: true
                        }
                      };
                      
                      const response = await fetch('/api/managers', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(testData),
                      });
                      
                      console.log('🔐 Create Manager Response Status:', response.status);
                      const data = await response.json();
                      console.log('🔐 Create Manager Response:', data);
                      setMessage(`🔐 Create Manager API: ${response.status} - ${data.message || 'Success'}`);
                      setTimeout(() => setMessage(""), 5000);
                    } catch (error) {
                      console.error('🔐 Create Manager API Error:', error);
                      setMessage("🔐 Create Manager API test failed");
                      setTimeout(() => setMessage(""), 3000);
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-lg sm:rounded-xl border border-blue-900 bg-transparent px-3 py-2 sm:px-4 sm:py-3 text-center font-medium text-blue-900 hover:border-blue-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-blue-600 dark:text-blue-400 dark:hover:border-blue-500 text-xs sm:text-sm lg:text-base"
                >
                  <Settings className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Test Create</span>
                  <span className="sm:hidden">🔐</span>
                </button>
                <PermissionGate permission="assign_categories">
                  <button
                    onClick={() => {
                      console.log('🔍 Create Manager Button Clicked (Header)');
                      console.log('Available users:', availableUsers);
                      console.log('Available categories:', availableCategories);
                      setShowCreateModal(true);
                    }}
                    className="inline-flex items-center justify-center rounded-lg sm:rounded-xl bg-blue-900 px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-3 text-center font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/50 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base"
                  >
                    <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                    <span className="hidden sm:inline">Create Manager</span>
                    <span className="sm:hidden">Create</span>
                  </button>
                </PermissionGate>
                <PermissionGate permission="assign_categories">
                  <button
                    onClick={() => {
                      if (managers.length > 0) {
                        setShowManagerSelectModal(true);
                      } else {
                        setMessage("❌ No managers available to assign categories");
                        setTimeout(() => setMessage(""), 3000);
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-lg sm:rounded-xl bg-blue-900 px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-3 text-center font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/50 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base"
                  >
                    <Settings className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                    <span className="hidden sm:inline">Assign Categories</span>
                    <span className="sm:hidden">Assign</span>
                  </button>
                </PermissionGate>
              </div>
            </div>
            
            <div className="mt-6">
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                Manage category assignments and track manager performance across different product categories.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 backdrop-blur-sm rounded-xl shadow-lg border border-blue-900/20 dark:border-blue-700/50 p-4 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 truncate">Total Managers</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {statusCounts.total}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 backdrop-blur-sm rounded-xl shadow-lg border border-blue-900/20 dark:border-blue-700/50 p-4 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 truncate">Active</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {statusCounts.active}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-900 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 backdrop-blur-sm rounded-xl shadow-lg border border-blue-900/20 dark:border-blue-700/50 p-4 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 truncate">Orders</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {statusCounts.totalOrders}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-900 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 backdrop-blur-sm rounded-xl shadow-lg border border-blue-900/20 dark:border-blue-700/50 p-4 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 truncate">Products</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {statusCounts.totalProducts}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-900 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 backdrop-blur-sm rounded-xl shadow-lg border border-blue-900/20 dark:border-blue-700/50 p-4 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 truncate">Categories</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {managerCategories.length}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-900 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
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
                    placeholder="Search managers by name, email, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 pl-8 sm:pl-10 lg:pl-12 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                  />
                  <Search className="absolute left-2 sm:left-3 lg:left-4 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                  >
                    <option value="">All Categories</option>
                    {managerCategories.map((category, index) => (
                      <option key={`category-${index}-${category}`} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Managers List */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
            <h5 className="mb-3 sm:mb-4 text-base sm:text-lg lg:text-xl font-semibold text-blue-900 dark:text-white">Managers</h5>
            
            {filteredManagers.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {/* Mobile Card Layout */}
                <div className="block sm:hidden">
                  {filteredManagers.map((manager) => (
                    <div key={manager._id} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20 p-4 mb-4 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                      {/* Header with Avatar and Status */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-blue-900 flex items-center justify-center shadow-lg flex-shrink-0 mr-3">
                            <Users className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-blue-900 dark:text-white truncate">
                              {manager.fullName || manager.firstName || manager.user_id}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {manager.email || manager.user_id}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              ID: {manager.user_id}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-2">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            manager.isActive 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                          }`}>
                            {manager.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            manager.managerLevel === 'head' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' :
                            manager.managerLevel === 'lead' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' :
                            manager.managerLevel === 'senior' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
                          }`}>
                            {manager.managerLevel}
                          </span>
                        </div>
                      </div>
                      
                      {/* Performance Metrics */}
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
                        <h4 className="text-sm font-semibold text-blue-900 dark:text-white mb-3 flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                          Performance
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
                            <div className="flex items-center justify-center mb-1">
                              <Package className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-1" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">Orders</span>
                            </div>
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {manager.performance?.totalOrdersManaged || 0}
                            </div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
                            <div className="flex items-center justify-center mb-1">
                              <BarChart3 className="h-4 w-4 text-green-600 dark:text-green-400 mr-1" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">Products</span>
                            </div>
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              {manager.performance?.totalProductsManaged || 0}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Response Time</span>
                            <span className="text-sm font-medium text-blue-900 dark:text-white">
                              {manager.performance?.averageResponseTime || 0}h
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Categories Section */}
                      <div className="mb-4">
                        <div className="flex items-center mb-2">
                          <Bell className="h-4 w-4 text-blue-900 dark:text-blue-400 mr-2" />
                          <h4 className="text-sm font-semibold text-blue-900 dark:text-white">Assigned Categories</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(manager.assignedCategories && Array.isArray(manager.assignedCategories) ? manager.assignedCategories : []).map((categoryItem, index) => {
                            const categoryName = typeof categoryItem === 'string' 
                              ? categoryItem 
                              : (categoryItem as any)?.category || categoryItem;
                            
                            return (
                              <span
                                key={`category-${index}-${categoryName}`}
                                className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-700/50"
                              >
                                {categoryName}
                              </span>
                            );
                          })}
                          {(!manager.assignedCategories || manager.assignedCategories.length === 0) && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 italic">No categories assigned</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewManager(manager)}
                          className="flex-1 inline-flex items-center justify-center rounded-lg bg-blue-900 px-3 py-2.5 text-center text-xs font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/50 transition-all duration-300 hover:shadow-lg"
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </button>
                        
                        <button
                          onClick={() => editManager(manager)}
                          className="flex-1 inline-flex items-center justify-center rounded-lg bg-blue-900 px-3 py-2.5 text-center text-xs font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/50 transition-all duration-300 hover:shadow-lg"
                        >
                          <Edit className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </button>
                        
                        <button
                          onClick={() => {
                            setSelectedManager(manager);
                            setShowAssignModal(true);
                          }}
                          className="flex-1 inline-flex items-center justify-center rounded-lg bg-blue-900 px-3 py-2.5 text-center text-xs font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/50 transition-all duration-300 hover:shadow-lg"
                        >
                          <Settings className="mr-1.5 h-3.5 w-3.5" />
                          Assign
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Desktop Table Layout */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                        <th className="min-w-[150px] px-4 py-4 font-medium text-blue-900 dark:text-white">
                          Manager
                        </th>
                        <th className="min-w-[200px] px-4 py-4 font-medium text-blue-900 dark:text-white">
                          Assigned Categories
                        </th>
                        <th className="min-w-[100px] px-4 py-4 font-medium text-blue-900 dark:text-white">
                          Level
                        </th>
                        <th className="min-w-[100px] px-4 py-4 font-medium text-blue-900 dark:text-white">
                          Orders Managed
                        </th>
                        <th className="min-w-[100px] px-4 py-4 font-medium text-blue-900 dark:text-white">
                          Products Managed
                        </th>
                        <th className="min-w-[100px] px-4 py-4 font-medium text-blue-900 dark:text-white">
                          Status
                        </th>
                        <th className="min-w-[200px] px-4 py-4 font-medium text-blue-900 dark:text-white">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredManagers.map((manager) => (
                        <tr key={manager._id} className="border-b border-gray-200 dark:border-gray-700">
                          <td className="px-4 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mr-3">
                                <Users className="h-5 w-5 text-blue-900 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="font-medium text-blue-900 dark:text-white">
                                  {manager.fullName || manager.firstName || manager.user_id}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {manager.email || manager.user_id}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  ID: {manager.user_id} • {new Date(manager.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </td>
                        
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1">
                              {(manager.assignedCategories && Array.isArray(manager.assignedCategories) ? manager.assignedCategories : []).map((categoryItem, index) => {
                                // Handle both string and object formats
                                const categoryName = typeof categoryItem === 'string' 
                                  ? categoryItem 
                                  : (categoryItem as any)?.category || categoryItem;
                                
                                return (
                                  <span
                                    key={`category-${index}-${categoryName}`}
                                    className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/20 px-2 py-1 text-xs font-medium text-blue-900 dark:text-blue-200"
                                  >
                                    {categoryName}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              manager.managerLevel === 'head' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200' :
                              manager.managerLevel === 'lead' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200' :
                              manager.managerLevel === 'senior' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}>
                              {manager.managerLevel}
                            </span>
                          </td>
                          
                          <td className="px-4 py-4">
                            <div className="flex items-center">
                              <Package className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                              <span className="text-blue-900 dark:text-white">{manager.performance?.totalOrdersManaged || 0}</span>
                            </div>
                          </td>
                          
                          <td className="px-4 py-4">
                            <div className="flex items-center">
                              <BarChart3 className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                              <span className="text-blue-900 dark:text-white">{manager.performance?.totalProductsManaged || 0}</span>
                            </div>
                          </td>
                          
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              manager.isActive 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                            }`}>
                              {manager.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => viewManager(manager)}
                                className="inline-flex items-center justify-center rounded-lg border border-blue-300 bg-transparent px-3 py-2 text-center font-medium text-blue-600 hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-blue-600 dark:text-blue-400 dark:hover:border-blue-500"
                                title="View Manager Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={() => editManager(manager)}
                                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-center font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500/50 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500"
                                title="Edit Manager"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={() => {
                                  setSelectedManager(manager);
                                  setShowAssignModal(true);
                                }}
                                className="inline-flex items-center justify-center rounded-lg border border-blue-900 bg-transparent px-3 py-2 text-center font-medium text-blue-900 hover:border-blue-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-blue-600 dark:text-blue-400 dark:hover:border-blue-500"
                                title="Assign Categories"
                              >
                                <Settings className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={() => {
                                  setSelectedManager(manager);
                                  setShowDeleteModal(true);
                                }}
                                className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-transparent px-3 py-2 text-center font-medium text-red-600 hover:border-red-400 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 dark:border-red-600 dark:text-red-400 dark:hover:border-red-500"
                                title="Delete Manager"
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <Users className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                <h3 className="mt-2 text-sm sm:text-base font-medium text-blue-900 dark:text-white">No managers found</h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm || categoryFilter || statusFilter 
                    ? 'Try adjusting your search or filter criteria.' 
                    : 'Get started by assigning categories to managers.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Manager Selection Modal */}
        {showManagerSelectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-md">
              <h3 className="text-base sm:text-lg font-semibold text-blue-900 dark:text-white mb-3 sm:mb-4">Select Manager</h3>
              
              <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                {managers.map((manager) => (
                  <button
                    key={manager._id}
                    onClick={() => {
                      setSelectedManager(manager);
                      setShowManagerSelectModal(false);
                      setShowAssignModal(true);
                    }}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-900 dark:text-white truncate">{manager.user_id}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {manager.assignedCategories.length} categories assigned
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          manager.managerLevel === 'head' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200' :
                          manager.managerLevel === 'lead' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200' :
                          manager.managerLevel === 'senior' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}>
                          {manager.managerLevel}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
                <button
                  onClick={() => {
                    setShowManagerSelectModal(false);
                    clearUrlParams();
                  }}
                  className="px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Manager Details Modal */}
        {showViewModal && editingManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-2xl mx-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-4">Manager Details</h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Manager Name</label>
                    <p className="text-sm text-blue-900 dark:text-white">{editingManager.fullName || editingManager.firstName || editingManager.user_id}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
                    <p className="text-sm text-blue-900 dark:text-white">{editingManager.email || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Manager ID</label>
                    <p className="text-sm text-blue-900 dark:text-white">{editingManager.user_id}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Manager Level</label>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      editingManager.managerLevel === 'head' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200' :
                      editingManager.managerLevel === 'lead' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200' :
                      editingManager.managerLevel === 'senior' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}>
                      {editingManager.managerLevel}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      editingManager.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                    }`}>
                      {editingManager.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Created At</label>
                    <p className="text-sm text-blue-900 dark:text-white">{new Date(editingManager.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Assigned Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {(editingManager.assignedCategories && Array.isArray(editingManager.assignedCategories) ? editingManager.assignedCategories : []).map((categoryItem, index) => {
                      const categoryName = typeof categoryItem === 'string' 
                        ? categoryItem 
                        : (categoryItem as any)?.category || categoryItem;
                      
                      return (
                        <span
                          key={`category-${index}-${categoryName}`}
                          className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                        >
                          {categoryName}
                        </span>
                      );
                    })}
                    {(!editingManager.assignedCategories || editingManager.assignedCategories.length === 0) && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 italic">No categories assigned</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Performance</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Orders Managed</p>
                      <p className="text-lg font-semibold text-blue-900 dark:text-white">{editingManager.performance?.totalOrdersManaged || 0}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Products Managed</p>
                      <p className="text-lg font-semibold text-blue-900 dark:text-white">{editingManager.performance?.totalProductsManaged || 0}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Response Time</p>
                      <p className="text-lg font-semibold text-blue-900 dark:text-white">{editingManager.performance?.averageResponseTime || 0}h</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setEditingManager(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    editManager(editingManager);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800"
                >
                  Edit Manager
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Manager Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-4">Create New Manager</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">Select User</label>
                  <select
                    value={newManager.user_id}
                    onChange={(e) => setNewManager({...newManager, user_id: e.target.value})}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  >
                    <option value="">Select a user...</option>
                    {availableUsers.map((user) => (
                      <option 
                        key={user._id} 
                        value={user.user_id}
                        disabled={user.isManager}
                        style={{ 
                          color: user.isManager ? '#999' : 'inherit',
                          fontStyle: user.isManager ? 'italic' : 'normal'
                        }}
                      >
                        {user.email} ({user.firstName} {user.lastName}) {user.isManager ? '(Already Manager - Use Assign Categories)' : ''}
                      </option>
                    ))}
                  </select>
                  {newManager.user_id && availableUsers.find(u => u.user_id === newManager.user_id)?.isManager && (
                    <p className="mt-2 text-sm text-orange-600 dark:text-orange-400">
                      ⚠️ This user is already a manager. Use "Assign Categories" to modify their categories instead.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">Manager Level</label>
                  <select
                    value={newManager.managerLevel}
                    onChange={(e) => setNewManager({...newManager, managerLevel: e.target.value})}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  >
                    <option value="junior">Junior</option>
                    <option value="senior">Senior</option>
                    <option value="lead">Lead</option>
                    <option value="head">Head</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">Assigned Categories</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {availableCategories.map((category) => (
                      <label key={category} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newManager.assignedCategories.includes(category)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewManager({
                                ...newManager,
                                assignedCategories: [...newManager.assignedCategories, category]
                              });
                            } else {
                              setNewManager({
                                ...newManager,
                                assignedCategories: newManager.assignedCategories.filter(c => c !== category)
                              });
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-blue-900 dark:text-white">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('🔍 Create Manager Button Clicked');
                    console.log('Button disabled state:', !newManager.user_id || newManager.assignedCategories.length === 0 || availableUsers.find(u => u.user_id === newManager.user_id)?.isManager);
                    console.log('User ID:', newManager.user_id);
                    console.log('Categories:', newManager.assignedCategories);
                    console.log('Selected user is manager:', availableUsers.find(u => u.user_id === newManager.user_id)?.isManager);
                    createManager();
                  }}
                  disabled={!newManager.user_id || newManager.assignedCategories.length === 0 || availableUsers.find(u => u.user_id === newManager.user_id)?.isManager}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Create Manager
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Manager Modal */}
        {showEditModal && editingManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-4">Edit Manager</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">Manager ID</label>
                  <input
                    type="text"
                    value={editingManager.user_id || ''}
                    disabled
                    className="w-full rounded-lg border border-stroke bg-gray-100 px-4 py-3 text-gray-500 dark:border-dark-3 dark:bg-gray-800 dark:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">Manager Level</label>
                  <select
                    value={editingManager.managerLevel || 'junior'}
                    onChange={(e) => setEditingManager({...editingManager, managerLevel: e.target.value})}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  >
                    <option value="junior">Junior</option>
                    <option value="senior">Senior</option>
                    <option value="lead">Lead</option>
                    <option value="head">Head</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">Status</label>
                  <select
                    value={(editingManager.isActive !== undefined ? editingManager.isActive : true) ? 'active' : 'inactive'}
                    onChange={(e) => setEditingManager({...editingManager, isActive: e.target.value === 'active'})}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">Assigned Categories</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {availableCategories.map((category) => {
                      const assignedCategories = editingManager.assignedCategories && Array.isArray(editingManager.assignedCategories) 
                        ? editingManager.assignedCategories 
                        : [];
                      return (
                        <label key={category} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={assignedCategories.includes(category)}
                            onChange={(e) => {
                              const currentCategories = editingManager.assignedCategories && Array.isArray(editingManager.assignedCategories)
                                ? editingManager.assignedCategories
                                : [];
                              if (e.target.checked) {
                                setEditingManager({
                                  ...editingManager,
                                  assignedCategories: [...currentCategories, category]
                                });
                              } else {
                                setEditingManager({
                                  ...editingManager,
                                  assignedCategories: currentCategories.filter(c => c !== category)
                                });
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-blue-900 dark:text-white">{category}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingManager(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={updateManagerDetails}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800"
                >
                  Update Manager
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Manager Modal */}
        {showDeleteModal && selectedManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold text-blue-900 dark:text-white">Delete Manager</h3>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this manager? This action cannot be undone.
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-blue-900 dark:text-white">Manager ID: {selectedManager.user_id}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Categories: {selectedManager.assignedCategories.join(', ')}</p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteManager}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Delete Manager
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Categories Modal */}
        {showAssignModal && selectedManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-4">Assign Categories</h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manager: {selectedManager.user_id}
                </p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableCategories.map((category) => (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedManager.assignedCategories.includes(category)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedManager({
                            ...selectedManager,
                            assignedCategories: [...selectedManager.assignedCategories, category]
                          });
                        } else {
                          setSelectedManager({
                            ...selectedManager,
                            assignedCategories: selectedManager.assignedCategories.filter(c => c !== category)
                          });
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-blue-900 dark:text-white">{category}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    clearUrlParams();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAssignCategories(selectedManager._id, selectedManager.assignedCategories)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-opacity-90"
                >
                  Assign Categories
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className="fixed top-4 right-4 z-50">
            <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
              message.includes('✅') 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
            }`}>
              {message}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function ManagersPageWithSuspense() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    }>
      <ManagersPage />
    </Suspense>
  );
}

export default ManagersPageWithSuspense;
