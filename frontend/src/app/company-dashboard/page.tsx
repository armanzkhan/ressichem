"use client";

import { useUser } from "@/components/Auth/user-context";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Carousel images - using local images from public/images/carasoul folder
const carouselImages = [
  {
    src: "/images/carasoul/Construction-Building-Materials.webp",
    alt: "Construction Building Materials"
  },
  {
    src: "/images/carasoul/Dry-Mix-Mortar-2.webp",
    alt: "Dry Mix Mortar"
  },
  {
    src: "/images/carasoul/Epoxy-Adhesive.webp",
    alt: "Epoxy Adhesive"
  },
  {
    src: "/images/carasoul/Epoxy-Flooring-2.webp",
    alt: "Epoxy Flooring"
  },
  {
    src: "/images/carasoul/Facing-Construction-Problems.webp",
    alt: "Facing Construction Problems"
  },
  {
    src: "/images/carasoul/TIle-Bond-2.webp",
    alt: "Tile Bond"
  }
];

export default function CompanyDashboard() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCustomers: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalManagers: 0,
    totalInvoices: 0,
    totalInvoiceAmount: 0
  });
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  
  // Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCarouselIndex((prev) => (prev + 1) % carouselImages.length);
    }, 5000); // Change image every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/sign-in");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.log('No token found, skipping stats fetch');
          return;
        }

        console.log('Fetching stats for company dashboard...');
        
        // Fetch stats from different endpoints
        const [usersRes, customersRes, ordersRes, productsRes, managersRes, invoicesRes] = await Promise.all([
          fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/customers', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/managers', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/invoices/stats', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        console.log('API responses:', {
          users: usersRes.status,
          customers: customersRes.status,
          orders: ordersRes.status,
          products: productsRes.status,
          managers: managersRes.status,
          invoices: invoicesRes.status
        });

        const [users, customers, orders, products, managers, invoices] = await Promise.all([
          usersRes.ok ? usersRes.json() : { users: [] },
          customersRes.ok ? customersRes.json() : { customers: [] },
          ordersRes.ok ? ordersRes.json() : { orders: [] },
          productsRes.ok ? productsRes.json() : { products: [] },
          managersRes.ok ? managersRes.json() : { managers: [] },
          invoicesRes.ok ? invoicesRes.json() : { data: { totalInvoices: 0, totalAmount: 0 } }
        ]);

        console.log('Parsed data:', { users, customers, orders, products, managers, invoices });

        setStats({
          totalUsers: Array.isArray(users) ? users.length : users.users?.length || 0,
          totalCustomers: Array.isArray(customers) ? customers.length : customers.customers?.length || 0,
          totalOrders: Array.isArray(orders) ? orders.length : orders.orders?.length || 0,
          totalProducts: Array.isArray(products) ? products.length : products.products?.length || 0,
          totalManagers: Array.isArray(managers) ? managers.length : managers.managers?.length || 0,
          totalInvoices: invoices.data?.totalInvoices || 0,
          totalInvoiceAmount: invoices.data?.totalAmount || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    if (user && !loading) {
      fetchStats();
    }
  }, [user, loading]);

  console.log('Company Dashboard - User state:', { user, loading });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No User Found</h1>
          <p className="text-gray-600 dark:text-gray-400">Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen">
      {/* Image Carousel Banner - Full Width (breaks out of container) */}
      <div className="w-screen relative -left-[calc((100vw-100%)/2)] mb-4 sm:mb-6 lg:mb-8">
        <div className="relative w-full h-64 sm:h-80 md:h-[500px] lg:h-[600px] xl:h-[700px] 2xl:h-[800px] overflow-hidden shadow-2xl">
          {/* Carousel Container */}
          <div className="relative w-full h-full">
            {carouselImages.map((image, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentCarouselIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-contain bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900"
                  style={{ objectFit: 'contain', objectPosition: 'center' }}
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    e.currentTarget.src = `https://via.placeholder.com/1200x600/1e3a8a/ffffff?text=${encodeURIComponent(image.alt)}`;
                  }}
                />
                {/* Subtle overlay for better text visibility */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/40 pointer-events-none"></div>
                
                {/* Title Display - Top Center */}
                <div className="absolute top-6 sm:top-8 lg:top-12 left-1/2 transform -translate-x-1/2 z-20 text-center px-4 sm:px-6 max-w-5xl pointer-events-none">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] mb-2">
                    {image.alt}
                  </h2>
                </div>
                
                {/* Contact Us Button - Positioned at bottom left */}
                <a
                  href="#contact-form"
                  className="absolute left-4 sm:left-8 lg:left-12 bottom-8 sm:bottom-12 lg:bottom-16 z-20 inline-flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 text-sm sm:text-base lg:text-lg backdrop-blur-sm bg-opacity-95"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Contact Us
                </a>
              </div>
            ))}
            
            {/* Carousel Indicators */}
            <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
              {carouselImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentCarouselIndex(index)}
                  className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${
                    index === currentCarouselIndex
                      ? 'w-8 sm:w-10 bg-blue-900 shadow-lg'
                      : 'w-2 sm:w-2.5 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            
            {/* Navigation Arrows */}
            <button
              onClick={() => setCurrentCarouselIndex((prev) => (prev - 1 + carouselImages.length) % carouselImages.length)}
              className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900/80 hover:bg-blue-900 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300"
              aria-label="Previous image"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={() => setCurrentCarouselIndex((prev) => (prev + 1) % carouselImages.length)}
              className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-900/80 hover:bg-blue-900 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300"
              aria-label="Next image"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <Breadcrumb pageName="Company Dashboard" />

      {/* Welcome Section - Enhanced for Mobile */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50 to-indigo-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-blue-900/20 dark:border-blue-900/30 p-4 sm:p-6 lg:p-8">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="w-full h-full" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat'
            }}></div>
          </div>
          
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Enhanced Avatar */}
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl bg-blue-900 flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              {/* Status Indicator */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-blue-900 dark:text-white mb-2">
                Company Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base lg:text-lg mb-3 leading-relaxed">
                Welcome back, <span className="font-semibold text-blue-600 dark:text-blue-400">{user?.email}</span>
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-4">
                Manage your company operations and monitor performance from this central hub
              </p>
              
              {/* Enhanced Status Badge */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2">
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                  <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipRule="evenodd" />
                  </svg>
                  Company Administrator
                </span>
                <span className="inline-flex items-center rounded-full bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                  <div className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse"></div>
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Enhanced for Mobile */}
      <div className="mb-6 sm:mb-8 lg:mb-10">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-white mb-4 sm:mb-6 text-center sm:text-left">
          📊 Company Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Users Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-blue-900/20 dark:border-blue-900/30 p-4 hover:border-blue-900/40 dark:hover:border-blue-900/50">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-transparent"></div>
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-900 rounded-2xl flex items-center justify-center shadow-lg mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">Users</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {stats.totalUsers}
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">Active</p>
              </div>
            </div>
          </div>

          {/* Customers Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-blue-900/20 dark:border-blue-900/30 p-4 hover:border-blue-900/40 dark:hover:border-blue-900/50">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-transparent"></div>
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-900 rounded-2xl flex items-center justify-center shadow-lg mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">Customers</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {stats.totalCustomers}
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">Registered</p>
              </div>
            </div>
          </div>

          {/* Managers Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-blue-900/20 dark:border-blue-900/30 p-4 hover:border-blue-900/40 dark:hover:border-blue-900/50">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-transparent"></div>
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-900 rounded-2xl flex items-center justify-center shadow-lg mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">Managers</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {stats.totalManagers}
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">Team</p>
              </div>
            </div>
          </div>

          {/* Orders Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-blue-900/20 dark:border-blue-900/30 p-4 hover:border-blue-900/40 dark:hover:border-blue-900/50">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-transparent"></div>
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-900 rounded-2xl flex items-center justify-center shadow-lg mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">Orders</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {stats.totalOrders}
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">Total</p>
              </div>
            </div>
          </div>

          {/* Products Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-blue-900/20 dark:border-blue-900/30 p-4 hover:border-blue-900/40 dark:hover:border-blue-900/50">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-transparent"></div>
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-900 rounded-2xl flex items-center justify-center shadow-lg mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">Products</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {stats.totalProducts}
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">Available</p>
              </div>
            </div>
          </div>

          {/* Invoices Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-blue-900/20 dark:border-blue-900/30 p-4 hover:border-blue-900/40 dark:hover:border-blue-900/50">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-transparent"></div>
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-900 rounded-2xl flex items-center justify-center shadow-lg mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">Invoices</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {stats.totalInvoices}
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">PKR {stats.totalInvoiceAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Enhanced for Mobile */}
      <div className="mb-6 sm:mb-8 lg:mb-10">
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-blue-900/20 dark:border-blue-900/30 p-4 sm:p-6 lg:p-8">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="w-full h-full" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f3f4f6' fill-opacity='0.1'%3E%3Cpath d='M20 20c0-11.046-8.954-20-20-20v20h20z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat'
            }}></div>
          </div>
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-white">
                  Quick Actions
                </h2>
                <p className="text-blue-700 dark:text-blue-300 text-sm sm:text-base">
                  Access your most important management tools
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mt-6">
              {/* Manage Users */}
              <button
                onClick={() => router.push('/users')}
                className="group relative overflow-hidden bg-white dark:bg-gray-dark hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 border-blue-900/20 dark:border-blue-900/30 hover:border-blue-900 dark:hover:border-blue-700 rounded-2xl p-5 sm:p-6 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-blue-900 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <svg className="w-5 h-5 text-blue-900 dark:text-blue-400 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg sm:text-xl mb-1 text-blue-900 dark:text-white">Manage Users</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">User accounts & permissions</p>
                </div>
              </button>

              {/* Manage Managers */}
              <button
                onClick={() => router.push('/managers')}
                className="group relative overflow-hidden bg-white dark:bg-gray-dark hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 border-blue-900/20 dark:border-blue-900/30 hover:border-blue-900 dark:hover:border-blue-700 rounded-2xl p-5 sm:p-6 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-blue-900 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <svg className="w-5 h-5 text-blue-900 dark:text-blue-400 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg sm:text-xl mb-1 text-blue-900 dark:text-white">Manage Managers</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Team management</p>
                </div>
              </button>

              {/* View Orders */}
              <button
                onClick={() => router.push('/orders')}
                className="group relative overflow-hidden bg-white dark:bg-gray-dark hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 border-blue-900/20 dark:border-blue-900/30 hover:border-blue-900 dark:hover:border-blue-700 rounded-2xl p-5 sm:p-6 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-blue-900 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <svg className="w-5 h-5 text-blue-900 dark:text-blue-400 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg sm:text-xl mb-1 text-blue-900 dark:text-white">View Orders</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Order management</p>
                </div>
              </button>

              {/* Manage Invoices */}
              <button
                onClick={() => router.push('/invoices')}
                className="group relative overflow-hidden bg-white dark:bg-gray-dark hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 border-blue-900/20 dark:border-blue-900/30 hover:border-blue-900 dark:hover:border-blue-700 rounded-2xl p-5 sm:p-6 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-blue-900 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <svg className="w-5 h-5 text-blue-900 dark:text-blue-400 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg sm:text-xl mb-1 text-blue-900 dark:text-white">Manage Invoices</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Invoice management</p>
                </div>
              </button>

              {/* Customer Ledger */}
              <button
                onClick={() => router.push('/customer-ledger')}
                className="group relative overflow-hidden bg-white dark:bg-gray-dark hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 border-blue-900/20 dark:border-blue-900/30 hover:border-blue-900 dark:hover:border-blue-700 rounded-2xl p-5 sm:p-6 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-blue-900 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <svg className="w-5 h-5 text-blue-900 dark:text-blue-400 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg sm:text-xl mb-1 text-blue-900 dark:text-white">Customer Ledger</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Financial tracking</p>
                </div>
              </button>

              {/* Manage Products */}
              <button
                onClick={() => router.push('/products')}
                className="group relative overflow-hidden bg-white dark:bg-gray-dark hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 border-blue-900/20 dark:border-blue-900/30 hover:border-blue-900 dark:hover:border-blue-700 rounded-2xl p-5 sm:p-6 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-blue-900 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <svg className="w-5 h-5 text-blue-900 dark:text-blue-400 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg sm:text-xl mb-1 text-blue-900 dark:text-white">Manage Products</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Product catalog</p>
                </div>
              </button>

              {/* Manage Categories */}
              <button
                onClick={() => router.push('/categories')}
                className="group relative overflow-hidden bg-white dark:bg-gray-dark hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 border-blue-900/20 dark:border-blue-900/30 hover:border-blue-900 dark:hover:border-blue-700 rounded-2xl p-5 sm:p-6 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-blue-900 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <svg className="w-5 h-5 text-blue-900 dark:text-blue-400 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg sm:text-xl mb-1 text-blue-900 dark:text-white">Manage Categories</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Product categories</p>
                </div>
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
