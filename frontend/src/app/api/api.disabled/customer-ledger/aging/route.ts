// API route disabled for static export
export const dynamic = 'force-static';
export const revalidate = false;

import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function GET(req: Request) {
  try {
    // Extract Authorization header from the incoming request
    const authHeader = req.headers.get('authorization');
    
    console.log('🔍 Next.js API: GET /api/customer-ledger/aging');
    console.log('🔍 Auth header present:', !!authHeader);

    const url = `${BACKEND_URL}/api/customer-ledger/customers/ledger/aging`;

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
    console.error('Error in /api/customer-ledger/aging:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
