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

    console.log('🧪 Testing complete notification flow...');

    // Test 1: Check if backend is running
    let backendStatus = 'unknown';
    try {
      const healthResponse = await fetch(`${API_BASE_URL}/api/health`);
      backendStatus = healthResponse.ok ? 'running' : 'error';
    } catch (error) {
      backendStatus = 'not_available';
    }

    // Test 2: Check WebSocket endpoint
    let websocketStatus = 'unknown';
    try {
      const wsUrl = API_BASE_URL.replace('http', 'ws') + '/ws';
      console.log('WebSocket URL:', wsUrl);
      websocketStatus = 'configured';
    } catch (error) {
      websocketStatus = 'error';
    }

    // Test 3: Try to create a test notification
    let notificationTest: { status: string; error?: string | null; data?: any } = { status: 'not_tested', error: null };
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/test-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: "Complete Flow Test",
          message: "Testing the complete notification flow from frontend to backend to WebSocket.",
          type: "system",
          priority: "high",
          targetType: "company",
          targetIds: ["RESSICHEM"],
          company_id: "RESSICHEM",
          sender_id: "test_system",
          sender_name: "Test System"
        }),
      });

      if (response.ok) {
        const data = await response.json();
        notificationTest = { status: 'success', data };
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        notificationTest = { status: 'error', error: errorData.message };
      }
    } catch (error) {
      notificationTest = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }

    return NextResponse.json({
      status: 'Complete Flow Test Results',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
      },
      tests: {
        backend: {
          status: backendStatus,
          url: API_BASE_URL
        },
        websocket: {
          status: websocketStatus,
          url: API_BASE_URL.replace('http', 'ws') + '/ws'
        },
        notification: notificationTest
      },
      recommendations: {
        if_backend_down: 'Start the backend server with: cd backend && npm run dev',
        if_websocket_issues: 'Check WebSocket connection in browser console',
        if_notification_fails: 'Check backend notification service and database connection'
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to test complete flow',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
