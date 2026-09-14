"use client";

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ProductCategory {
  _id: string;
  name: string;
  level: number;
  parent?: string;
  path: string;
  isActive: boolean;
  subCategories?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export default function ProductCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState<number | "all">(1); // Default to level 1 (main categories only)

  // Allowed main categories for manager assignment (8 categories)
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

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch('/api/product-categories', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const categoriesList = Array.isArray(data) ? data : data.categories || [];
          setCategories(categoriesList);
        } else {
          console.error('Failed to fetch categories:', response.status);
          toast.error('Failed to load product categories');
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Error loading product categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Filter categories
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (category.path && category.path.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesLevel = filterLevel === "all" || category.level === filterLevel;
    
    // If filtering by level 1 (main categories), only show allowed categories
    const matchesAllowed = filterLevel === 1 
      ? allowedMainCategories.includes(category.name)
      : true; // Show all categories for other levels
    
    return matchesSearch && matchesLevel && matchesAllowed;
  });

  // Group categories by level
  // For main categories, only count allowed ones (8 categories)
  const mainCategories = categories.filter(cat => 
    cat.level === 1 && allowedMainCategories.includes(cat.name)
  );
  const subCategories = categories.filter(cat => cat.level === 2);
  const subSubCategories = categories.filter(cat => cat.level === 3);

  return (
    <ProtectedRoute requiredPermission="categories.read">
      <div className="w-full min-w-0">
        <Breadcrumb pageName="Product Categories" />

        {/* Header Section */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 xl:p-8">
            <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6">
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-blue-900 dark:text-white truncate">
                    Product Categories
                  </h1>
                  <p className="text-blue-700 dark:text-blue-300 text-xs sm:text-sm lg:text-base mt-1 truncate">
                    {filterLevel === 1 
                      ? "View the 8 main product categories (use filter to see subcategories)"
                      : filterLevel === "all"
                      ? "View all product categories (main, sub, and sub-sub categories)"
                      : `View ${filterLevel === 2 ? 'sub' : 'sub-sub'} categories`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 xl:gap-6">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                    {filterLevel === 1 ? "Main Categories" : filterLevel === "all" ? "Total Categories" : `Level ${filterLevel} Categories`}
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {filterLevel === "all" ? categories.length : filteredCategories.length}
                  </p>
                  {filterLevel === 1 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">8 main categories</p>
                  )}
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Main Categories (Level 1)</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {mainCategories.length}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">Can be assigned to managers</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Sub Categories (Level 2)</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {subCategories.length}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Active Categories</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {categories.filter(cat => cat.isActive).length}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search categories by name or path..."
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
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                  className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                >
                  <option value="1">Main Categories Only (8 categories)</option>
                  <option value="1">Main Categories Only (8 categories)</option>
                  <option value="all">All Levels</option>
                  <option value="2">Sub Categories</option>
                  <option value="3">Sub-Sub Categories</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Categories List */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-white">
                Categories List
              </h2>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {filteredCategories.length} categor{filteredCategories.length !== 1 ? 'ies' : 'y'}
              </div>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8 sm:py-12 lg:py-16">
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  <div className="inline-block h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 animate-spin rounded-full border-2 border-solid border-blue-900 border-r-transparent"></div>
                  <span className="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg">Loading categories...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => (
                    <div key={category._id} className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-sm sm:shadow-md lg:shadow-lg border border-white/30 dark:border-gray-600/30 p-3 sm:p-4 lg:p-6 hover:shadow-md sm:hover:shadow-lg lg:hover:shadow-xl transition-all duration-300">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl bg-blue-900 flex items-center justify-center shadow-lg flex-shrink-0">
                              <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-blue-900 dark:text-white truncate">
                                {category.name}
                              </h3>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                                Path: {category.path}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                  category.level === 1 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                                  category.level === 2 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                  'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                                }`}>
                                  Level {category.level}
                                </span>
                                {category.isActive ? (
                                  <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 px-2 py-1 text-xs font-medium">
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 px-2 py-1 text-xs font-medium">
                                    Inactive
                                  </span>
                                )}
                                {category.subCategories && category.subCategories.length > 0 && (
                                  <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 px-2 py-1 text-xs font-medium">
                                    {category.subCategories.length} sub-categor{category.subCategories.length !== 1 ? 'ies' : 'y'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 sm:py-12 lg:py-16">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-4 sm:mb-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-blue-900 dark:text-white mb-2">
                      No categories found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg">
                      {searchTerm || filterLevel !== "all" 
                        ? "No categories match your current search criteria."
                        : "No product categories have been created yet."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

