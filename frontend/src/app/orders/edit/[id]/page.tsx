"use client";

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface Customer {
  _id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  sku: string;
}

interface OrderItem {
  product: Product;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  customer: Customer;
  items: OrderItem[];
  status: string;
  total: number;
  notes: string;
  orderDate: string;
}

export default function EditOrderPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    customer: "",
    items: [] as OrderItem[],
    notes: "",
    status: ""
  });
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  // Fetch order, customers and products
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get token from localStorage
      const token = localStorage.getItem("token");
      
      const [orderRes, customersRes, productsRes] = await Promise.all([
        fetch(`/api/orders/${orderId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        }),
        fetch('/api/customers', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        }),
        fetch('/api/products', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        })
      ]);

      if (orderRes.ok) {
        const orderData = await orderRes.json();
        setOrder(orderData);
        setFormData({
          customer: orderData.customer._id,
          items: orderData.items || [],
          notes: orderData.notes || "",
          status: orderData.status || "pending"
        });
      }

      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData);
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        // Handle both array format and object with products array
        const products = Array.isArray(productsData) ? productsData : productsData.products || [];
        setProducts(products);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("Please log in to access orders");
      router.push("/auth/sign-in");
      return;
    }
    
    if (orderId) {
      fetchData();
    }
  }, [orderId, router]);

  // Add item to order
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product: products[0], quantity: 1, price: products[0]?.price || 0 }]
    }));
  };

  // Remove item from order
  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Update item
  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          if (field === 'product') {
            return { ...item, product: value, price: value.price };
          } else if (field === 'quantity') {
            return { ...item, quantity: value, price: item.product.price * value };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const orderData = {
        customer: formData.customer,
        items: formData.items.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.price
        })),
        notes: formData.notes,
        status: formData.status,
        total: total
      };

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        setMessage("✅ Order updated successfully!");
        setTimeout(() => {
          router.push('/orders');
        }, 2000);
      } else {
        setMessage("❌ Failed to update order");
      }
    } catch (error) {
      console.error('Error updating order:', error);
      setMessage("❌ Error updating order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-dark dark:text-white mb-4">Order Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">The order you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/orders')}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-center font-medium text-white hover:bg-opacity-90"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermission="orders.update">
      <Breadcrumb pageName={`Edit Order - ${order.orderNumber}`} />
      
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="px-4 py-6 md:px-6 xl:px-9">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h4 className="text-xl font-semibold text-black dark:text-white">
              Edit Order - {order.orderNumber}
            </h4>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => router.push('/orders')}
                className="inline-flex items-center justify-center rounded-lg border border-stroke bg-transparent px-4 py-3 text-center font-medium text-dark hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-dark-3 dark:text-white dark:hover:border-primary"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Orders
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Customer Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-dark dark:text-white">Customer Information</h4>
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Select Customer <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.customer}
                  onChange={(e) => setFormData({...formData, customer: e.target.value})}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white transition-colors"
                >
                  <option value="">Choose a customer</option>
                  {customers.map(customer => (
                    <option key={customer._id} value={customer._id}>
                      {customer.companyName} - {customer.contactName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Order Status */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-dark dark:text-white">Order Status</h4>
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white transition-colors"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-dark dark:text-white">Order Items</h4>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-center font-medium text-white hover:bg-opacity-90"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              </div>

              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No items in this order. Click "Add Item" to add products.
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={`item-${index}-${item.product?._id || 'new'}`} className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-2">
                          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                            Product
                          </label>
                          <select
                            value={item.product._id}
                            onChange={(e) => {
                              const product = products.find(p => p._id === e.target.value);
                              if (product) updateItem(index, 'product', product);
                            }}
                            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white transition-colors"
                          >
                            {products.map(product => (
                              <option key={product._id} value={product._id}>
                                {product.name} (PKR {product.price.toLocaleString()})
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white transition-colors"
                          />
                        </div>
                        
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                              Total
                            </label>
                            <div className="rounded-lg border border-stroke bg-gray-50 px-4 py-3 text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white">
                              PKR {item.price.toLocaleString()}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order Notes */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-dark dark:text-white">Order Notes</h4>
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Enter any special instructions or notes for this order..."
                  rows={3}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white transition-colors"
                />
              </div>
            </div>

            {/* Order Summary */}
            {formData.items.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-dark dark:text-white">Order Summary</h4>
                </div>
                
                <div className="rounded-lg border border-stroke bg-gray-50 p-6 dark:border-dark-3 dark:bg-dark-2">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-dark dark:text-white">Subtotal:</span>
                      <span className="font-medium text-dark dark:text-white">PKR {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark dark:text-white">Tax (10%):</span>
                      <span className="font-medium text-dark dark:text-white">PKR {tax.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-stroke pt-3 dark:border-dark-3">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold text-dark dark:text-white">Total:</span>
                        <span className="text-lg font-semibold text-primary">PKR {total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                disabled={submitting || formData.items.length === 0 || !formData.customer}
                className="flex items-center justify-center rounded-lg bg-gradient-to-r from-primary to-primary/90 px-6 py-3 font-medium text-white hover:from-primary/90 hover:to-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
              >
                {submitting ? (
                  <>
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></div>
                    Updating Order...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Update Order
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => router.push('/orders')}
                className="flex items-center justify-center rounded-lg border border-stroke bg-transparent px-6 py-3 font-medium text-dark hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-dark-3 dark:text-white dark:hover:border-primary transition-colors"
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
