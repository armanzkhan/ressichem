// API route disabled for static export
export const dynamic = 'force-static';
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Frontend API: GET /api/users/me called');
    
    // Get the authorization token from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('❌ Frontend API: No authorization header');
      return NextResponse.json({ message: 'No authorization header' }, { status: 401 });
    }
    console.log('🔑 Frontend API: Authorization header present');

    // Get the API URL from environment
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // Call the backend API
    console.log('📡 Frontend API: Calling backend:', `${apiUrl}/api/users/me`);
    const response = await fetch(`${apiUrl}/api/users/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    console.log('📡 Frontend API: Backend response status:', response.status);
    const data = await response.json();
    console.log('📡 Frontend API: Backend response data:', data);

    if (!response.ok) {
      console.log('❌ Frontend API: Backend error, returning error response');
      return NextResponse.json(data, { status: response.status });
    }

    console.log('✅ Frontend API: Success, returning data to frontend');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🔍 Frontend API: PUT /api/users/me called');
    const body = await request.json();
    const { firstName, lastName, phone, email, bio } = body;
    console.log('📝 Frontend API: Request body:', { firstName, lastName, phone, email, bio });

    // Get the authorization token from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('❌ Frontend API: No authorization header');
      return NextResponse.json({ message: 'No authorization header' }, { status: 401 });
    }
    console.log('🔑 Frontend API: Authorization header present');

    // Get the API URL from environment
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // Call the backend API
    console.log('📡 Frontend API: Calling backend:', `${apiUrl}/api/users/me`);
    const response = await fetch(`${apiUrl}/api/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ firstName, lastName, phone, email, bio }),
    });

    console.log('📡 Frontend API: Backend response status:', response.status);
    const data = await response.json();
    console.log('📡 Frontend API: Backend response data:', data);

    if (!response.ok) {
      console.log('❌ Frontend API: Backend error, returning error response');
      return NextResponse.json(data, { status: response.status });
    }

    console.log('✅ Frontend API: Success, returning data to frontend');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}