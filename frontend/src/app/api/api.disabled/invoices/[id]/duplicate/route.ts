export const dynamic = "force-static";
export const revalidate = false;

import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Extract Authorization header from the incoming request
    const authHeader = req.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/api/invoices/${id}/duplicate`, {
      method: 'POST',
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
    console.error('Error in /api/invoices/[id]/duplicate:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
