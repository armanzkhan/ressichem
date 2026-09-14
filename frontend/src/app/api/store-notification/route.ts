import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization token is required' }, { status: 401 });
    }

    console.log('💾 Storing real-time notification in database:', body);

    // Forward the notification to the backend to store in database
    const response = await fetch(`${API_BASE_URL}/api/notifications/store-realtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        title: body.title,
        message: body.message,
        type: body.type,
        priority: body.priority,
        targetType: body.targetType || 'company',
        targetIds: body.targetIds || ['RESSICHEM'],
        company_id: body.company_id || 'RESSICHEM',
        sender_id: body.sender_id || 'system',
        sender_name: body.sender_name || 'System',
        data: body.data || {},
        timestamp: body.timestamp || new Date().toISOString()
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || 'Unknown backend error' };
      }
      console.error('Failed to store notification in backend:', errorData);
      return NextResponse.json({ 
        error: `Failed to store notification: ${errorData.message || 'Unknown error'}`,
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

