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

    // Get query parameters from request
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    const status = searchParams.get('status') || '';
    
    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.set('page', page);
    queryParams.set('limit', limit);
    if (status) {
      queryParams.set('status', status);
    }
    
    const queryString = queryParams.toString();
    const url = queryString 
      ? `${API_BASE_URL}/api/customers/orders?${queryString}`
      : `${API_BASE_URL}/api/customers/orders`;

    console.log('🔍 Customer Orders API - Token:', !!token);
    console.log('🔍 Customer Orders API - Backend URL:', API_BASE_URL);
    console.log('🔍 Customer Orders API - Query:', queryString);
    console.log('🔍 Customer Orders API - Full URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('📦 Customer Orders API Response:', { 
      status: response.status, 
      ok: response.ok,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Customer Orders API Error Status:', response.status);
      console.error('❌ Customer Orders API Error Text:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText || 'Unknown error' };
      }
      
      console.error('❌ Customer Orders API Error Data:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Customer Orders API Data:', { 
      ordersCount: data.orders?.length || 0,
      totalOrders: data.pagination?.totalOrders || 0,
      isArray: Array.isArray(data)
    });
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Customer Orders API error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
