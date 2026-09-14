// API route disabled for static export
export const dynamic = 'force-static';
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '') || 
                  request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authorization token is required' }, { status: 401 });
    }

    console.log('💾 Storing real-time notification in database:', body);

    // Forward the notification to the backend to store in database
    const response = await fetch(`${API_BASE_URL}/api/notifications/store-realtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: body.title,
        message: body.message,
        type: body.type,
        priority: body.priority,
        targetType: 'company',
        targetIds: ['RESSICHEM'],
        company_id: 'RESSICHEM',
        sender_id: body.sender_id || 'system',
        sender_name: body.sender_name || 'System',
        data: body.data || {},
        timestamp: body.timestamp || new Date().toISOString()
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown backend error' }));
      console.error('Failed to store notification in backend:', errorData);
      return NextResponse.json({ 
        error: `Failed to store notification: ${errorData.message}`,
        details: errorData
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Notification stored successfully:', data);
    
    return NextResponse.json({ 
      message: 'Notification stored successfully', 
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error storing notification:', error);
    return NextResponse.json({ 
      error: 'Failed to store notification',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
