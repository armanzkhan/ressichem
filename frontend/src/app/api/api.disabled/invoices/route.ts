// API route disabled for static export
export const dynamic = 'force-static';
export const revalidate = false;

import { getAuthHeaders } from '@/lib/auth';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Extract Authorization header from the incoming request
    const authHeader = req.headers.get('authorization');
    
    console.log('🔍 Next.js API: GET /api/invoices');
    console.log('🔍 Query params:', searchParams.toString());
    console.log('🔍 Auth header present:', !!authHeader);
    console.log('🔍 Backend URL:', BACKEND_URL);
    
    // Forward query parameters to backend
    const queryString = searchParams.toString();
    const url = queryString 
      ? `${BACKEND_URL}/api/invoices?${queryString}`
      : `${BACKEND_URL}/api/invoices`;

    console.log('🔍 Calling backend URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    console.log('🔍 Backend response status:', response.status);
    console.log('🔍 Backend response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('🔍 Backend error:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('🔍 Backend data received:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/invoices:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    console.log('🔍 Next.js API: POST /api/invoices');
    console.log('🔍 Request body:', body);
    
    // Extract Authorization header from the incoming request
    const authHeader = req.headers.get('authorization');
    console.log('🔍 Auth header present:', !!authHeader);

    // Determine which endpoint to call based on the request
    const endpoint = body.orderId ? 'create-from-order' : '';
    const url = endpoint 
      ? `${BACKEND_URL}/api/invoices/${endpoint}`
      : `${BACKEND_URL}/api/invoices`;

    console.log('🔍 Endpoint:', endpoint);
    console.log('🔍 Backend URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify(body),
    });

    console.log('🔍 Backend response status:', response.status);
    console.log('🔍 Backend response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('🔍 Backend error:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('🔍 Backend data received:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/invoices POST:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ message: 'Invoice ID is required' }, { status: 400 });
    }
    
    // Extract Authorization header from the incoming request
    const authHeader = req.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/api/invoices/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/invoices PUT:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ message: 'Invoice ID is required' }, { status: 400 });
    }
    
    // Extract Authorization header from the incoming request
    const authHeader = req.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/api/invoices/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/invoices DELETE:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
