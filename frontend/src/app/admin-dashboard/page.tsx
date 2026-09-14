"use client";

import { useUser } from "@/components/Auth/user-context";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ProductImageManager from "@/components/ProductImageManager";

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

// Client-side only component for stats to prevent hydration issues
function StatsCards({ stats }: { stats: { totalUsers: number; totalCompanies: number; totalOrders: number; totalProducts: number } }) {
  return (
    <div className="mb-3 sm:mb-4 lg:mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-md sm:shadow-lg border border-white/20 dark:border-gray-700/20 p-2 sm:p-3 lg:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">Users</p>
              <p className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100">
                {stats.totalUsers}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-md sm:shadow-lg border border-white/20 dark:border-gray-700/20 p-2 sm:p-3 lg:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">Companies</p>
              <p className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100">
                {stats.totalCompanies}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-md sm:shadow-lg border border-white/20 dark:border-gray-700/20 p-2 sm:p-3 lg:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">Orders</p>
              <p className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100">
                {stats.totalOrders}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-md sm:shadow-lg border border-white/20 dark:border-gray-700/20 p-2 sm:p-3 lg:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">Products</p>
              <p className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100">
                {stats.totalProducts}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main admin dashboard content component
function AdminDashboardContent() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanies: 0,
    totalOrders: 0,
    totalProducts: 0
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
        // Check if we're on the client side
        if (typeof window === 'undefined') return;
        
        const token = localStorage.getItem("token");
        if (!token) return;

        // Fetch stats from different endpoints
        const [usersRes, companiesRes, ordersRes, productsRes] = await Promise.all([
          fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/companies', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const [users, companies, orders, products] = await Promise.all([
          usersRes.ok ? usersRes.json() : { users: [] },
          companiesRes.ok ? companiesRes.json() : { companies: [] },
          ordersRes.ok ? ordersRes.json() : { orders: [] },
          productsRes.ok ? productsRes.json() : { products: [] }
        ]);

        setStats({
          totalUsers: Array.isArray(users) ? users.length : users.users?.length || 0,
          totalCompanies: Array.isArray(companies) ? companies.length : companies.companies?.length || 0,
          totalOrders: Array.isArray(orders) ? orders.length : orders.orders?.length || 0,
          totalProducts: Array.isArray(products) ? products.length : products.products?.length || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden">
      <Breadcrumb pageName="Admin Dashboard" />

      {/* Image Carousel Banner - Full Width */}
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

      {/* Welcome Section */}
      <div className="mb-3 sm:mb-4 lg:mb-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full bg-blue-900 flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-blue-900 dark:text-white truncate">
                Super Admin Dashboard
              </h1>
              <p className="text-blue-700 dark:text-blue-300 text-xs sm:text-sm lg:text-base mt-1 line-clamp-2">
                Welcome back, {user?.email || 'Admin'}. Manage your entire system from here.
              </p>
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full bg-blue-900 px-2 py-1 text-xs font-medium text-white shadow-lg">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipRule="evenodd" />
                  </svg>
                  Super Administrator
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Product Image Manager */}
      <div className="mb-3 sm:mb-4 lg:mb-6">
        <ProductImageManager />
      </div>

      {/* Quick Actions */}
      <div className="mb-3 sm:mb-4 lg:mb-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg sm:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-blue-900 dark:text-white mb-3 sm:mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/users')}
              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition-all duration-300 text-sm font-medium"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <span className="truncate">Manage Users</span>
            </button>

            <button
              onClick={() => router.push('/admin-dashboard/companies')}
              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition-all duration-300 text-sm font-medium"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="truncate">Manage Companies</span>
            </button>

            <button
              onClick={() => router.push('/orders')}
              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition-all duration-300 text-sm font-medium"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span className="truncate">View Orders</span>
            </button>

            <button
              onClick={() => router.push('/products')}
              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition-all duration-300 text-sm font-medium"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="truncate">Manage Products</span>
            </button>

            <button
              onClick={() => router.push('/roles')}
              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition-all duration-300 text-sm font-medium"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="truncate">Manage Roles</span>
            </button>

            <button
              onClick={() => router.push('/permissions')}
              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition-all duration-300 text-sm font-medium"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="truncate">Manage Permissions</span>
            </button>

            <button
              onClick={() => router.push('/admin-dashboard/create-company-admin')}
              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition-all duration-300 text-sm font-medium"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="truncate">Create Company Admin</span>
            </button>

            <button
              onClick={() => router.push('/roles')}
              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition-all duration-300 text-sm font-medium"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="truncate">Manage Roles</span>
            </button>

            <button
              onClick={() => router.push('/permissions')}
              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition-all duration-300 text-sm font-medium"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="truncate">Manage Permissions</span>
            </button>

            <button
              onClick={() => router.push('/permission-groups')}
              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition-all duration-300 text-sm font-medium"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="truncate">Permission Groups</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export with dynamic import to disable SSR
export default dynamic(() => Promise.resolve(AdminDashboardContent), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  ),
});
