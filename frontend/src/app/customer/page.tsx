'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Customer {
  _id: string;
  companyName: string;
  contactName: string;
  email: string;
  assignedManager?: {
    manager_id: {
      _id: string;
      user_id: string;
      assignedCategories: Array<{
        category: string;
        isActive: boolean;
      }>;
    };
  };
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string | { mainCategory: string };
  sku: string;
}

export default function CustomerPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    const token = localStorage.getItem("token");
    const userType = localStorage.getItem("userType");
    
    console.log('🔍 Customer Page - Auth Check:', { token: !!token, userType });
    
    if (!token) {
      console.log('❌ No token found, redirecting to login');
      router.push("/customer-login");
      return;
    }
    
    if (userType !== 'customer') {
      console.log('❌ Not a customer, redirecting to login');
      router.push("/customer-login");
      return;
    }
    
    await fetchCustomerData();
  };

  const fetchCustomerData = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Fetch customer dashboard data
      const response = await fetch('/api/customers/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Customer dashboard data:', data);
        setCustomer(data.customer);
        setMessage('Customer dashboard loaded successfully!');
      } else {
        console.error('❌ Failed to fetch customer data:', response.status);
        setMessage('Failed to load customer data');
      }
    } catch (error) {
      console.error('❌ Error fetching customer data:', error);
      setMessage('Error loading customer data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch('/api/customers/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Customer products:', data);
        setProducts(data.products || []);
      } else {
        console.error('❌ Failed to fetch products:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('userRole');
    router.push('/customer-login');
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Customer Portal</h1>
              <p className="text-gray-600">Welcome back, {customer?.contactName || 'Customer'}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message && (
          <div className="mb-6 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
            {message}
          </div>
        )}

        {/* Customer Info */}
        {customer && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Company</h3>
                <p className="text-lg text-gray-900">{customer.companyName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Contact</h3>
                <p className="text-lg text-gray-900">{customer.contactName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                <p className="text-lg text-gray-900">{customer.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Assigned Manager</h3>
                <p className="text-lg text-gray-900">
                  {customer.assignedManager ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
            
            {customer.assignedManager && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Manager Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {customer.assignedManager.manager_id.assignedCategories.map((category, index) => (
                    <span
                      key={index}
                      className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                    >
                      {category.category}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Products Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Available Products</h2>
            <button
              onClick={fetchProducts}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
            >
              Load Products
            </button>
          </div>
          
          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-bold text-primary">
                      ${product.price.toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-500">SKU: {product.sku}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Stock: {product.stock}
                    </span>
                    <span className="text-sm text-gray-500">
                      {typeof product.category === 'string' ? product.category : product.category?.mainCategory}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No products available. Click "Load Products" to fetch your assigned manager's products.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
