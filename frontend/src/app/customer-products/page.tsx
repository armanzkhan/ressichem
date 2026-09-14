'use client';

import React, { useState, useEffect } from 'react';
import CustomerLayout from '../../components/Layouts/CustomerLayout';
import { formatPKR } from '@/utils/currency';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string | { mainCategory: string };
  sku: string;
}

export default function CustomerProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Fetch products with higher limit to get all products
      const response = await fetch('/api/customers/products?limit=1000&page=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Backend already filters to only show products with stock > 0
        // Double-check on frontend as well to ensure no out-of-stock products
        const availableProducts = (data.products || []).filter((product: Product) => product.stock > 0);
        setProducts(availableProducts);
        
        if (availableProducts.length === 0) {
          setMessage('⚠️ No products available - all products are currently out of stock');
        } else {
          setMessage(`✅ ${availableProducts.length} product(s) available for order`);
        }
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to load products: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      setMessage('❌ Error loading products');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading Products...</h2>
        </div>
      </div>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded ${
              message.startsWith('✅') 
                ? 'bg-green-100 border border-green-400 text-green-700' 
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {message}
            </div>
          )}

          {/* Products Grid */}
          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div 
                  key={product._id} 
                  className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700"
                >
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{product.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{product.description}</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-primary dark:text-blue-400">
                      {formatPKR(product.price)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">SKU: {product.sku}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      Stock: {product.stock}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {typeof product.category === 'string' ? product.category : product.category?.mainCategory}
                    </span>
                  </div>
                  <button 
                    className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📦</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Products Available</h3>
              <p className="text-gray-500 dark:text-gray-400">
                No products are currently available. Please contact your account manager or check back later.
              </p>
            </div>
          )}
      </div>
    </CustomerLayout>
  );
}
