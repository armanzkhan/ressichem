import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const body = await req.json();
    
    console.log('🔍 Next.js API: POST /api/customer-ledger/[customerId]/payments');
    console.log('🔍 Customer ID:', customerId);
    console.log('🔍 Payment data:', body);
    
    // Extract Authorization header from the incoming request
    const authHeader = req.headers.get('authorization');
    console.log('🔍 Auth header present:', !!authHeader);

    const response = await fetch(`${BACKEND_URL}/api/customer-ledger/customers/${customerId}/payments`, {
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
      const errorData = await response.json().catch(() => ({ message: 'Failed to record payment' }));
      console.error('❌ Backend error:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Payment recorded successfully');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/customer-ledger/[customerId]/payments:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const { searchParams } = new URL(req.url);
    
    console.log('🔍 Next.js API: GET /api/customer-ledger/[customerId]/payments');
    console.log('🔍 Customer ID:', customerId);
    console.log('🔍 Query params:', searchParams.toString());
    
    // Extract Authorization header from the incoming request
    const authHeader = req.headers.get('authorization');
    console.log('🔍 Auth header present:', !!authHeader);

    const queryString = searchParams.toString();
    const url = queryString 
      ? `${BACKEND_URL}/api/customer-ledger/customers/${customerId}/payments?${queryString}`
      : `${BACKEND_URL}/api/customer-ledger/customers/${customerId}/payments`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    console.log('🔍 Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch payments' }));
      console.error('❌ Backend error:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Payments fetched successfully');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/customer-ledger/[customerId]/payments GET:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

