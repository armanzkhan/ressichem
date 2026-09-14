"use client";

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { productImageService } from "@/services/productImageService";

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  unit?: string;
  category: string | {
    mainCategory: string;
    subCategory?: string;
    subSubCategory?: string;
  };
  stock: number;
  sku: string;
  company_id: string;
  createdAt: string;
  updatedAt: string;
  images?: {
    primary?: string;
    category?: string;
    gallery?: string[];
  };
  imageAlt?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  // Helper function to get product image
  const getProductImage = (product: Product) => {
    // First try to use existing image data from product
    if (product.images?.primary || product.images?.category) {
      return {
        imageUrl: product.images.primary || product.images.category,
        altText: product.imageAlt || product.name
      };
    }
    
    // Fallback to image service
    return productImageService.getProductImage(product.category);
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      console.log('🔍 Fetching products...');
      console.log('   Token present:', !!token);
      
      const response = await fetch('/api/products?limit=2000', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      
      console.log('   Response status:', response.status);
      console.log('   Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        const products = Array.isArray(data) ? data : data.products || [];
        console.log('   Products fetched:', products.length);
        setProducts(products);
      } else {
        console.error('Failed to fetch products:', response.status, response.statusText);
        setMessage("❌ Failed to fetch products");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setMessage("❌ Error fetching products");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/sign-in");
      return;
    }
    fetchProducts();
  }, [router]);

  // Auto-refresh when page becomes visible and real-time polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchProducts();
      }
    };

    const handleFocus = () => {
      fetchProducts();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Real-time polling: Refresh products every 30 seconds
    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        fetchProducts();
      }
    }, 30000); // 30 seconds

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(pollInterval);
    };
  }, []);

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const productCategory = typeof product.category === 'string' 
      ? product.category 
      : product.category?.mainCategory || 'Uncategorized';
    const matchesCategory = !categoryFilter || productCategory === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      const url = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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

      if (response.ok) {
        setMessage(editingProduct ? "✅ Product updated successfully!" : "✅ Product created successfully!");
        await fetchProducts();
        setShowModal(false);
        setEditingProduct(null);
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
      } else {
        setMessage("❌ Failed to save product");
      }
    } catch (error) {
      console.error('Error saving product:', error);
      setMessage("❌ Error saving product");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle view product
  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowViewModal(true);
  };

  // Handle edit product
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      unit: product.unit || '',
      category: typeof product.category === 'string' ? product.category : product.category?.mainCategory || '',
      stock: product.stock.toString(),
      sku: product.sku,
      company_id: product.company_id
    });
    setShowModal(true);
  };

  // Handle delete product
  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete ${productName}?`)) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
    
      if (response.ok) {
        setMessage("✅ Product deleted successfully!");
        await fetchProducts();
        setTimeout(() => setMessage(""), 3000);
      } else {
        const errorData = await response.text();
        setMessage(`❌ Failed to delete product: ${errorData}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      setMessage("❌ Error deleting product");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Handle add product
  const handleAddProduct = () => {
    setEditingProduct(null);
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
    setShowModal(true);
  };

  // Get unique categories
  const categories = [...new Set(products.map(p => 
    typeof p.category === 'string' ? p.category : p.category?.mainCategory || 'Uncategorized'
  ))];

  return (
    <ProtectedRoute 
      requiredPermission="products.read"
    >
      <div className="w-full min-w-0">
        <Breadcrumb pageName="Products" />

        {/* Header Section */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 xl:p-8">
            <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6">
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-blue-900 dark:text-white truncate">
                    Product Management
                  </h1>
                  <p className="text-blue-700 dark:text-blue-300 text-xs sm:text-sm lg:text-base mt-1 truncate">
                    Manage your product catalog and inventory in the system.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    console.log('🔄 Manual refresh triggered');
                    fetchProducts();
                  }}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg sm:rounded-xl border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-center font-medium text-gray-700 hover:border-blue-900 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-blue-400 disabled:opacity-50 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base"
                >
                  <svg className={`mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Refresh</span>
                  <span className="sm:hidden">↻</span>
                </button>
                <PermissionGate permission="products.create">
                  <button
                    onClick={handleAddProduct}
                    className="inline-flex items-center justify-center rounded-lg sm:rounded-xl bg-blue-900 px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-3 text-center font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/50 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base"
                  >
                    <svg className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">Add Product</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                </PermissionGate>
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
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Total Products</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {products.length}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">All products</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 hover:shadow-lg sm:hover:shadow-xl lg:hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] lg:hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">In Stock</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {products.filter(p => p.stock > 0).length}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">Available products</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 hover:shadow-lg sm:hover:shadow-xl lg:hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] lg:hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Low Stock</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {products.filter(p => p.stock > 0 && p.stock <= 10).length}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">Need restocking</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 hover:shadow-lg sm:hover:shadow-xl lg:hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] lg:hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Out of Stock</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {products.filter(p => p.stock === 0).length}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">Unavailable</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                    placeholder="Search products by name, description, or SKU..."
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
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                >
                  <option value="">All Categories</option>
                  {categories.length > 0 ? (
                    categories.map((category, index) => (
                      <option key={`category-${index}-${category}`} value={category}>{category}</option>
                    ))
                  ) : (
                    <option value="" disabled>No categories available</option>
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-white">
                Product List
              </h2>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8 sm:py-12 lg:py-16">
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  <div className="inline-block h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 animate-spin rounded-full border-2 border-solid border-blue-900 border-r-transparent"></div>
                  <span className="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg">Loading products...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <div key={product._id} className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-sm sm:shadow-md lg:shadow-lg border border-white/30 dark:border-gray-600/30 p-3 sm:p-4 lg:p-6 hover:shadow-md sm:hover:shadow-lg lg:hover:shadow-xl transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] lg:hover:scale-105">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 lg:gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden">
                              <img
                                src={getProductImage(product).imageUrl}
                                alt={getProductImage(product).altText}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const nextSibling = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (nextSibling) {
                                    nextSibling.style.display = 'flex';
                                  }
                                }}
                              />
                              <div className="w-full h-full bg-blue-900 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg" style={{ display: 'none' }}>
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-blue-900 dark:text-white truncate">
                                {product.name}
                              </h3>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {product.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {product.sku && (
                                  <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800/50 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                                    SKU: {product.sku}
                                  </span>
                                )}
                                {product.unit && (
                                  <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/20 px-2 py-1 text-xs font-medium text-blue-800 dark:text-blue-400">
                                    Unit: {product.unit}
                                  </span>
                                )}
                                <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/20 px-2 py-1 text-xs font-medium text-blue-800 dark:text-blue-400">
                                  {typeof product.category === 'string' 
                                    ? product.category 
                                    : product.category?.mainCategory || 'Uncategorized'
                                  }
                                  {typeof product.category === 'object' && product.category?.subCategory && (
                                    <span className="ml-1"> › {product.category.subCategory}</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                            <div className="text-right">
                              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-white">
                                PKR {product.price.toLocaleString()}
                              </p>
                              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                product.stock === 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                product.stock <= 10 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              }`}>
                                Stock: {product.stock} {product.unit || 'units'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 sm:gap-3">
                            <PermissionGate permission="products.view">
                              <button 
                                onClick={() => handleViewProduct(product)}
                                className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-all duration-200 hover:scale-105"
                                title="View Product"
                              >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </PermissionGate>
                            <PermissionGate permission="products.update">
                              <button 
                                onClick={() => handleEditProduct(product)}
                                className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/30 transition-all duration-200 hover:scale-105"
                                title="Edit Product"
                              >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </PermissionGate>
                            <PermissionGate permission="products.delete">
                              <button 
                                onClick={() => handleDeleteProduct(product._id, product.name)}
                                className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30 transition-all duration-200 hover:scale-105"
                                title="Delete Product"
                              >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </PermissionGate>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 sm:py-12 lg:py-16">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-4 sm:mb-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-blue-900 dark:text-white mb-2">
                      No products found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg">
                      No products match your current search criteria.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
            
      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
          <div className="w-full max-w-4xl max-h-[95vh] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/20 animate-in fade-in duration-300 overflow-hidden">
            <div className="bg-blue-900/5 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 border-b border-white/20 dark:border-gray-700/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full bg-blue-900 shadow-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-blue-900 dark:text-white truncate">
                      {editingProduct ? 'Edit Product' : 'Add New Product'}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                      {editingProduct ? 'Update product information' : 'Enter product details'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 sm:p-2"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
              <form onSubmit={handleSubmit} className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
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
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                      >
                        <option value="">Select category</option>
                        {categories.map((category, index) => (
                          <option key={`form-category-${index}-${category}`} value={category}>{category}</option>
                        ))}
                      </select>
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
                        {editingProduct ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <svg className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {editingProduct ? 'Update Product' : 'Create Product'}
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex items-center justify-center rounded-lg sm:rounded-xl border border-gray-300 bg-white px-4 py-2 sm:px-6 sm:py-3 font-medium text-gray-700 hover:border-blue-900 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-blue-400 transition-colors text-xs sm:text-sm lg:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Product Modal */}
      {showViewModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
          <div className="w-full max-w-4xl max-h-[95vh] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/20 overflow-hidden">
            <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 border-b border-white/20 dark:border-gray-700/20">
              <div className="flex justify-between items-center">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-white">Product Details</h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 sm:p-2"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(95vh-120px)] p-3 sm:p-4 lg:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">Product Name</label>
                    <p className="text-sm sm:text-base lg:text-lg font-semibold text-blue-900 dark:text-white">{selectedProduct.name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">SKU</label>
                    <p className="text-sm sm:text-base text-blue-900 dark:text-white">{selectedProduct.sku}</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">Category</label>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                      {typeof selectedProduct.category === 'string' 
                        ? selectedProduct.category 
                        : selectedProduct.category?.mainCategory || 'Uncategorized'
                      }
                      {typeof selectedProduct.category === 'object' && selectedProduct.category?.subCategory && (
                        <span className="ml-1"> › {selectedProduct.category.subCategory}</span>
                      )}
                    </span>
                  </div>
                  
                  {selectedProduct.unit && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">Unit</label>
                      <p className="text-sm sm:text-base text-blue-900 dark:text-white">{selectedProduct.unit}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">Price</label>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-white">PKR {selectedProduct.price.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">Stock Level</label>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedProduct.stock === 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                        selectedProduct.stock <= 10 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      }`}>
                        {selectedProduct.stock} {selectedProduct.unit || 'units'}
                      </span>
                      {selectedProduct.stock === 0 && (
                        <span className="text-red-500 text-xs sm:text-sm font-medium">Out of Stock</span>
                      )}
                      {selectedProduct.stock > 0 && selectedProduct.stock <= 10 && (
                        <span className="text-yellow-500 text-xs sm:text-sm font-medium">Low Stock</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">Company</label>
                    <p className="text-sm sm:text-base text-blue-900 dark:text-white">{selectedProduct.company_id}</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">Created</label>
                    <p className="text-sm sm:text-base text-blue-900 dark:text-white">{new Date(selectedProduct.createdAt).toLocaleDateString()}</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">Last Updated</label>
                    <p className="text-sm sm:text-base text-blue-900 dark:text-white">{new Date(selectedProduct.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-6">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">Description</label>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 sm:p-4 rounded-lg">
                  <p className="text-sm sm:text-base text-blue-900 dark:text-white">{selectedProduct.description || 'No description provided'}</p>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEditProduct(selectedProduct);
                  }}
                  className="px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors"
                >
                  Edit Product
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