"use client";

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/Auth/user-context";
import { getAuthHeaders, handleAuthError } from "@/lib/auth";

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
  unit?: string;
  category: string | {
    mainCategory: string;
    subCategory?: string;
    subSubCategory?: string;
  };
  stock: number;
  sku: string;
  tdsLink?: string;
}

interface Category {
  _id: string;
  name: string;
  type: string;
  parent?: string;
  level: number;
}

interface OrderItem {
  product: Product;
  quantity: number;
  price: number;
  tdsLink?: string;
  selectedCategory?: string; // Category filter for this item
}

export default function CreateOrderPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [managerProfile, setManagerProfile] = useState<any>(null);
  const [customerAssignedManagers, setCustomerAssignedManagers] = useState<any[]>([]);
  const [customerManagerCategories, setCustomerManagerCategories] = useState<string[]>([]);
  const [customerManagerDetails, setCustomerManagerDetails] = useState<any[]>([]); // Store manager details for display
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [customerNotFound, setCustomerNotFound] = useState(false);
  const [savingTdsLinks, setSavingTdsLinks] = useState<Set<string>>(new Set());
  const [productSearchTerms, setProductSearchTerms] = useState<{ [key: number]: string }>({});
  const [productSearchOpen, setProductSearchOpen] = useState<{ [key: number]: boolean }>({});
  const [isCategoryChanging, setIsCategoryChanging] = useState<{ [key: number]: boolean }>({});
  const [formData, setFormData] = useState({
    customer: "",
    items: [] as OrderItem[],
    notes: ""
  });
  const [customerStats, setCustomerStats] = useState<{
    totalOrders: number;
    orderStatuses: { [key: string]: number };
    outstandingBalance: number;
    loading: boolean;
  }>({
    totalOrders: 0,
    orderStatuses: {},
    outstandingBalance: 0,
    loading: true
  });
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  // Get products for display - show ALL products for customers, filtered for managers
  const getFilteredProducts = () => {
    // For customers: filter by assigned managers' categories if managers are assigned
    if (user?.userType === 'customer' || user?.isCustomer) {
      // If customer has assigned managers, filter products by their categories
      if (customerManagerCategories.length > 0) {
        return products.filter(product => {
          if (product.category && typeof product.category === 'object' && product.category.mainCategory) {
            const mainCategory = product.category.mainCategory;
            // Check if product's category matches any of the assigned managers' categories
            return customerManagerCategories.some(assignedCat => {
              return assignedCat === mainCategory || 
                     assignedCat.includes(mainCategory) || 
                     mainCategory.includes(assignedCat);
            });
          }
          return false;
        });
      }
      // If no managers assigned, show all products
      return products;
    }
    
    // For managers: filter by assigned categories
    if (managerProfile?.assignedCategories && managerProfile.assignedCategories.length > 0) {
      const assignedCategories = managerProfile.assignedCategories;

      return products.filter(product => {
        // Category is always an object with { mainCategory, subCategory, subSubCategory }
        if (product.category && typeof product.category === 'object' && product.category.mainCategory) {
          const categoryObj = product.category;
          const mainCategory = categoryObj.mainCategory;
          
          // Check if any assigned category matches the product's mainCategory
          return assignedCategories.some((assignedCat: any) => {
            // Exact match or substring match
            return assignedCat === mainCategory || 
                   assignedCat.includes(mainCategory) || 
                   mainCategory.includes(assignedCat);
          });
        }
        return false;
      });
    }

    // Default: show all products
    return products;
  };

  // Filter products by category for a specific item
  // Category structure: { mainCategory: string, subCategory?: string, subSubCategory?: string }
  const getProductsByCategory = (selectedCategory?: string) => {
    const baseProducts = getFilteredProducts();
    
    if (!selectedCategory || selectedCategory === '') {
      return baseProducts;
    }

    return baseProducts.filter(product => {
      // Category is always an object with { mainCategory, subCategory, subSubCategory }
      if (product.category && typeof product.category === 'object' && product.category.mainCategory) {
        const mainCategory = product.category.mainCategory;
        // Exact match on mainCategory
        return mainCategory === selectedCategory;
      }
      return false;
    });
  };

  // Get unique categories from products
  // Category structure: { mainCategory: string, subCategory?: string, subSubCategory?: string }
  const getUniqueCategories = (): string[] => {
    const categorySet = new Set<string>();
    const baseProducts = getFilteredProducts();

    baseProducts.forEach(product => {
      // Category is always an object with { mainCategory, subCategory, subSubCategory }
      if (product.category && typeof product.category === 'object' && product.category.mainCategory) {
        categorySet.add(product.category.mainCategory);
      }
    });

    return Array.from(categorySet).sort();
  };

  // Filter products by search term (searches name, SKU, and description)
  const getFilteredProductsBySearch = (itemIndex: number, category?: string) => {
    const baseProducts = getProductsByCategory(category);
    const searchTerm = (productSearchTerms[itemIndex] || '').toLowerCase().trim();
    
    if (!searchTerm) {
      return baseProducts;
    }

    return baseProducts.filter(product => {
      const nameMatch = product.name?.toLowerCase().includes(searchTerm);
      const skuMatch = product.sku?.toLowerCase().includes(searchTerm);
      const descMatch = product.description?.toLowerCase().includes(searchTerm);
      
      return nameMatch || skuMatch || descMatch;
    });
  };

  // Fetch customers, products, categories, and manager profile
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [customersRes, productsRes, categoriesRes, managerRes] = await Promise.all([
        fetch('/api/customers', {
          headers: getAuthHeaders(),
        }),
        fetch('/api/products?limit=2000', {
          headers: getAuthHeaders(),
        }),
        fetch('/api/products/categories', {
          headers: getAuthHeaders(),
        }),
        fetch('/api/managers/profile', {
          headers: getAuthHeaders(),
        })
      ]);

      if (customersRes.ok) {
        const customersData = await customersRes.json();
        const customersArray = Array.isArray(customersData) ? customersData : customersData.customers || [];
        setCustomers(customersArray);
      } else {
        if (handleAuthError(customersRes.status, "Please log in to view customers")) {
          setLoading(false);
          return;
        }
        setCustomers([]);
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const products = Array.isArray(productsData) ? productsData : productsData.products || [];
        setProducts(products);
      } else {
        setProducts([]);
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        const categories = Array.isArray(categoriesData) ? categoriesData : categoriesData.categories || [];
        setCategories(categories);
      } else {
        setCategories([]);
      }

      if (managerRes.ok) {
        const managerData = await managerRes.json();
        setManagerProfile(managerData.manager || managerData);
      } else {
        setManagerProfile(null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setCustomers([]);
      setProducts([]);
      setCategories([]);
      setManagerProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading) {
      return;
    }
    
    if (!user) {
      router.push("/auth/sign-in");
      return;
    }
    
    fetchData();
    
    // Fetch customer statistics if user is a customer
    if (user?.isCustomer) {
      fetchCustomerStatistics();
    }
  }, [user, userLoading, router]);

  // Fetch customer's assigned managers and their categories
  const fetchCustomerAssignedManagers = async (customerId: string) => {
    try {
      console.log('👥 Fetching assigned managers for customer:', customerId);
      const token = localStorage.getItem("token");
      if (!token) return;

      // Fetch customer details which should include assignedManagers
      const customerRes = await fetch(`/api/customers/${customerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (customerRes.ok) {
        const customerData = await customerRes.json();
        console.log('👥 Customer data:', customerData);
        
        const assignedManagers = customerData.assignedManagers || [];
        setCustomerAssignedManagers(assignedManagers);
        
        if (assignedManagers.length > 0) {
          // Fetch manager details to get their assigned categories
          const managerIds = assignedManagers
            .map((am: any) => am.manager_id)
            .filter(Boolean);
          
          console.log('👥 Manager IDs to fetch:', managerIds);
          
          if (managerIds.length > 0) {
            // Fetch all managers and filter by IDs
            const managersRes = await fetch('/api/managers/all', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (managersRes.ok) {
              const managersData = await managersRes.json();
              const allManagers = Array.isArray(managersData) ? managersData : managersData.managers || [];
              
              // Find managers that match the assigned manager IDs
              const relevantManagers = allManagers.filter((m: any) => 
                managerIds.some((id: any) => {
                  const managerId = typeof id === 'object' && id !== null ? (id._id || id) : id;
                  return String(m._id) === String(managerId) || String(m.user_id) === String(managerId);
                })
              );
              
              console.log('👥 Relevant managers found:', relevantManagers.length);
              
              // Store manager details for display
              setCustomerManagerDetails(relevantManagers);
              
              // Extract all categories from assigned managers
              const allCategories = new Set<string>();
              relevantManagers.forEach((manager: any) => {
                const categories = manager.assignedCategories || [];
                categories.forEach((cat: any) => {
                  const categoryName = typeof cat === 'string' ? cat : (cat.category || cat.name || '');
                  if (categoryName) {
                    allCategories.add(categoryName);
                  }
                });
              });
              
              const categoriesArray = Array.from(allCategories);
              setCustomerManagerCategories(categoriesArray);
              console.log('📦 Customer can order from categories:', categoriesArray);
            }
          } else {
            setCustomerManagerCategories([]);
          }
        } else {
          setCustomerAssignedManagers([]);
          setCustomerManagerCategories([]);
          setCustomerManagerDetails([]);
          console.log('👥 No managers assigned to customer');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching customer assigned managers:', error);
      setCustomerAssignedManagers([]);
      setCustomerManagerCategories([]);
      setCustomerManagerDetails([]);
    }
  };

  // Fetch customer order statistics and outstanding balance
  const fetchCustomerStatistics = async (customerId?: string) => {
    try {
      setCustomerStats(prev => ({ ...prev, loading: true }));
      
      console.log('🔍 Fetching customer statistics...', { customerId, formDataCustomer: formData.customer, userEmail: user?.email });
      
      let totalOrders = 0;
      const orderStatuses: { [key: string]: number } = {};
      let customerIdToUse = customerId || formData.customer;
      
      // Try to get customer ID from dashboard first (optional, fallback to orders)
      try {
        const dashboardRes = await fetch('/api/customers/dashboard', {
          headers: getAuthHeaders(),
        });
        
        console.log('📊 Dashboard API response status:', dashboardRes.status, dashboardRes.statusText);
        
        if (dashboardRes.ok) {
          const dashboardData = await dashboardRes.json();
          console.log('📊 Dashboard data:', dashboardData);
          
          // Get customer ID from dashboard response
          if (dashboardData.customer?._id) {
            customerIdToUse = dashboardData.customer._id;
            console.log('✅ Customer ID from dashboard:', customerIdToUse);
          }
          
          if (dashboardData.stats) {
            totalOrders = dashboardData.stats.totalOrders || 0;
            console.log('📈 Total orders from stats:', totalOrders);
          }
        } else {
          const errorText = await dashboardRes.text();
          console.warn('⚠️ Dashboard API failed (non-critical):', {
            status: dashboardRes.status,
            statusText: dashboardRes.statusText,
            body: errorText.substring(0, 200) // Limit length
          });
        }
      } catch (dashboardError) {
        console.warn('⚠️ Dashboard API error (non-critical):', dashboardError);
      }
      
      // Always fetch orders directly - this is the primary source of truth
      console.log('📦 Fetching orders directly...');
      try {
        const ordersRes = await fetch('/api/customers/orders?limit=10000&page=1', {
          headers: getAuthHeaders(),
        });
        
        console.log('📦 Orders API response status:', ordersRes.status, ordersRes.statusText);
        console.log('📦 Orders API response ok:', ordersRes.ok);
        console.log('📦 Orders API response headers:', Object.fromEntries(ordersRes.headers.entries()));
        
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          console.log('📦 Orders data response:', {
            isArray: Array.isArray(ordersData),
            hasOrders: !!ordersData.orders,
            ordersLength: ordersData.orders?.length || 0,
            pagination: ordersData.pagination,
            keys: Object.keys(ordersData)
          });
          
          // Handle both array response and object with orders property
          const orders = Array.isArray(ordersData) ? ordersData : (ordersData.orders || []);
          console.log('📦 Orders array length:', orders.length);
          console.log('📦 Orders data sample:', orders.length > 0 ? orders[0] : 'No orders');
          
          // Check pagination for total orders first
          if (ordersData.pagination?.totalOrders !== undefined) {
            totalOrders = ordersData.pagination.totalOrders;
            console.log('📊 Total orders from pagination.totalOrders:', totalOrders);
          } else if (ordersData.pagination?.total !== undefined) {
            totalOrders = ordersData.pagination.total;
            console.log('📊 Total orders from pagination.total:', totalOrders);
          }
          
          if (orders.length > 0) {
            // Count orders by status
            orders.forEach((order: any) => {
              const status = order.status || 'pending';
              orderStatuses[status] = (orderStatuses[status] || 0) + 1;
            });
            
            console.log('📊 Order statuses breakdown:', orderStatuses);
            console.log('📊 Order statuses count:', Object.keys(orderStatuses).length);
            
            // Use actual orders count if pagination total is not available
            if (totalOrders === 0) {
              totalOrders = orders.length;
            }
            
            // Try to get customer ID from first order if not already set
            if (!customerIdToUse) {
              if (orders[0].customer?._id) {
                customerIdToUse = orders[0].customer._id;
                console.log('✅ Customer ID from orders:', customerIdToUse);
              } else if (typeof orders[0].customer === 'string') {
                customerIdToUse = orders[0].customer;
                console.log('✅ Customer ID (string) from orders:', customerIdToUse);
              }
            }
          } else {
            // If we have pagination total but no orders in response, fetch all orders page by page
            if (totalOrders > 0 && orders.length === 0) {
              console.warn('⚠️ Pagination shows', totalOrders, 'orders but 0 returned. Fetching all orders page by page...');
              console.log('📊 Pagination info:', ordersData.pagination);
              
              // Fetch all orders by looping through pages
              try {
                const allOrders: any[] = [];
                const pageSize = 50; // Fetch in smaller chunks
                const totalPages = Math.ceil(totalOrders / pageSize);
                
                console.log(`🔄 Fetching ${totalPages} pages of orders (${pageSize} per page)...`);
                
                for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                  try {
                    const pageRes = await fetch(`/api/customers/orders?limit=${pageSize}&page=${pageNum}`, {
                      headers: getAuthHeaders(),
                    });
                    
                    if (pageRes.ok) {
                      const pageData = await pageRes.json();
                      const pageOrders = Array.isArray(pageData) ? pageData : (pageData.orders || []);
                      console.log(`📦 Page ${pageNum}/${totalPages}: ${pageOrders.length} orders`);
                      
                      if (pageOrders.length > 0) {
                        allOrders.push(...pageOrders);
                      }
                      
                      // If no more orders, break
                      if (pageOrders.length === 0) {
                        console.log(`⚠️ Page ${pageNum} returned 0 orders, stopping...`);
                        break;
                      }
                    } else {
                      console.warn(`⚠️ Page ${pageNum} failed with status ${pageRes.status}`);
                    }
                  } catch (pageError) {
                    console.error(`❌ Error fetching page ${pageNum}:`, pageError);
                  }
                }
                
                console.log(`📦 Total orders collected: ${allOrders.length}`);
                console.log('📦 All orders sample:', allOrders.length > 0 ? allOrders[0] : 'No orders');
                
                if (allOrders.length > 0) {
                  // Count orders by status
                  allOrders.forEach((order: any) => {
                    const status = order.status || 'pending';
                    orderStatuses[status] = (orderStatuses[status] || 0) + 1;
                  });
                  console.log('📊 Order statuses breakdown (all orders):', orderStatuses);
                  console.log('📊 Order statuses count (all orders):', Object.keys(orderStatuses).length);
                  
                  // Update total orders from actual count
                  totalOrders = allOrders.length;
                } else {
                  console.warn('⚠️ Collected 0 orders across all pages');
                }
              } catch (fetchAllError) {
                console.error('❌ Error fetching all orders:', fetchAllError);
              }
            } else {
              console.log('ℹ️ No orders found in response and no pagination total');
            }
          }
        } else {
          // Try to get error text
          let errorText = '';
          try {
            errorText = await ordersRes.text();
            console.log('📦 Error text length:', errorText.length);
          } catch (textError) {
            console.error('❌ Could not read error text:', textError);
            errorText = 'Could not read error response';
          }
          
          const errorDetails = {
            status: ordersRes.status,
            statusText: ordersRes.statusText,
            body: errorText ? errorText.substring(0, 500) : 'No error body',
            bodyLength: errorText.length
          };
          console.error('❌ Failed to fetch orders:', errorDetails);
          
          // Try to parse error as JSON
          let errorData;
          if (errorText) {
            try {
              errorData = JSON.parse(errorText);
              console.error('❌ Orders error details:', errorData);
            } catch (e) {
              // Not JSON, already logged as text
              errorData = { message: errorText || 'Unknown error' };
              console.error('❌ Orders error (not JSON):', errorText);
            }
          } else {
            errorData = { message: 'No error message received' };
          }
          
          // Show user-friendly error message
          if (ordersRes.status === 404) {
            console.warn('⚠️ Customer not found - orders will show as 0');
            // Continue with empty orders - this is expected if customer doesn't exist yet
          } else if (ordersRes.status === 401) {
            console.error('❌ Authentication failed - user needs to login');
          } else if (ordersRes.status === 500) {
            console.error('❌ Server error fetching orders:', errorData);
          } else {
            console.error('❌ Unexpected error fetching orders:', errorData);
          }
        }
      } catch (fetchError) {
        console.error('❌ Network error fetching orders:', fetchError);
        console.error('❌ Error details:', {
          message: fetchError instanceof Error ? fetchError.message : 'Unknown error',
          stack: fetchError instanceof Error ? fetchError.stack : undefined
        });
      }
      
      // Fetch customer ledger for outstanding balance
      let outstandingBalance = 0;
      if (customerIdToUse) {
        try {
          console.log('💰 Fetching ledger for customer:', customerIdToUse);
          const ledgerRes = await fetch(`/api/customer-ledger/${customerIdToUse}/ledger`, {
            headers: getAuthHeaders(),
          });
          
          console.log('💰 Ledger API response status:', ledgerRes.status);
          
          if (ledgerRes.ok) {
            const ledgerData = await ledgerRes.json();
            console.log('💰 Ledger data:', ledgerData);
            
            // Check different possible response structures
            if (ledgerData.data?.ledger?.currentBalance !== undefined) {
              outstandingBalance = ledgerData.data.ledger.currentBalance;
            } else if (ledgerData.ledger?.currentBalance !== undefined) {
              outstandingBalance = ledgerData.ledger.currentBalance;
            } else if (ledgerData.data?.currentBalance !== undefined) {
              outstandingBalance = ledgerData.data.currentBalance;
            } else if (ledgerData.currentBalance !== undefined) {
              outstandingBalance = ledgerData.currentBalance;
            } else if (ledgerData.data?.data?.ledger?.currentBalance !== undefined) {
              outstandingBalance = ledgerData.data.data.ledger.currentBalance;
            }
            
            console.log('💰 Outstanding balance:', outstandingBalance);
          } else {
            const errorText = await ledgerRes.text().catch(() => '');
            let errorData = {};
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { message: errorText || 'Failed to fetch ledger' };
            }
            
            console.error('❌ Failed to fetch ledger:', {
              status: ledgerRes.status,
              statusText: ledgerRes.statusText,
              error: errorData
            });
            
            // If ledger doesn't exist yet (404), that's okay - balance is 0
            if (ledgerRes.status === 404) {
              console.log('ℹ️ Ledger not found yet (will be created when invoice is generated), using balance 0');
              outstandingBalance = 0;
            }
          }
        } catch (error) {
          console.error('❌ Error fetching customer ledger:', error);
        }
      } else {
        console.warn('⚠️ No customer ID available for ledger fetch');
      }
      
      console.log('✅ Final stats:', { totalOrders, orderStatuses, outstandingBalance });
      
      setCustomerStats({
        totalOrders,
        orderStatuses,
        outstandingBalance,
        loading: false
      });
    } catch (error) {
      console.error('❌ Error fetching customer statistics:', error);
      setCustomerStats(prev => ({ ...prev, loading: false }));
    }
  };

  // Close product search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.product-search-container')) {
        setProductSearchOpen({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Loading timeout - forcing loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  // Auto-select customer when customer user is logged in
  useEffect(() => {
    if (user?.isCustomer && !formData.customer) {
      console.log('🔍 Auto-selecting customer for:', user.email);
      
      // First, try to use customer_id from user profile if available
      if (user.customerProfile?.customer_id) {
        const customerId = String(user.customerProfile.customer_id);
        console.log('✅ Found customer ID from user profile:', customerId);
        setFormData(prev => ({
          ...prev,
          customer: customerId
        }));
        setCustomerNotFound(false);
        // Fetch statistics after customer is set
        fetchCustomerStatistics(customerId);
        // Fetch assigned managers for customer
        fetchCustomerAssignedManagers(customerId);
        return;
      }
      
      // Otherwise, try to find customer by email match in customers list
      let customerFound = false;
      if (customers.length > 0) {
        const customerRecord = customers.find(customer => 
          customer.email.toLowerCase() === user.email?.toLowerCase()
        );
        
        if (customerRecord) {
          const customerId = customerRecord._id;
          console.log('✅ Found customer in customers list:', customerId);
          setFormData(prev => ({
            ...prev,
            customer: customerId
          }));
          setCustomerNotFound(false);
          customerFound = true;
          // Fetch statistics after customer is set
          fetchCustomerStatistics(customerId);
          // Fetch assigned managers for customer
          fetchCustomerAssignedManagers(customerId);
        } else {
          console.log('⚠️ Customer not found in customers list for:', user.email);
        }
      }
      
      // Always try fetching customer profile from dashboard API (even if found in list, to ensure we have latest data)
      // This ensures new customers are found even if they're not in the initial customers list
      const fetchCustomerProfile = async () => {
        try {
          console.log('🔍 Fetching customer profile from dashboard API...');
          const response = await fetch('/api/customers/dashboard', {
            headers: getAuthHeaders(),
          });
          
          console.log('📊 Dashboard API response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('📊 Dashboard data:', data);
            
            if (data.customer?._id) {
              const customerId = data.customer._id;
              console.log('✅ Found customer from dashboard:', customerId);
              setFormData(prev => ({
                ...prev,
                customer: customerId
              }));
              setCustomerNotFound(false);
              // Also add to customers list if not already there
              setCustomers(prev => {
                if (!prev.find(c => c._id === customerId)) {
                  console.log('➕ Adding customer to customers list:', data.customer);
                  return [...prev, data.customer];
                }
                return prev;
              });
              // Fetch statistics after customer is set
              fetchCustomerStatistics(customerId);
              // Fetch assigned managers for customer
              fetchCustomerAssignedManagers(customerId);
              return;
            } else {
              console.warn('⚠️ Dashboard API returned no customer data');
            }
          } else {
            const errorText = await response.text();
            console.warn('⚠️ Dashboard API failed:', {
              status: response.status,
              body: errorText.substring(0, 200)
            });
          }
        } catch (error) {
          console.error('❌ Error fetching customer profile:', error);
        }
        
        // If we get here and customer wasn't found, mark as not found
        if (!customerFound && !formData.customer) {
          console.warn('⚠️ Customer record not found for email:', user.email);
          setCustomerNotFound(true);
          // Still try to fetch statistics even if customer not found (might work if customer exists but not linked)
          fetchCustomerStatistics();
        }
      };
      
      // Fetch customer profile immediately (don't wait for loading to finish)
      fetchCustomerProfile();
    } else if (user?.isCustomer && formData.customer) {
      // If customer is already set, just fetch statistics
      console.log('✅ Customer already set, fetching statistics...');
      fetchCustomerStatistics(formData.customer);
    } else if (user?.isCustomer) {
      // If user is a customer but no customer record found, still try to fetch statistics
      console.log('⚠️ User is customer but no customer record found, fetching statistics anyway...');
      fetchCustomerStatistics();
    }
  }, [user, customers, formData.customer, loading]);

  // Refetch statistics and managers when customer changes
  useEffect(() => {
    if (formData.customer) {
      if (user?.isCustomer) {
        fetchCustomerStatistics(formData.customer);
      }
      fetchCustomerAssignedManagers(formData.customer);
    } else {
      // Clear managers when no customer selected
      setCustomerAssignedManagers([]);
      setCustomerManagerCategories([]);
      setCustomerManagerDetails([]);
    }
  }, [formData.customer, user?.isCustomer]);

  // Add item to order
  const addItem = () => {
    const filteredProducts = getFilteredProducts();
    if (filteredProducts.length > 0) {
      const newIndex = formData.items.length;
      const firstProduct = filteredProducts[0];
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, { 
          product: firstProduct, 
          quantity: 1, 
          price: firstProduct?.price || 0,
          tdsLink: "",
          selectedCategory: ""
        }]
      }));
      // Initialize search term as empty - user can type to search
      setProductSearchTerms(prev => ({ ...prev, [newIndex]: '' }));
    }
  };

  // Remove item from order
  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    // Clean up search terms and open state for removed item
    setProductSearchTerms(prev => {
      const newTerms = { ...prev };
      delete newTerms[index];
      // Re-index remaining items
      const reindexed: { [key: number]: string } = {};
      Object.keys(newTerms).forEach(key => {
        const oldIndex = parseInt(key);
        if (oldIndex > index) {
          reindexed[oldIndex - 1] = newTerms[oldIndex];
        } else if (oldIndex < index) {
          reindexed[oldIndex] = newTerms[oldIndex];
        }
      });
      return reindexed;
    });
    setProductSearchOpen(prev => {
      const newOpen = { ...prev };
      delete newOpen[index];
      // Re-index remaining items
      const reindexed: { [key: number]: boolean } = {};
      Object.keys(newOpen).forEach(key => {
        const oldIndex = parseInt(key);
        if (oldIndex > index) {
          reindexed[oldIndex - 1] = newOpen[oldIndex];
        } else if (oldIndex < index) {
          reindexed[oldIndex] = newOpen[oldIndex];
        }
      });
      return reindexed;
    });
  };

  // Update item
  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          if (field === 'product') {
            // When product changes, auto-populate TDS link from product if available
            // Only update search term if user explicitly selected (not auto-selected during category change)
            if (!isCategoryChanging[index]) {
              // Only set search term if this is not during a category change
              setProductSearchTerms(prev => ({ ...prev, [index]: value.name }));
            }
            setProductSearchOpen(prev => ({ ...prev, [index]: false }));
            return { 
              ...item, 
              product: value, 
              price: value.price,
              tdsLink: value.tdsLink || item.tdsLink || ""
            };
          } else if (field === 'quantity') {
            return { ...item, quantity: value, price: item.product.price * value };
          } else if (field === 'tdsLink') {
            // When TDS link changes, save it to the product in database in real-time (debounced)
            if (item.product._id) {
              debouncedSaveTdsLink(item.product._id, value);
            }
            return { ...item, [field]: value };
          } else if (field === 'selectedCategory') {
            // Set flag to prevent search term from being set during category change
            setIsCategoryChanging(prev => ({ ...prev, [index]: true }));
            
            // When category changes, check if current product is still in the filtered list
            const filteredProducts = getProductsByCategory(value);
            const currentProductInFilter = filteredProducts.some(p => p._id === item.product._id);
            
            // Always clear search term when category changes - let user search fresh
            setProductSearchTerms(prev => ({ ...prev, [index]: '' }));
            
            // If current product is not in the new category filter, reset to first product or empty
            if (!currentProductInFilter && filteredProducts.length > 0) {
              const firstProduct = filteredProducts[0];
              // Don't pre-fill search term - let user search
              // Clear the flag after a short delay to allow product update
              setTimeout(() => {
                setIsCategoryChanging(prev => {
                  const newState = { ...prev };
                  delete newState[index];
                  return newState;
                });
              }, 100);
              
              return {
                ...item,
                selectedCategory: value,
                product: firstProduct,
                price: firstProduct.price,
                quantity: 1,
                tdsLink: firstProduct.tdsLink || ""
              };
            } else if (!currentProductInFilter && filteredProducts.length === 0) {
              // No products in this category, keep category but reset product
              setIsCategoryChanging(prev => {
                const newState = { ...prev };
                delete newState[index];
                return newState;
              });
              setProductSearchTerms(prev => ({ ...prev, [index]: '' }));
              return { ...item, selectedCategory: value };
            }
            
            // If current product is still valid, just update category and clear search
            setIsCategoryChanging(prev => {
              const newState = { ...prev };
              delete newState[index];
              return newState;
            });
            return { ...item, selectedCategory: value };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  // Save TDS link to product in database (with debouncing for real-time saving)
  const saveTdsLinkToProduct = async (productId: string, tdsLink: string) => {
    if (!productId) return;
    
    setSavingTdsLinks(prev => new Set(prev).add(productId));
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          tdsLink: tdsLink || ""
        }),
      });

      if (response.ok) {
        // Update the product in local state to reflect the change
        setProducts(prev => prev.map(p => 
          p._id === productId ? { ...p, tdsLink: tdsLink || "" } : p
        ));
        console.log('✅ TDS link saved to product in database');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to save TDS link to product:', errorData.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error saving TDS link to product:', error);
    } finally {
      setSavingTdsLinks(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  // Debounced save function for real-time saving
  const debouncedSaveTdsLink = (() => {
    let timeoutId: NodeJS.Timeout | null = null;
    return (productId: string, tdsLink: string) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        saveTdsLinkToProduct(productId, tdsLink);
      }, 1000); // Save 1 second after user stops typing
    };
  })();

  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => sum + item.price, 0);
  // Calculate tax: 10% on each item's total, then sum
  const tax = formData.items.reduce((sum, item) => sum + (item.price * 0.1), 0);
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
          unitPrice: item.product.price,
          total: item.product.price * item.quantity,
          tdsLink: item.tdsLink || ""
        })),
        subtotal: subtotal,
        tax: tax,
        total: total,
        notes: formData.notes,
        company_id: 'RESSICHEM'
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        setMessage("✅ Order created successfully!");
        setTimeout(() => {
          router.push('/orders');
        }, 2000);
      } else {
        setMessage("❌ Failed to create order");
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setMessage("❌ Error creating order");
    } finally {
      setSubmitting(false);
    }
  };

  // Always render something - don't block on loading states
  return (
    <ProtectedRoute>
      {userLoading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-gray-600 dark:text-gray-300">Loading user...</p>
          </div>
        </div>
      )}
      
      {!userLoading && !user && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Authentication Required</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Please log in to access this page.</p>
            <button
              onClick={() => router.push('/auth/sign-in')}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-center font-medium text-white hover:bg-opacity-90"
            >
              Go to Login
            </button>
          </div>
        </div>
      )}
      
      {!userLoading && user && (
        <>
          <Breadcrumb pageName="Create Order" />
          
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading order form...</p>
              </div>
            </div>
          )}
          
          {!loading && (
      
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="px-4 py-6 md:px-6 xl:px-9">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h4 className="text-xl font-semibold text-black dark:text-white">
              Create New Order
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
            {/* Customer Information - Hidden for customers, visible for managers/admins */}
            {!user?.isCustomer && (
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
                    {Array.isArray(customers) && customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        {customer.companyName} - {customer.contactName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Customer Summary - Only shown for logged-in customers */}
            {user?.isCustomer && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-dark dark:text-white">Your Order</h4>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">
                        {user.firstName} {user.lastName}
                      </h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user.email}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                        ✓ Order will be created for your account
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer Order Statistics */}
                {!customerStats.loading && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-medium text-dark dark:text-white">Order Statistics</h4>
                    </div>

                    <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2 p-6">
                      {/* Total Orders */}
                      <div className="mb-6 pb-6 border-b border-stroke dark:border-dark-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Orders</p>
                            <p className="text-3xl font-bold text-dark dark:text-white">{customerStats.totalOrders}</p>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Order Status Breakdown */}
                      <div className="mb-6">
                        <h5 className="text-sm font-semibold text-dark dark:text-white mb-4">Order Status Breakdown</h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {Object.entries(customerStats.orderStatuses).map(([status, count]) => {
                            const statusColors: { [key: string]: { bg: string; text: string; border: string } } = {
                              pending: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' },
                              approved: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
                              rejected: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
                              confirmed: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
                              shipped: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
                              completed: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
                              cancelled: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' }
                            };
                            const colors = statusColors[status] || { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' };
                            const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
                            
                            return (
                              <div key={status} className={`rounded-lg border ${colors.border} ${colors.bg} p-3`}>
                                <p className={`text-xs font-medium ${colors.text} mb-1`}>{statusLabel}</p>
                                <p className={`text-2xl font-bold ${colors.text}`}>{count}</p>
                              </div>
                            );
                          })}
                          {Object.keys(customerStats.orderStatuses).length === 0 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 col-span-full">No orders found</p>
                          )}
                        </div>
                      </div>

                      {/* Outstanding Balance */}
                      <div className="pt-6 border-t border-stroke dark:border-dark-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Outstanding Balance</p>
                            <p className={`text-3xl font-bold ${customerStats.outstandingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              PKR {customerStats.outstandingBalance.toLocaleString()}
                            </p>
                          </div>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${customerStats.outstandingBalance > 0 ? 'bg-red-100 dark:bg-red-900/20' : 'bg-green-100 dark:bg-green-900/20'}`}>
                            {customerStats.outstandingBalance > 0 ? (
                              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            ) : (
                              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Assigned Managers */}
                      {user?.isCustomer && customerManagerDetails.length > 0 && (
                        <div className="pt-6 border-t border-stroke dark:border-dark-3">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <h5 className="text-sm font-semibold text-dark dark:text-white">Your Assigned Manager{customerManagerDetails.length > 1 ? 's' : ''}</h5>
                          </div>
                          <div className="space-y-2">
                            {customerManagerDetails.map((manager, index) => {
                              const managerName = `${manager.firstName || ''} ${manager.lastName || ''}`.trim() || manager.email || 'Unknown Manager';
                              const managerCategories = manager.assignedCategories || [];
                              const categoryNames = Array.isArray(managerCategories)
                                ? managerCategories.map((cat: any) => typeof cat === 'string' ? cat : (cat.category || cat.name || '')).filter(Boolean)
                                : [];
                              
                              return (
                                <div key={index} className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-medium text-purple-900 dark:text-purple-100 text-sm">
                                        {managerName}
                                      </p>
                                      {manager.email && (
                                        <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                                          {manager.email}
                                        </p>
                                      )}
                                      {categoryNames.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {categoryNames.slice(0, 3).map((cat: string, catIndex: number) => (
                                            <span
                                              key={catIndex}
                                              className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-800 px-2 py-0.5 text-xs font-medium text-purple-800 dark:text-purple-200"
                                            >
                                              {cat}
                                            </span>
                                          ))}
                                          {categoryNames.length > 3 && (
                                            <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-800 px-2 py-0.5 text-xs font-medium text-purple-800 dark:text-purple-200">
                                              +{categoryNames.length - 3} more
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {customerManagerCategories.length > 0 && (
                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                              💡 You can order products from {customerManagerCategories.length} categor{customerManagerCategories.length === 1 ? 'y' : 'ies'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Loading state for customer statistics */}
                {customerStats.loading && (
                  <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2 p-6">
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent mb-2"></div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Loading order statistics...</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manager Categories Info */}
            {managerProfile?.assignedCategories && managerProfile.assignedCategories.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-dark dark:text-white">Your Assigned Categories</h4>
                </div>
                
                <div className="rounded-lg border border-stroke bg-blue-50 p-4 dark:border-dark-3 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    You can only create orders for products in your assigned categories:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {managerProfile.assignedCategories.map((category: string, index: number) => (
                      <span
                        key={`category-${index}`}
                        className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                    Available products: {getFilteredProducts().length} out of {products.length} total
                  </p>
                </div>
              </div>
            )}

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
                  disabled={getFilteredProducts().length === 0}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-center font-medium text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              </div>

              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No items added yet. Click "Add Item" to start building your order.
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={`item-${index}-${item.product?._id || 'new'}`} className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                        {/* Category Filter Dropdown */}
                        <div>
                          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                            Category
                          </label>
                          <select
                            value={item.selectedCategory || ''}
                            onChange={(e) => {
                              updateItem(index, 'selectedCategory', e.target.value);
                            }}
                            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white transition-colors"
                          >
                            <option value="">All Categories</option>
                            {getUniqueCategories().map(category => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Product Name Searchable Autocomplete */}
                        <div className="lg:col-span-2 relative product-search-container">
                          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                            Product Name
                          </label>
                          <div className="relative">
                            <div className="relative">
                              <input
                                type="text"
                                value={productSearchTerms[index] !== undefined ? productSearchTerms[index] : (item.product?.name || '')}
                                onChange={(e) => {
                                  setProductSearchTerms(prev => ({ ...prev, [index]: e.target.value }));
                                  setProductSearchOpen(prev => ({ ...prev, [index]: true }));
                                }}
                                onFocus={() => {
                                  // If search term is empty and product is selected, clear it to start fresh search
                                  if (!productSearchTerms[index] && item.product?.name) {
                                    setProductSearchTerms(prev => ({ ...prev, [index]: '' }));
                                  }
                                  setProductSearchOpen(prev => ({ ...prev, [index]: true }));
                                }}
                                onBlur={() => {
                                  // When losing focus, if search is empty, restore product name
                                  if (!productSearchTerms[index] && item.product?.name) {
                                    setProductSearchTerms(prev => ({ ...prev, [index]: item.product.name }));
                                  }
                                }}
                                placeholder="Search products by name, SKU..."
                                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 pl-10 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white transition-colors"
                              />
                              <svg 
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                            
                            {/* Product Dropdown */}
                            {productSearchOpen[index] && (
                              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-2 border border-stroke dark:border-dark-3 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {getFilteredProductsBySearch(index, item.selectedCategory).length > 0 ? (
                                  getFilteredProductsBySearch(index, item.selectedCategory).map(product => (
                                    <div
                                      key={product._id}
                                      onClick={() => {
                                        updateItem(index, 'product', product);
                                        setProductSearchTerms(prev => ({ ...prev, [index]: product.name }));
                                        setProductSearchOpen(prev => ({ ...prev, [index]: false }));
                                      }}
                                      className={`px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-3 border-b border-stroke dark:border-dark-3 last:border-b-0 ${
                                        item.product._id === product._id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                      }`}
                                    >
                                      <div className="font-medium text-dark dark:text-white">{product.name}</div>
                                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {product.sku && (
                                          <span>SKU: {product.sku}</span>
                                        )}
                                        {product.unit && (
                                          <span>Unit: {product.unit}</span>
                                        )}
                                        {product.price !== undefined && (
                                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                                            PKR {product.price.toLocaleString()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                    No products found
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* SKU Display */}
                        <div>
                          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                            SKU
                          </label>
                          <div className="rounded-lg border border-stroke bg-gray-50 px-4 py-3 text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white">
                            {item.product?.sku || 'N/A'}
                          </div>
                        </div>

                        {/* Price Display */}
                        <div>
                          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                            Unit Price
                          </label>
                          <div className="rounded-lg border border-stroke bg-gray-50 px-4 py-3 text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white">
                            PKR {item.product?.price?.toLocaleString() || '0'}
                          </div>
                        </div>
                        
                        {/* Quantity Input */}
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
                        
                        {/* Total Price & Remove Button */}
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                              Total
                            </label>
                            <div className="rounded-lg border border-stroke bg-gray-50 px-4 py-3 text-dark font-semibold dark:border-dark-3 dark:bg-dark-2 dark:text-white">
                              PKR {(item.price * 1.1).toLocaleString()}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                            title="Remove item"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* TDS Link Field */}
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="block text-sm font-medium text-dark dark:text-white">
                            TDS Link (Technical Data Sheet)
                          </label>
                          {savingTdsLinks.has(item.product._id) && (
                            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                              <div className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
                              <span>Saving...</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={item.tdsLink || ""}
                            onChange={(e) => updateItem(index, 'tdsLink', e.target.value)}
                            onBlur={(e) => {
                              // Save immediately when user leaves the field
                              if (item.product._id) {
                                saveTdsLinkToProduct(item.product._id, e.target.value || "");
                              }
                            }}
                            placeholder="https://example.com/tds-document.pdf"
                            className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white transition-colors"
                          />
                          {item.tdsLink && (
                            <a
                              href={item.tdsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 rounded-lg border border-primary bg-primary px-4 py-3 text-white hover:bg-opacity-90 transition-colors"
                              title="Open TDS Link in new tab"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Enter the URL to the Technical Data Sheet. This will be saved to the product in the database automatically when you leave the field.
                        </p>
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
                      <span className="text-dark dark:text-white">Tax (10%):</span>
                      <span className="font-medium text-dark dark:text-white">PKR {tax.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Not Found Warning */}
            {user?.isCustomer && customerNotFound && !formData.customer && (
              <div className="p-4 rounded-lg bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-medium">Customer record not found</p>
                    <p className="text-sm mt-1">
                      Unable to find your customer record with email <strong>{user.email}</strong>. 
                      Please contact support to ensure your account is properly linked to a customer record.
                    </p>
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
                    Creating Order...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Order
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
          )}
        </>
      )}
    </ProtectedRoute>
  );
}
