import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrlServer } from '@/lib/getBackendUrlServer';

const API_BASE_URL = getBackendUrlServer();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get authorization header (case-insensitive)
    const authHeader = request.headers.get("authorization") || 
                       request.headers.get("Authorization");
    
    console.log('🔍 Manager Order Status API Route - Order ID:', id);
    console.log('🔍 Manager Order Status API Route - Auth header present:', !!authHeader);
    
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

    console.log('🔍 Manager Order Status API Route - Token extracted, length:', token?.length || 0);
    console.log('🔍 Manager Order Status API Route - Backend URL:', API_BASE_URL);

    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      console.log('❌ No valid token provided in request');
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    console.log('🔍 Manager Order Status API Route - Request body:', body);

    const backendUrl = `${API_BASE_URL}/api/managers/orders/${id}/status`;
    console.log('🔍 Updating order status at backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      // Try to parse error response
      let errorData;
      try {
        const errorText = await response.text();
        console.error('❌ Backend error response text:', errorText);
        // Try to parse as JSON
        errorData = JSON.parse(errorText);
      } catch (e) {
        // If not JSON, create error object
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error('❌ Backend error:', errorData);
      return NextResponse.json({ error: errorData.message || 'Failed to update order status' }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Order status updated successfully');
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

