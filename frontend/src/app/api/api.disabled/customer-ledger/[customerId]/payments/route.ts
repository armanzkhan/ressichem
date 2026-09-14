export const dynamic = "force-static";
export const revalidate = false;

import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const body = await req.json();
    
    // Extract Authorization header from the incoming request
    const authHeader = req.headers.get('authorization');
    
    console.log('🔍 Next.js API: POST /api/customer-ledger/[customerId]/payments');
    console.log('🔍 Customer ID:', customerId);
    console.log('🔍 Request body:', body);
    console.log('🔍 Auth header present:', !!authHeader);

    const url = `${BACKEND_URL}/api/customer-ledger/customers/${customerId}/payments`;

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
    console.error('Error in /api/customer-ledger/[customerId]/payments:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
