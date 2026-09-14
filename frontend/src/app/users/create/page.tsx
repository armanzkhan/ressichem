"use client";

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Role {
  _id: string;
  name: string;
  description?: string;
}

interface Permission {
  _id: string;
  key: string;
  description?: string;
}

export default function CreateUserPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    department: "",
    roles: [] as string[],
    permissions: [] as string[],
    company_id: "RESSICHEM",
    isActive: true,
    userType: "staff", // staff, customer, manager
    isCustomer: false,
    isManager: false,
    // Manager-specific fields
    assignedCategories: [] as string[],
    managerLevel: 'junior',
    // Customer-specific fields
    companyName: "",
    contactName: "",
    customerPhone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "Pakistan"
    },
    customerType: "regular",
    assignedManagers: [] as string[] // Array of manager IDs
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(true);
  const lastAutoAssignedType = useRef<string>('');
  const router = useRouter();

  // Fetch roles and permissions from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.log("No token found");
          setFetchingData(false);
          return;
        }

        console.log("Fetching roles and permissions...");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        console.log("API URL:", apiUrl);

        const [rolesRes, permissionsRes, managersRes, categoriesRes, managersAllRes] = await Promise.all([
          fetch('/api/roles', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/permissions', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/managers', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/product-categories', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/managers/all', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        console.log("API Responses:", {
          roles: rolesRes.status,
          permissions: permissionsRes.status,
          managers: managersRes.status,
          categories: categoriesRes.status
        });

        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          console.log("Roles loaded:", rolesData);
          setRoles(Array.isArray(rolesData) ? rolesData : rolesData.roles || []);
        } else {
          console.error("Failed to fetch roles:", rolesRes.status, rolesRes.statusText);
          // Set default roles if API fails
          setRoles([
            { _id: 'staff', name: 'Staff Member', description: 'Regular company employee' },
            { _id: 'admin', name: 'Administrator', description: 'System administrator' },
            { _id: 'manager', name: 'Manager', description: 'Department manager' },
            { _id: 'customer', name: 'Customer', description: 'External customer user' }
          ]);
        }

        if (permissionsRes.ok) {
          const permissionsData = await permissionsRes.json();
          console.log("Permissions loaded:", permissionsData);
          const permissionsArray = Array.isArray(permissionsData) ? permissionsData : permissionsData.permissions || [];
          // Deduplicate permissions by _id (or key if _id is missing)
          const seen = new Set<string>();
          const uniquePermissions = permissionsArray.filter((permission: Permission) => {
            const identifier = permission._id || permission.key || '';
            if (seen.has(identifier)) {
              return false;
            }
            seen.add(identifier);
            return true;
          });
          console.log("Unique permissions:", uniquePermissions.length, "out of", permissionsArray.length);
          setPermissions(uniquePermissions);
        } else {
          console.error("Failed to fetch permissions:", permissionsRes.status, permissionsRes.statusText);
          // Set default permissions if API fails
          setPermissions([
            { _id: 'users.create', key: 'Create Users', description: 'Create new users' },
            { _id: 'users.read', key: 'View Users', description: 'View user information' },
            { _id: 'users.update', key: 'Update Users', description: 'Update user information' },
            { _id: 'users.delete', key: 'Delete Users', description: 'Delete users' },
            { _id: 'orders.read', key: 'Read Orders', description: 'View orders' },
            { _id: 'orders.create', key: 'Create Orders', description: 'Create new orders' },
            { _id: 'orders.update', key: 'Update Orders', description: 'Update orders' },
            { _id: 'products.read', key: 'Read Products', description: 'View products' },
            { _id: 'customers.read', key: 'Read Customers', description: 'View customers' },
            { _id: 'notifications.read', key: 'Read Notifications', description: 'View notifications' }
          ]);
        }

        if (managersRes.ok) {
          const managersData = await managersRes.json();
          setManagers(Array.isArray(managersData) ? managersData : managersData.managers || []);
        }

        // Fetch all managers for customer assignment
        if (managersAllRes.ok) {
          const managersAllData = await managersAllRes.json();
          const allManagers = Array.isArray(managersAllData) ? managersAllData : managersAllData.managers || [];
          setManagers(allManagers); // Use this for manager selection dropdown
          console.log("All managers loaded for assignment:", allManagers.length);
        }

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          const allCategories = Array.isArray(categoriesData) ? categoriesData : categoriesData.categories || [];
          
          // Filter to only show the 8 allowed main categories for manager assignment
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
          
          // Filter categories to only include the 8 allowed main categories
          const filteredCategories = allCategories.filter((category: any) => {
            const categoryName = category.name || category.mainCategory || '';
            return allowedMainCategories.includes(categoryName);
          });
          
          console.log('✅ Filtered categories for manager assignment:', filteredCategories.length, 'out of', allCategories.length);
          setCategories(filteredCategories);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setMessage("❌ Failed to load roles and permissions");
        // Set default data if all API calls fail
        setRoles([
          { _id: 'staff', name: 'Staff Member', description: 'Regular company employee' },
          { _id: 'admin', name: 'Administrator', description: 'System administrator' },
          { _id: 'manager', name: 'Manager', description: 'Department manager' },
          { _id: 'customer', name: 'Customer', description: 'External customer user' }
        ]);
        setPermissions([
          { _id: 'users.create', key: 'Create Users', description: 'Create new users' },
          { _id: 'users.read', key: 'View Users', description: 'View user information' },
          { _id: 'users.update', key: 'Update Users', description: 'Update user information' },
          { _id: 'users.delete', key: 'Delete Users', description: 'Delete users' },
          { _id: 'orders.read', key: 'Read Orders', description: 'View orders' },
          { _id: 'orders.create', key: 'Create Orders', description: 'Create new orders' },
          { _id: 'orders.update', key: 'Update Orders', description: 'Update orders' },
          { _id: 'products.read', key: 'Read Products', description: 'View products' },
          { _id: 'customers.read', key: 'Read Customers', description: 'View customers' },
          { _id: 'notifications.read', key: 'Read Notifications', description: 'View notifications' }
        ]);
      } finally {
        setFetchingData(false);
      }
    };

    fetchData();
  }, []);

  // Auto-fill customer information when user type is customer
  useEffect(() => {
    if (formData.userType === 'customer') {
      const contactName = formData.firstName && formData.lastName 
        ? `${formData.firstName} ${formData.lastName}`.trim()
        : formData.firstName || formData.lastName || '';
      
      setFormData(prev => {
        const updates: any = {};
        
        // Only set companyName if it's empty
        if (!prev.companyName) {
          updates.companyName = 'Ressichem';
        }
        
        // Only set contactName if it's empty and we have firstName/lastName
        if (!prev.contactName && contactName) {
          updates.contactName = contactName;
        } else if (contactName && prev.contactName === '') {
          // Update if it was empty and now we have a name
          updates.contactName = contactName;
        }
        
        // Only set customerPhone if it's empty and we have phone
        if (!prev.customerPhone && prev.phone) {
          updates.customerPhone = prev.phone;
        }
        
        return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
      });
    }
  }, [formData.userType, formData.firstName, formData.lastName, formData.phone]);

  // Auto-assign roles and permissions when user type changes and data is loaded
  useEffect(() => {
    if (fetchingData || roles.length === 0 || permissions.length === 0) {
      return; // Wait for data to load
    }

    // Only auto-assign when user type actually changes
    if (lastAutoAssignedType.current === formData.userType) {
      return;
    }

    // Update the ref to track current user type
    lastAutoAssignedType.current = formData.userType;

    if (formData.userType === 'customer') {
      const assignedRoles: string[] = [];
      const assignedPermissions: string[] = [];

      // Find Customer role
      const customerRole = roles.find(role => 
        role.name.toLowerCase() === 'customer' || role._id.toLowerCase() === 'customer'
      );
      if (customerRole) {
        assignedRoles.push(customerRole._id);
      }

      // Assign customer permissions
      const customerPermissionKeys = [
        'products.read',
        'orders.create',
        'orders.read',
        'profile.update',
        'notifications.read',
        'customer.dashboard'
      ];
      
      permissions.forEach(permission => {
        if (customerPermissionKeys.includes(permission.key) || 
            customerPermissionKeys.some(key => permission._id === key)) {
          assignedPermissions.push(permission._id);
        }
      });

      setFormData(prev => ({
        ...prev,
        roles: assignedRoles,
        permissions: assignedPermissions
      }));
    } else if (formData.userType === 'manager') {
      const assignedRoles: string[] = [];
      const assignedPermissions: string[] = [];

      // Find Manager role
      const managerRole = roles.find(role => 
        role.name.toLowerCase() === 'manager' || role._id.toLowerCase() === 'manager'
      );
      if (managerRole) {
        assignedRoles.push(managerRole._id);
      }

      // Assign manager permissions (orders, products, customers)
      permissions.forEach(permission => {
        if (permission.key.startsWith('orders.') ||
            permission.key.startsWith('products.') ||
            permission.key.startsWith('customers.') ||
            permission._id.startsWith('orders.') ||
            permission._id.startsWith('products.') ||
            permission._id.startsWith('customers.')) {
          assignedPermissions.push(permission._id);
        }
      });

      setFormData(prev => ({
        ...prev,
        roles: assignedRoles,
        permissions: assignedPermissions
      }));
    } else if (formData.userType === 'staff') {
      // Clear roles and permissions for staff (they can be manually assigned)
      setFormData(prev => ({
        ...prev,
        roles: [],
        permissions: []
      }));
    }
  }, [formData.userType, roles, permissions, fetchingData]);

  // Handle role selection
  const handleRoleChange = (roleId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        roles: [...prev.roles, roleId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        roles: prev.roles.filter(id => id !== roleId)
      }));
    }
  };

  // Handle permission selection
  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        permissions: [...prev.permissions, permissionId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(id => id !== permissionId)
      }));
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Validate that at least one role is selected
    if (formData.roles.length === 0) {
      setMessage("❌ Please select at least one role for the user");
      setLoading(false);
      return;
    }

    try {
      // Get token from localStorage
      const token = localStorage.getItem("token");
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json();
      
      if (response.ok) {
        const createdUser = responseData.user || responseData;
        const userName = createdUser.firstName && createdUser.lastName 
          ? `${createdUser.firstName} ${createdUser.lastName}`
          : createdUser.email || 'User';
        
        // Show toast notification
        toast.success("User Created Successfully!", {
          description: `${userName} has been created successfully.`,
          duration: 5000,
        });
        
        setMessage("✅ User created successfully!");
        // Reset form
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          phone: "",
          department: "",
          roles: [],
          permissions: [],
          company_id: "RESSICHEM",
          isActive: true,
          userType: "staff",
          isCustomer: false,
          isManager: false,
          companyName: "",
          contactName: "",
          customerPhone: "",
          address: {
            street: "",
            city: "",
            state: "",
            zip: "",
            country: "Pakistan"
          },
          customerType: "regular",
          assignedManagers: [],
          assignedCategories: [],
          managerLevel: 'junior'
        });
        // Redirect to users list after 2 seconds
        setTimeout(() => {
          router.push('/users');
        }, 2000);
      } else {
        const errorMessage = responseData.error || responseData.message || 'Failed to create user';
        console.error('❌ User creation failed:', responseData);
        
        // Handle token expiration - redirect to login
        if (response.status === 403 && (errorMessage.includes('Invalid or expired token') || errorMessage.includes('expired'))) {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("userType");
          localStorage.removeItem("userRole");
          setMessage("❌ Your session has expired. Redirecting to login...");
          setTimeout(() => {
            window.location.href = "/auth/sign-in";
          }, 2000);
          return;
        }
        
        setMessage(`❌ ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('❌ Error creating user:', error);
      const errorMessage = error.message || 'Failed to connect to server. Please check your connection.';
      setMessage(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute 
      requiredPermission="users.create"
    >
      <Breadcrumb pageName="Create User" />
      
      <div className="rounded-[10px] bg-white shadow-1 border border-blue-900/20 dark:bg-gray-800 dark:shadow-card">
        <div className="border-b border-blue-900/20 px-7 py-4 dark:border-gray-700">
          <h3 className="font-medium text-blue-900 dark:text-white">
            User Information
          </h3>
        </div>
        
        <div className="p-7">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="mb-4 text-lg font-medium text-blue-900 dark:text-white">
                Basic Information
              </h4>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <label className="mb-3 block text-sm font-medium text-blue-900 dark:text-white">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    placeholder="Enter first name"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="mb-3 block text-sm font-medium text-blue-900 dark:text-white">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    placeholder="Enter last name"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="mb-3 block text-sm font-medium text-blue-900 dark:text-white">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Enter email address"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium text-blue-900 dark:text-white">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="Enter password (min 6 characters)"
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 pr-12 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-900 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium text-blue-900 dark:text-white">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+92 XXX XXXXXXX"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium text-blue-900 dark:text-white">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    placeholder="Enter department"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* User Type Selection */}
            <div>
              <h4 className="mb-4 text-lg font-medium text-blue-900 dark:text-white">
                User Type <span className="text-red-500">*</span>
              </h4>
              <p className="mb-4 text-sm text-blue-700 dark:text-blue-300">
                Select the type of user you want to create. This determines their access level and permissions.
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.userType === 'staff' 
                    ? 'border-blue-900 bg-blue-900/5' 
                    : 'border-stroke dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}>
                  <input
                    type="radio"
                    name="userType"
                    value="staff"
                    checked={formData.userType === 'staff'}
                    onChange={(e) => {
                      setFormData({...formData, userType: e.target.value, isCustomer: false, isManager: false});
                    }}
                    className="text-blue-900 focus:ring-blue-900"
                  />
                  <div>
                    <div className="font-medium text-blue-900 dark:text-white">Staff Member</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">Regular company employee</div>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  formData.userType === 'customer' 
                    ? 'border-blue-900 bg-blue-900/5' 
                    : 'border-stroke dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                } ${
                  formData.isManager || formData.userType === 'manager' 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'cursor-pointer'
                }`}>
                  <input
                    type="radio"
                    name="userType"
                    value="customer"
                    checked={formData.userType === 'customer'}
                    disabled={formData.isManager || formData.userType === 'manager'}
                    onChange={(e) => {
                      if (formData.isManager || formData.userType === 'manager') {
                        alert('Managers cannot be assigned as customers. Please select a different user type.');
                        return;
                      }
                      const contactName = formData.firstName && formData.lastName 
                        ? `${formData.firstName} ${formData.lastName}`.trim()
                        : formData.firstName || formData.lastName || '';
                      setFormData({
                        ...formData, 
                        userType: e.target.value, 
                        isCustomer: true, 
                        isManager: false,
                        companyName: 'Ressichem',
                        contactName: contactName || formData.contactName
                      });
                    }}
                    className="text-blue-900 focus:ring-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div>
                    <div className="font-medium text-blue-900 dark:text-white">Customer</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">Can view products and place orders</div>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  formData.userType === 'manager' 
                    ? 'border-blue-900 bg-blue-900/5' 
                    : 'border-stroke dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                } ${
                  formData.isCustomer || formData.userType === 'customer' 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'cursor-pointer'
                }`}>
                  <input
                    type="radio"
                    name="userType"
                    value="manager"
                    checked={formData.userType === 'manager'}
                    disabled={formData.isCustomer || formData.userType === 'customer'}
                    onChange={(e) => {
                      if (formData.isCustomer || formData.userType === 'customer') {
                        alert('Customers cannot be assigned as managers. Please select a different user type.');
                        return;
                      }
                      setFormData({...formData, userType: e.target.value, isCustomer: false, isManager: true});
                    }}
                    className="text-blue-900 focus:ring-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div>
                    <div className="font-medium text-blue-900 dark:text-white">Manager</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">Manages specific product categories</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Customer Information - Only show when customer is selected */}
            {formData.userType === 'customer' && (
              <div>
                <h4 className="mb-4 text-lg font-medium text-blue-900 dark:text-white">
                  Customer Information <span className="text-red-500">*</span>
                </h4>
                <p className="mb-4 text-sm text-blue-700 dark:text-blue-300">
                  Additional information required for customer accounts.
                </p>
                
                <div className="space-y-6">
                  {/* Company Information */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-blue-900 dark:text-white mb-3">Company Information</h5>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">
                          Company Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.companyName}
                          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                          placeholder="Enter company name"
                          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">
                          Contact Person <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.contactName}
                          onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                          placeholder="Enter contact person name"
                          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-blue-900 dark:text-white mb-3">Contact Information</h5>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">
                          Customer Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.customerPhone}
                          onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                          placeholder="+92 XXX XXXXXXX"
                          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">
                          Customer Type
                        </label>
                        <select
                          value={formData.customerType}
                          onChange={(e) => setFormData({...formData, customerType: e.target.value})}
                          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="regular">Regular</option>
                          <option value="premium">Premium</option>
                          <option value="vip">VIP</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-blue-900 dark:text-white mb-3">Address Information</h5>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">
                          Street Address
                        </label>
                        <input
                          type="text"
                          value={formData.address.street}
                          onChange={(e) => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                          placeholder="Enter street address"
                          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">
                            City
                          </label>
                          <input
                            type="text"
                            value={formData.address.city}
                            onChange={(e) => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                            placeholder="Enter city"
                            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">
                            State
                          </label>
                          <input
                            type="text"
                            value={formData.address.state}
                            onChange={(e) => setFormData({...formData, address: {...formData.address, state: e.target.value}})}
                            placeholder="Enter state"
                            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">
                            ZIP Code
                          </label>
                          <input
                            type="text"
                            value={formData.address.zip}
                            onChange={(e) => setFormData({...formData, address: {...formData.address, zip: e.target.value}})}
                            placeholder="Enter ZIP code"
                            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-blue-900 focus:border-blue-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Preferences */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-blue-900 dark:text-white mb-3">Customer Preferences</h5>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-900 dark:text-white mb-2">
                          Notification Preferences
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              defaultChecked
                              className="rounded border-stroke text-blue-900 focus:ring-blue-900 dark:border-gray-600"
                            />
                            <span className="text-sm text-blue-900 dark:text-white">Order updates</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              defaultChecked
                              className="rounded border-stroke text-blue-900 focus:ring-blue-900 dark:border-gray-600"
                            />
                            <span className="text-sm text-blue-900 dark:text-white">Status changes</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              defaultChecked
                              className="rounded border-stroke text-blue-900 focus:ring-blue-900 dark:border-gray-600"
                            />
                            <span className="text-sm text-blue-900 dark:text-white">New products</span>
                          </label>
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Note:</strong> Customers can view and order from all available products. Orders will be automatically routed to the appropriate category managers based on the products ordered.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Manager Assignment - Category-wise */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-blue-900 dark:text-white mb-3">
                      Assign Managers by Category (Optional)
                    </h5>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                      Select managers for each product category. The customer will be able to order products from the assigned managers' categories.
                    </p>
                    {fetchingData ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-900"></div>
                      </div>
                    ) : managers.length === 0 ? (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                          No managers available. Please create managers first.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Group managers by category */}
                        {(() => {
                          // Get all unique categories from managers
                          const categoryMap = new Map<string, any[]>();
                          
                          managers.forEach((manager) => {
                            const managerCategories = manager.assignedCategories || manager.managerProfile?.assignedCategories || [];
                            const categoryNames = Array.isArray(managerCategories) 
                              ? managerCategories.map((cat: any) => typeof cat === 'string' ? cat : (cat.category || cat.name || '')).filter(Boolean)
                              : [];
                            
                            if (categoryNames.length === 0) {
                              // Managers without categories go to "Uncategorized"
                              const uncategorized = categoryMap.get('Uncategorized') || [];
                              uncategorized.push(manager);
                              categoryMap.set('Uncategorized', uncategorized);
                            } else {
                              categoryNames.forEach((catName: string) => {
                                const existing = categoryMap.get(catName) || [];
                                existing.push(manager);
                                categoryMap.set(catName, existing);
                              });
                            }
                          });

                          // Sort categories alphabetically
                          const sortedCategories = Array.from(categoryMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

                          return (
                            <div className="max-h-96 overflow-y-auto space-y-4">
                              {sortedCategories.map(([categoryName, categoryManagers]) => (
                                <div key={categoryName} className="border border-stroke dark:border-gray-600 rounded-lg p-3">
                                  <h6 className="text-sm font-semibold text-blue-900 dark:text-white mb-2 flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-800 dark:text-blue-200">
                                      {categoryName}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      ({categoryManagers.length} manager{categoryManagers.length !== 1 ? 's' : ''})
                                    </span>
                                  </h6>
                                  <div className="space-y-2 mt-2">
                                    {categoryManagers.map((manager) => {
                                      const managerName = `${manager.firstName || ''} ${manager.lastName || ''}`.trim() || manager.email || 'Unknown';
                                      const managerId = manager._id || manager.user_id;
                                      
                                      return (
                                        <label
                                          key={managerId}
                                          className="flex items-start gap-2 p-2 rounded-lg border border-blue-900/10 dark:border-gray-600 hover:bg-blue-900/5 dark:hover:bg-gray-700 cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={formData.assignedManagers.includes(managerId)}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setFormData({
                                                  ...formData,
                                                  assignedManagers: [...formData.assignedManagers, managerId]
                                                });
                                              } else {
                                                setFormData({
                                                  ...formData,
                                                  assignedManagers: formData.assignedManagers.filter(id => id !== managerId)
                                                });
                                              }
                                            }}
                                            className="mt-1 rounded border-stroke text-blue-900 focus:ring-blue-900 dark:border-gray-600"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm text-blue-900 dark:text-white truncate">
                                              {managerName}
                                            </div>
                                            <div className="text-xs text-blue-700 dark:text-blue-300 truncate">
                                              {manager.email || 'No email'}
                                            </div>
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        {formData.assignedManagers.length > 0 && (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-sm text-green-800 dark:text-green-200">
                              <strong>{formData.assignedManagers.length}</strong> manager(s) selected. Customer will see products from these managers' categories.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Manager Information - Only show when manager is selected */}
            {formData.userType === 'manager' && (
              <div>
                <h4 className="mb-4 text-lg font-medium text-blue-900 dark:text-white">
                  Manager Information <span className="text-red-500">*</span>
                </h4>
                <p className="mb-4 text-sm text-blue-700 dark:text-blue-300">
                  Additional information required for manager accounts. Managers can be assigned categories later if needed.
                </p>
                
                <div className="space-y-6">
                  {/* Manager Level */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-blue-900 dark:text-white mb-3">Manager Level</h5>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                      {['junior', 'senior', 'lead', 'head'].map((level) => (
                        <label key={level} className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.managerLevel === level
                            ? 'border-blue-900 bg-blue-900/5'
                            : 'border-stroke dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}>
                          <input
                            type="radio"
                            name="managerLevel"
                            value={level}
                            checked={formData.managerLevel === level}
                            onChange={(e) => setFormData({...formData, managerLevel: e.target.value})}
                            className="text-blue-900 focus:ring-blue-900"
                          />
                          <span className="text-sm font-medium text-blue-900 dark:text-white capitalize">{level}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Category Assignment */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-blue-900 dark:text-white mb-3">
                      Assign Categories (Optional)
                    </h5>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                      Select product categories this manager will manage. Categories can be assigned later if needed.
                    </p>
                    {fetchingData ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-900"></div>
                      </div>
                    ) : categories.length === 0 ? (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                          No categories available. Categories can be assigned later.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="max-h-60 overflow-y-auto border border-stroke dark:border-gray-600 rounded-lg p-3">
                          {categories.map((category) => (
                            <label
                              key={category._id || category.name}
                              className="flex items-center gap-3 p-3 rounded-lg border border-blue-900/20 dark:border-gray-600 hover:bg-blue-900/5 dark:hover:bg-gray-700 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={formData.assignedCategories.includes(category.name || category._id)}
                                onChange={(e) => {
                                  const categoryName = category.name || category._id;
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      assignedCategories: [...formData.assignedCategories, categoryName]
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      assignedCategories: formData.assignedCategories.filter(c => c !== categoryName)
                                    });
                                  }
                                }}
                                className="rounded border-stroke text-blue-900 focus:ring-blue-900 dark:border-gray-600"
                              />
                              <div className="font-medium text-blue-900 dark:text-white">
                                {category.name || category._id}
                              </div>
                            </label>
                          ))}
                        </div>
                        {formData.assignedCategories.length > 0 && (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-sm text-green-800 dark:text-green-200">
                              <strong>{formData.assignedCategories.length}</strong> category(s) selected.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Roles Selection */}
            <div>
              <h4 className="mb-4 text-lg font-medium text-blue-900 dark:text-white">
                Assign Roles <span className="text-red-500">*</span>
              </h4>
              <p className="mb-4 text-sm text-blue-700 dark:text-blue-300">
                Select at least one role for the user. This determines their permissions and access level.
              </p>
              {fetchingData ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-900"></div>
                </div>
              ) : roles.length === 0 ? (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200">
                    No roles available. Please check if the backend is running and roles are configured.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {roles.map((role) => (
                    <label key={role._id} className="flex items-center gap-2 p-3 rounded-lg border border-blue-900/20 dark:border-gray-600 hover:bg-blue-900/5 dark:hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.roles.includes(role._id)}
                        onChange={(e) => handleRoleChange(role._id, e.target.checked)}
                        className="rounded border-stroke text-blue-900 focus:ring-blue-900 dark:border-gray-600"
                      />
                      <div>
                        <div className="font-medium text-blue-900 dark:text-white">{role.name}</div>
                        {role.description && (
                          <div className="text-sm text-blue-700 dark:text-blue-300">{role.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Permissions Selection */}
            <div>
              <h4 className="mb-4 text-lg font-medium text-blue-900 dark:text-white">
                Assign Permissions
              </h4>
              {fetchingData ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-900"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {permissions.map((permission, index) => (
                    <label key={permission._id || permission.key || `permission-${index}`} className="flex items-center gap-2 p-3 rounded-lg border border-blue-900/20 dark:border-gray-600 hover:bg-blue-900/5 dark:hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission._id)}
                        onChange={(e) => handlePermissionChange(permission._id, e.target.checked)}
                        className="rounded border-stroke text-blue-900 focus:ring-blue-900 dark:border-gray-600"
                      />
                      <div>
                        <div className="font-medium text-blue-900 dark:text-white">{permission.key}</div>
                        {permission.description && (
                          <div className="text-sm text-blue-700 dark:text-blue-300">{permission.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Message Display */}
            {message && (
              <div className={`p-4 rounded-lg ${message.includes('✅') ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
                {message}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center rounded-lg bg-blue-900 px-6 py-3 font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create User'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => router.push('/users')}
                className="flex items-center justify-center rounded-lg border border-stroke bg-transparent px-6 py-3 font-medium text-blue-900 hover:border-blue-900 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:text-white dark:hover:border-blue-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
