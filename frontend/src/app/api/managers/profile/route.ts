import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrlServer } from '@/lib/getBackendUrlServer';

const API_BASE_URL = getBackendUrlServer();

export async function GET(request: NextRequest) {
  try {
    // Get authorization header (case-insensitive)
    const authHeader = request.headers.get("authorization") || 
                       request.headers.get("Authorization");

    console.log('🔍 Manager Profile API Route - Auth header present:', !!authHeader);
    console.log('🔍 Manager Profile API Route - Auth header value:', authHeader ? authHeader.substring(0, 30) + '...' : 'null');
    
    if (!authHeader) {
      console.log('❌ No authorization header in request');
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }
    
    // Extract token from "Bearer <token>" format
    const token = authHeader.startsWith("Bearer ") 
      ? authHeader.substring(7) 
      : authHeader.startsWith("bearer ")
      ? authHeader.substring(7)
      : authHeader;

    console.log('🔍 Manager Profile API Route - Token extracted, length:', token?.length || 0);
    console.log('🔍 Manager Profile API Route - Token preview:', token ? token.substring(0, 20) + '...' : 'null');
    console.log('🔍 Manager Profile API Route - Backend URL:', API_BASE_URL);

    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      console.log('❌ No valid token provided in request');
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const backendUrl = `${API_BASE_URL}/api/managers/profile`;
    console.log('🔍 Fetching from backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch manager profile' }));
      console.error('❌ Backend error:', errorData);
      return NextResponse.json({ error: errorData.message || 'Failed to fetch manager profile' }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Manager profile data received, assignedCustomers count:', data.manager?.assignedCustomers?.length || 0);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error fetching manager profile:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

