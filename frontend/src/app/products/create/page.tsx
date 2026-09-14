"use client";

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function CreateProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    unit: "",
    category: "",
    stock: "",
    sku: "",
    company_id: "RESSICHEM"
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [fetchingCategories, setFetchingCategories] = useState(true);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setFetchingCategories(true);
        const token = localStorage.getItem("token");
        if (!token) {
          setFetchingCategories(false);
          return;
        }

        const headers: any = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // First, try to fetch from /api/products/categories?type=main (same as managers/create page)
        let categoriesData = null;
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

        // If that didn't work, try /api/product-categories
        if (!categoriesData || (Array.isArray(categoriesData) && categoriesData.length === 0)) {
          try {
            const productCategoriesRes = await fetch('/api/product-categories', { headers });
            if (productCategoriesRes.ok) {
              categoriesData = await productCategoriesRes.json();
              console.log('Categories fetched from /api/product-categories:', categoriesData);
            }
          } catch (error) {
            console.error('Error fetching from product-categories API:', error);
          }
        }

        // If still no categories, try extracting from existing products
        if (!categoriesData || (Array.isArray(categoriesData) && categoriesData.length === 0)) {
          try {
            const productsRes = await fetch('/api/products?limit=2000', { headers });
            if (productsRes.ok) {
              const productsData = await productsRes.json();
              const products = Array.isArray(productsData) ? productsData : productsData.products || [];
              
              // Extract unique categories from products
              const categoryStrings: string[] = products
                .map((p: any) => typeof p.category === 'string' ? p.category : p.category?.mainCategory || null)
                .filter((cat: string | null): cat is string => Boolean(cat));
              const uniqueCategories: string[] = [...new Set(categoryStrings)];
              
              if (uniqueCategories.length > 0) {
                categoriesData = uniqueCategories.map((name) => ({ name }));
                console.log('Categories extracted from products:', categoriesData);
              }
            }
          } catch (error) {
            console.error('Error fetching products for categories:', error);
          }
        }

        // Process categories to extract names
        if (categoriesData) {
          let categoriesList = [];
          if (Array.isArray(categoriesData)) {
            categoriesList = categoriesData;
          } else if (categoriesData.categories) {
            categoriesList = categoriesData.categories;
          } else if (categoriesData.products) {
            categoriesList = categoriesData.products;
          }
          
          // Extract category names
          const categoryNames: string[] = categoriesList
            .map((cat: any) => {
              // Handle different possible structures
              if (typeof cat === 'string') {
                return cat;
              }
              return cat.name || cat.mainCategory || cat.category || null;
            })
            .filter((name: string | null): name is string => Boolean(name));
          
          // Remove duplicates and sort
          const uniqueCategoryNames: string[] = [...new Set(categoryNames)].sort();
          
          console.log('Final category names:', uniqueCategoryNames);
          setCategories(uniqueCategoryNames);
        } else {
          console.error('No categories found from any source');
          setCategories([]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      } finally {
        setFetchingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("❌ Please log in to create a product");
        router.push("/auth/sign-in");
        return;
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          unit: formData.unit || undefined,
          category: formData.category ? {
            mainCategory: formData.category
          } : undefined
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        toast.success("Product created successfully!");
        setMessage("✅ Product created successfully!");
        
        // Reset form
        setFormData({
          name: "",
          description: "",
          price: "",
          unit: "",
          category: "",
          stock: "",
          sku: "",
          company_id: "RESSICHEM"
        });

        // Redirect to products page after a short delay
        setTimeout(() => {
          router.push("/products");
        }, 1500);
      } else {
        const errorMessage = responseData.message || responseData.error || "Failed to create product";
        setMessage(`❌ ${errorMessage}`);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating product:', error);
      const errorMessage = error instanceof Error ? error.message : "Error creating product";
      setMessage(`❌ ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute requiredPermission="products.create">
      <div className="w-full min-w-0">
        <Breadcrumb pageName="Create Product" />

        {/* Header Section */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 xl:p-8">
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-blue-900 dark:text-white truncate">
                  Create New Product
                </h1>
                <p className="text-blue-700 dark:text-blue-300 text-xs sm:text-sm lg:text-base mt-1 truncate">
                  Add a new product to your catalog
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Product Information */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h4 className="text-sm sm:text-base lg:text-lg font-medium text-blue-900 dark:text-white">Product Information</h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-blue-900 dark:text-white">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Enter product name"
                      className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                    />
                  </div>
                  
                  <div>
                    <label className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-blue-900 dark:text-white">
                      SKU <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.sku}
                      onChange={(e) => setFormData({...formData, sku: e.target.value})}
                      placeholder="Enter product SKU"
                      className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                    />
                  </div>

                  <div>
                    <label className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-blue-900 dark:text-white">
                      Category <span className="text-red-500">*</span>
                    </label>
                    {fetchingCategories ? (
                      <div className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-2 sm:px-4 sm:py-3 flex items-center">
                        <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-900 border-r-transparent mr-2"></div>
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Loading categories...</span>
                      </div>
                    ) : (
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                      >
                        <option value="">Select category</option>
                        {categories.length > 0 ? (
                          categories.map((category, index) => (
                            <option key={`category-${index}-${category}`} value={category}>{category}</option>
                          ))
                        ) : (
                          <option value="" disabled>No categories available</option>
                        )}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-blue-900 dark:text-white">
                      Price (PKR) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">PKR</span>
                      </div>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        placeholder="0.00"
                        className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2 sm:pl-12 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-blue-900 dark:text-white">
                      Unit <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                    >
                      <option value="">Select unit</option>
                      <option value="LTR">LTR (Liters)</option>
                      <option value="KG">KG (Kilograms)</option>
                      <option value="GM">GM (Grams)</option>
                      <option value="PCS">PCS (Pieces)</option>
                      <option value="BOX">BOX</option>
                      <option value="PKG">PKG (Package)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-blue-900 dark:text-white">
                      Stock Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                      placeholder="Enter stock quantity"
                      className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Enter product description"
                    rows={3}
                    className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                  />
                </div>
              </div>

              {/* Hidden company_id field */}
              <input type="hidden" value={formData.company_id} />

              {/* Message Display */}
              {message && (
                <div className={`p-3 sm:p-4 rounded-lg text-xs sm:text-sm ${message.includes('✅') ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
                  {message}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center rounded-lg sm:rounded-xl bg-blue-900 px-4 py-2 sm:px-6 sm:py-3 font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 text-xs sm:text-sm lg:text-base"
                >
                  {submitting ? (
                    <>
                      <div className="inline-block h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Product
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => router.push("/products")}
                  className="flex items-center justify-center rounded-lg sm:rounded-xl border border-gray-300 bg-white px-4 py-2 sm:px-6 sm:py-3 font-medium text-gray-700 hover:border-blue-900 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-blue-400 transition-colors text-xs sm:text-sm lg:text-base"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

