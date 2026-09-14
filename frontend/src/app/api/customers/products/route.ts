import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrlServer } from '@/lib/getBackendUrlServer';

const API_BASE_URL = getBackendUrlServer();

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const page = searchParams.get('page');
    
    // Build query string
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit);
    if (page) queryParams.append('page', page);
    
    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/api/customers/products${queryString ? `?${queryString}` : ''}`;

    console.log('🔍 Customer Products API - Token:', !!token);

    const response = await fetch(url, {
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

