// API route disabled for static export
export const dynamic = 'force-static';
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Customer Products API - Token:', !!token);

    const response = await fetch(`${API_BASE_URL}/api/customers/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error('❌ Backend API Error:', response.status, response.statusText);
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json({ 
        error: 'Backend API Error', 
        message: errorData.message || errorData.error || 'Unknown error',
        status: response.status 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('📦 Customer Products Response:', { status: response.status, productsCount: data.products?.length || 0 });
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Customer Products API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}