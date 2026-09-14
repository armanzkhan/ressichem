import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    
    console.log('🔍 Next.js API: POST /api/invoices/[id]/duplicate');
    console.log('🔍 Invoice ID:', id);
    console.log('🔍 Request body:', body);
    
    // Extract Authorization header from the incoming request
    const authHeader = req.headers.get('authorization');
    console.log('🔍 Auth header present:', !!authHeader);

    const response = await fetch(`${BACKEND_URL}/api/invoices/${id}/duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify(body),
    });

    console.log('🔍 Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to duplicate invoice' }));
      console.error('❌ Backend error:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Invoice duplicated successfully');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/invoices/[id]/duplicate:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

