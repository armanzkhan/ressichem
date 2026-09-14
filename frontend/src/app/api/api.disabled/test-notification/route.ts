// API route disabled for static export
export const dynamic = 'force-static';
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '') || 
                  request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authorization token is required' }, { status: 401 });
    }

    console.log('🧪 Testing notification system...');
    console.log('Token available:', !!token);
    console.log('Backend URL:', API_BASE_URL);

    // Test the backend notification endpoint
    const response = await fetch(`${API_BASE_URL}/api/notifications/test-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: "Test Notification",
        message: "This is a test notification to verify the system is working.",
        type: "system",
        priority: "high",
        targetType: "company",
        targetIds: ["RESSICHEM"],
        company_id: "RESSICHEM",
        sender_id: "test_system",
        sender_name: "Test System"
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown backend error' }));
      console.error('Backend notification test failed:', errorData);
      return NextResponse.json({ 
        error: `Backend notification test failed: ${errorData.message}`,
        status: response.status,
        backendResponse: errorData
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Backend notification test successful:', data);
    
    return NextResponse.json({ 
      message: 'Test notification sent successfully', 
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Test notification error:', error);
    return NextResponse.json({ 
      error: 'Failed to send test notification',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}