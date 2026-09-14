// This API route is disabled for static export
// Frontend will call backend directly using NEXT_PUBLIC_BACKEND_URL
export const dynamic = 'force-static';
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'No authorization header' },
        { status: 401 }
      );
    }
    
    console.log('🔍 Frontend API - Current user request');
    
    const response = await fetch(`${BACKEND_URL}/api/auth/current-user`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    console.log('🔍 Frontend API - Backend response:', { status: response.status, success: data.success });
    
    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(data, { status: response.status });
    }
  } catch (error) {
    console.error('❌ Frontend API - Current user error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get current user' },
      { status: 500 }
    );
  }
}
