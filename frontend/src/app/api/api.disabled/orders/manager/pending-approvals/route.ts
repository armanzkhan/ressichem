// API route disabled for static export
export const dynamic = 'force-static';
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Next.js API: Getting manager pending approvals...');
    console.log('🔍 Request URL:', request.url);
    console.log('🔍 Request method:', request.method);
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    console.log('🔍 Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      console.log('❌ No authorization header found');
      return NextResponse.json({ message: 'Authorization header required' }, { status: 401 });
    }

    // Forward the request to the backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const backendEndpoint = `${backendUrl}/api/orders/manager/pending-approvals`;
    console.log('🔍 Calling backend:', backendEndpoint);
    
    const backendResponse = await fetch(backendEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Backend response status:', backendResponse.status);
    console.log('📡 Backend response headers:', Object.fromEntries(backendResponse.headers.entries()));

    if (backendResponse.ok) {
      const data = await backendResponse.json();
      console.log('✅ Backend data received:', data);
      console.log('✅ Approvals count:', data.approvals?.length || 0);
      return NextResponse.json(data);
    } else {
      const errorText = await backendResponse.text();
      console.error('❌ Backend error response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        console.error('❌ Failed to parse backend error:', parseError);
        return NextResponse.json(
          { message: 'Backend error', status: backendResponse.status, error: errorText },
          { status: backendResponse.status }
        );
      }
      
      return NextResponse.json(errorData, { status: backendResponse.status });
    }
  } catch (error) {
    console.error('❌ Next.js API error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
