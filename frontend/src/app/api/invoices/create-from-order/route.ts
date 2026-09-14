import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrlServer } from '@/lib/getBackendUrlServer';

const API_BASE_URL = getBackendUrlServer();

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token is required' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json({ 
        error: 'Missing required field: orderId' 
      }, { status: 400 });
    }

    console.log('📄 Creating invoice for order:', orderId);

    const response = await fetch(`${API_BASE_URL}/api/invoices/create-from-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to create invoice' }));
      return NextResponse.json({ error: errorData.message || 'Failed to create invoice' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating invoice from order:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal Server Error' 
    }, { status: 500 });
  }
}

