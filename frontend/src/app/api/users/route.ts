import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrlServer } from '@/lib/getBackendUrlServer';

const API_BASE_URL = getBackendUrlServer();

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("company_id");
    const role = searchParams.get("role");
    const department = searchParams.get("department");
    const isActive = searchParams.get("isActive");

    // Build query string
    const queryParams = new URLSearchParams();
    if (companyId) queryParams.append("company_id", companyId);
    if (role) queryParams.append("role", role);
    if (department) queryParams.append("department", department);
    if (isActive !== null) queryParams.append("isActive", isActive);

    const queryString = queryParams.toString();
    // Use /api/users/all for getting all users (no auth required) or /api/users for filtered (auth required)
    const endpoint = token ? `${API_BASE_URL}/api/users` : `${API_BASE_URL}/api/users/all`;
    const url = `${endpoint}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch users' }));
      return NextResponse.json({ error: errorData.message || 'Failed to fetch users' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const body = await request.json();

    console.log('🔍 Creating user - Backend URL:', API_BASE_URL);
    console.log('🔍 Request body:', { ...body, password: body.password ? '***' : undefined });

    // Use /api/users/create endpoint which only requires auth (not create_user permission)
    const response = await fetch(`${API_BASE_URL}/api/users/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = { message: responseText || 'Failed to create user' };
    }

    if (!response.ok) {
      console.error('❌ Backend error:', response.status, errorData);
      return NextResponse.json({ 
        error: errorData.message || errorData.error || 'Failed to create user',
        details: errorData 
      }, { status: response.status });
    }

    const data = JSON.parse(responseText);
    console.log('✅ User created successfully');
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ Error creating user:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error.message || 'Failed to connect to backend server'
    }, { status: 500 });
  }
}

