// API route disabled for static export
export const dynamic = 'force-static';
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🧪 TEST ROUTE GET CALLED - /api/test-status');
  return NextResponse.json({ 
    message: 'Test route GET working', 
    timestamp: new Date().toISOString()
  });
}

export async function PUT(request: NextRequest) {
  console.log('🧪 TEST ROUTE PUT CALLED - /api/test-status');
  console.log('🧪 Request method:', request.method);
  console.log('🧪 Request URL:', request.url);
  
  try {
    const body = await request.json();
    console.log('🧪 Test route body:', body);
    
    return NextResponse.json({ 
      message: 'Test route working', 
      receivedData: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🧪 Test route error:', error);
    return NextResponse.json({ error: 'Test route error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
