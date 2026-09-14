import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing frontend-backend connection...');
    console.log('   Backend URL:', BACKEND_URL);
    
    // Test 1: Backend health check
    let backendHealth = false;
    try {
      const healthResponse = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      backendHealth = healthResponse.ok;
      console.log('   Backend health check:', backendHealth ? '✅ OK' : '❌ Failed');
    } catch (error) {
      console.log('   Backend health check: ❌ Error -', error instanceof Error ? error.message : 'Unknown');
    }

    // Test 2: Backend API endpoint (without auth for testing)
    let backendApi = false;
    try {
      const apiResponse = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      backendApi = apiResponse.ok;
      console.log('   Backend API access:', backendApi ? '✅ OK' : '❌ Failed');
    } catch (error) {
      console.log('   Backend API access: ❌ Error -', error instanceof Error ? error.message : 'Unknown');
    }

    // Test 3: Environment variables
    const envCheck = {
      backendUrl: BACKEND_URL,
      hasBackendUrl: !!process.env.NEXT_PUBLIC_BACKEND_URL || !!process.env.NEXT_PUBLIC_API_URL,
      nodeEnv: process.env.NODE_ENV || 'development'
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        backendHealth,
        backendApi,
        environment: envCheck
      },
      status: backendHealth && backendApi ? 'all_connected' : 'partial_connection'
    });
  } catch (error) {
    console.error('❌ Connection test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

