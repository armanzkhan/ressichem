// API route disabled for static export
export const dynamic = 'force-static';
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  console.log('🚀 NEXT.JS API ROUTE CALLED - /api/managers/orders');
  
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace("Bearer ", "");

    console.log('🔍 Next.js API Route - Manager Orders');
    console.log('   Auth Header:', authHeader ? 'Present' : 'Missing');
    console.log('   Token:', token ? 'Present' : 'Missing');
    console.log('   Backend URL:', `${API_BASE_URL}/api/managers/orders`);

    const response = await fetch(`${API_BASE_URL}/api/managers/orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('📡 Backend Response Status:', response.status);
    console.log('📡 Backend Response Headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('📊 Backend Response Data:', {
      ordersCount: data.orders?.length || 0,
      totalOrders: data.totalOrders,
      assignedCategories: data.assignedCategories
    });

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching manager orders:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
