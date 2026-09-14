export const dynamic = "force-static";
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 NEXT.JS API ROUTE CALLED - /api/managers/orders/[id]/status');
  
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace("Bearer ", "");
    const body = await request.json();

    console.log('🔍 Status Update API Route Debug:');
    console.log('   Order ID:', id);
    console.log('   Auth Header:', authHeader ? 'Present' : 'Missing');
    console.log('   Token:', token ? 'Present' : 'Missing');
    console.log('   Request Body:', body);
    console.log('   Backend URL:', `${API_BASE_URL}/api/managers/orders/${id}/status`);

    const response = await fetch(`${API_BASE_URL}/api/managers/orders/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    console.log('📡 Backend Response Status:', response.status);
    console.log('📡 Backend Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Backend Error:', errorData);
      return NextResponse.json({ error: errorData.message || 'Backend error' }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Backend Response Data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Next.js API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
