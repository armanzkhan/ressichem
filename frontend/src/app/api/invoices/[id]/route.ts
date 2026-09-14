import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('🔍 Next.js API: GET /api/invoices/[id]');
    console.log('🔍 Invoice ID:', id);
    
    // Extract Authorization header from the incoming request
    const authHeader = req.headers.get('authorization');
    console.log('🔍 Auth header present:', !!authHeader);

    const response = await fetch(`${BACKEND_URL}/api/invoices/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    console.log('🔍 Backend response status:', response.status);
    console.log('🔍 Backend response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch invoice' }));
      console.error('❌ Backend error:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Invoice data received');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/invoices/[id]:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    console.log('🔍 Next.js API: PUT /api/invoices/[id]');
    console.log('🔍 Invoice ID:', id);
    console.log('🔍 Request body:', body);
    
    // Extract Authorization header from the incoming request
    const authHeader = req.headers.get('authorization');
    console.log('🔍 Auth header present:', !!authHeader);

    const response = await fetch(`${BACKEND_URL}/api/invoices/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify(body),
    });

    console.log('🔍 Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update invoice' }));
      console.error('❌ Backend error:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Invoice updated successfully');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/invoices/[id] PUT:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('🔍 Next.js API: DELETE /api/invoices/[id]');
    console.log('🔍 Invoice ID:', id);
    
    // Extract Authorization header from the incoming request
    const authHeader = req.headers.get('authorization');
    console.log('🔍 Auth header present:', !!authHeader);

    const response = await fetch(`${BACKEND_URL}/api/invoices/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    console.log('🔍 Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to delete invoice' }));
      console.error('❌ Backend error:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json().catch(() => ({ message: 'Invoice deleted successfully' }));
    console.log('✅ Invoice deleted successfully');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/invoices/[id] DELETE:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

