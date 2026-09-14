export const dynamic = "force-static";
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { updateOrderStatus } from '../../storage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get("token")?.value;
    
    // Also check for token in Authorization header
    const authHeader = request.headers.get('authorization');
    const headerToken = authHeader?.replace('Bearer ', '');
    
    const token = cookieToken || headerToken;

    if (!token) {
      console.log("No authentication token found, updating order status in in-memory storage for demo");
      const updatedOrder = updateOrderStatus(id, body.status);
      if (updatedOrder) {
        return NextResponse.json(updatedOrder);
      } else {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
    }

    const response = await fetch(`${API_BASE_URL}/api/orders/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to update order status');
    }

    const order = await response.json();
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}
