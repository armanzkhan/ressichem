import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Next.js API: Updating discount for approved item...');
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    console.log('🔍 Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      return NextResponse.json({ message: 'Authorization header required' }, { status: 401 });
    }

    // Get the request body
    const body = await request.json();
    console.log('🔍 Request body:', body);

    // Forward the request to the backend
    const backendUrl = BACKEND_URL;
    const backendResponse = await fetch(`${backendUrl}/api/orders/update-discount`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    console.log('📡 Backend response status:', backendResponse.status);
    console.log('📡 Backend response headers:', Object.fromEntries(backendResponse.headers.entries()));
    console.log('📡 Backend response ok:', backendResponse.ok);

    if (backendResponse.ok) {
      let data;
      try {
        data = await backendResponse.json();
        console.log('✅ Discount updated successfully:', data);
      } catch (jsonError) {
        const textData = await backendResponse.text();
        console.error('❌ Failed to parse success response as JSON:', textData);
        data = { message: 'Success but invalid JSON response' };
      }
      return NextResponse.json(data);
    } else {
      let errorData;
      try {
        errorData = await backendResponse.json();
      } catch (jsonError) {
        const textData = await backendResponse.text();
        console.error('❌ Failed to parse error response as JSON:', textData);
        errorData = { message: `Backend error: ${backendResponse.status} ${backendResponse.statusText}` };
      }
      
      console.error('❌ Backend error:', errorData);
      return NextResponse.json(errorData, { status: backendResponse.status });
    }
  } catch (error) {
    console.error('❌ Error updating discount:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

