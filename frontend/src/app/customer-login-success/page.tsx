'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerLoginSuccess() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in as customer
    const token = localStorage.getItem("token");
    const userType = localStorage.getItem("userType");
    
    console.log('🔍 Customer Login Success - Auth Check:', { token: !!token, userType });
    
    if (!token || userType !== 'customer') {
      console.log('❌ Not a customer, redirecting to login');
      router.push("/customer-login");
      return;
    }
    
    // Force redirect to customer portal
    console.log('✅ Customer authenticated, redirecting to customer portal');
    window.location.href = '/customer-portal';
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Redirecting to Customer Portal...</h2>
        <p className="text-gray-600">Please wait while we set up your dashboard.</p>
      </div>
    </div>
  );
}
