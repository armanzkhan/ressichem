// API route disabled for static export
export const dynamic = 'force-static';
export const revalidate = false;

import { getAuthHeaders } from '@/lib/auth';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(req: Request) {
  try {
    // Extract Authorization header from the incoming request
    const authHeader = req.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/api/invoices/stats`, {
      method: 'GET',
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
    console.error('Error in /api/invoices/stats:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
