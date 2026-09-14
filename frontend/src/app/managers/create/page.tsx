"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { 
  Users, 
  ArrowLeft,
  Save,
  X,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface User {
  _id: string;
  user_id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  isManager?: boolean;
}

interface Category {
  _id: string;
  name: string;
}

export default function CreateManagerPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [fetchingData, setFetchingData] = useState(true);

  // Fetch available users and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchingData(true);
        const token = localStorage.getItem("token");
        const headers: any = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // Fetch users
        const usersRes = await fetch('/api/managers/users', { headers });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setAvailableUsers(usersData.users || []);
        }

        // Fetch only main categories (level 1) for manager assignment
        let categoriesData = null;
        
        // Use /api/products/categories?type=main to get only main categories
        try {
          const categoriesRes = await fetch('/api/products/categories?type=main', { headers });
          if (categoriesRes.ok) {
            categoriesData = await categoriesRes.json();
            console.log('Main categories fetched from /api/products/categories:', categoriesData);
          } else {
            console.error('Failed to fetch categories from /api/products/categories:', categoriesRes.status);
          }
        } catch (error) {
          console.error('Failed to fetch categories from /api/products/categories:', error);
        }
        
        if (categoriesData) {
          // Handle different response formats
          let categories = [];
          if (Array.isArray(categoriesData)) {
            categories = categoriesData;
          } else if (categoriesData.categories) {
            categories = categoriesData.categories;
          } else if (categoriesData.products) {
            categories = categoriesData.products;
          }
          
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
          
          // Process categories to ensure we have proper name extraction and filter to only allowed categories
          const processedCategories = categories
            .map((cat: any) => {
              // If it's already a simple object with name, use it
              if (cat.name) {
                return { _id: cat._id || cat.id || cat.name, name: cat.name, level: cat.level };
              }
              // If it's a string, use it as name
              if (typeof cat === 'string') {
                return { _id: cat, name: cat, level: 1 };
              }
              // Try to extract name from various possible fields
              const name = cat.mainCategory || cat.category || cat.name || cat;
              return { _id: cat._id || cat.id || name, name: name, level: cat.level || 1 };
            })
            .filter((cat: any) => {
              // Only include categories that are in the allowed list
              return cat.name && allowedCategories.includes(cat.name);
            }); // Filter to only show allowed categories
          
          console.log('Processed main categories:', processedCategories.length);
          console.log('Category names:', processedCategories.map((c: any) => c.name));
          setAvailableCategories(processedCategories);
        } else {
          console.error('Failed to fetch categories from both endpoints');
          setMessage("Failed to load categories");
          setTimeout(() => setMessage(""), 3000);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setMessage("Error loading form data");
        setTimeout(() => setMessage(""), 3000);
      } finally {
        setFetchingData(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.user_id) {
      setMessage("Please select a user");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    if (formData.assignedCategories.length === 0) {
      setMessage("Please select at least one category");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Check if selected user is already a manager
    const selectedUser = availableUsers.find(u => u.user_id === formData.user_id);
    if (selectedUser?.isManager) {
      setMessage("This user is already a manager. Use 'Assign Categories' to modify their categories instead.");
      setTimeout(() => setMessage(""), 5000);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch('/api/managers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage("Manager created successfully!");
        setTimeout(() => {
          router.push('/managers');
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage(`Failed to create manager: ${errorData.message || 'Unknown error'}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('Error creating manager:', error);
      setMessage("Error creating manager");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      assignedCategories: prev.assignedCategories.includes(category)
        ? prev.assignedCategories.filter(c => c !== category)
        : [...prev.assignedCategories, category]
    }));
  };

  if (fetchingData) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="w-full min-w-0 max-w-full overflow-x-hidden">
        <Breadcrumb pageName="Create Manager" />
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Manager</h1>
                <p className="text-gray-600 dark:text-gray-400">Assign a user as a manager with specific categories</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {/* User Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select User *
                </label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData({...formData, user_id: e.target.value})}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                >
                  <option value="">Select a user...</option>
                  {availableUsers.map((user) => (
                    <option 
                      key={user._id} 
                      value={user.user_id}
                      disabled={user.isManager}
                      className={user.isManager ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-900 dark:text-white'}
                    >
                      {user.email} ({user.firstName} {user.lastName}) {user.isManager ? '(Already Manager)' : ''}
                    </option>
                  ))}
                </select>
                {formData.user_id && availableUsers.find(u => u.user_id === formData.user_id)?.isManager && (
                  <p className="mt-2 text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    This user is already a manager. Use "Assign Categories" to modify their categories instead.
                  </p>
                )}
              </div>

              {/* Manager Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Manager Level
                </label>
                <select
                  value={formData.managerLevel}
                  onChange={(e) => setFormData({...formData, managerLevel: e.target.value})}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="junior">Junior</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                  <option value="head">Head</option>
                </select>
              </div>

              {/* Assigned Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Assigned Categories *
                </label>
                {fetchingData ? (
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 dark:border-indigo-400 mr-2"></div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Loading categories...</p>
                    </div>
                  </div>
                ) : availableCategories.length === 0 ? (
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No categories available. Please check if categories are properly configured.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    {availableCategories.map((category) => {
                      // Extract category name - should be consistent after processing
                      const categoryName = category.name || (category as any).mainCategory || String(category);
                      const categoryId = category._id || (category as any).id || categoryName;
                      
                      return (
                        <label key={categoryId} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={formData.assignedCategories.includes(categoryName)}
                            onChange={() => handleCategoryToggle(categoryName)}
                            className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-600 dark:border-gray-500 dark:text-indigo-400"
                          />
                          <span className="text-sm text-gray-900 dark:text-white font-medium">{categoryName}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {formData.assignedCategories.length === 0 && availableCategories.length > 0 && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    Please select at least one category
                  </p>
                )}
              </div>

              {/* Notification Preferences */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Notification Preferences
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(formData.notificationPreferences).map(([key, value]) => (
                    <label key={key} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setFormData({
                          ...formData,
                          notificationPreferences: {
                            ...formData.notificationPreferences,
                            [key]: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-600 dark:border-gray-500 dark:text-indigo-400"
                      />
                      <span className="text-sm text-gray-900 dark:text-white capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.user_id || formData.assignedCategories.length === 0}
                className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white dark:border-gray-300"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Manager
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Message Display */}
        {message && (
          <div className="fixed top-4 right-4 z-50">
            <div className={`rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2 ${
              message.includes('successfully') 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
            }`}>
              {message.includes('successfully') ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {message}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
