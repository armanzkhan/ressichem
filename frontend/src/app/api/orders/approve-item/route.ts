import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Next.js API: Approving item...');
    
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
    const backendResponse = await fetch(`${backendUrl}/api/orders/approve-item`, {
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
        console.log('✅ Backend data received:', data);
        return NextResponse.json(data);
      } catch (jsonError) {
        const textData = await backendResponse.text();
        console.error('❌ Failed to parse backend success response as JSON:', textData);
        return NextResponse.json({ message: 'Backend success but invalid JSON response', rawData: textData });
      }
    } else {
      let errorData;
      let responseText;
      try {
        responseText = await backendResponse.text();
        console.log('📡 Backend raw response text:', responseText);
        
        if (responseText.trim()) {
          errorData = JSON.parse(responseText);
        } else {
          errorData = { message: `Empty response from backend (${backendResponse.status})` };
        }
      } catch (parseError) {
        console.error('❌ Failed to parse backend error response:', parseError);
        console.error('❌ Backend raw response text:', responseText || 'No response text');
        errorData = { 
          message: `Backend error: ${backendResponse.status} ${backendResponse.statusText}`,
          rawResponse: responseText || 'No response text'
        };
      }
      console.error('❌ Backend error:', errorData);
      return NextResponse.json(errorData, { status: backendResponse.status });
    }
  } catch (error) {
    console.error('❌ Next.js API error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

