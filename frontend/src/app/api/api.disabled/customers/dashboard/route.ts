// API route disabled for static export
export const dynamic = 'force-static';
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Customer Dashboard API - Token:', !!token);
    console.log('🔍 Customer Dashboard API - Backend URL:', API_BASE_URL);

    const response = await fetch(`${API_BASE_URL}/api/customers/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('📊 Customer Dashboard API Response:', { status: response.status, ok: response.ok });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('❌ Customer Dashboard API Error:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Customer Dashboard API Data:', { 
      customer: data.customer ? 'Found' : 'Not found',
      stats: data.stats,
      recentOrders: data.recentOrders?.length || 0
    });
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Customer Dashboard API error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}