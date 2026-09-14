// API route disabled for static export
export const dynamic = 'force-static';
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const wsUrl = backendUrl.replace('http', 'ws') + '/ws';
    
    return NextResponse.json({
      status: 'WebSocket Debug Info',
      backendUrl,
      wsUrl,
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to get WebSocket debug info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
