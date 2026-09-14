// API route disabled for static export
export const dynamic = 'force-static';
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// GET /api/products - Fetch all products
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    // Get query parameters from the request
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '2000'; // Default to 2000 to get all products (we have 1256)
    
    console.log('🔍 Next.js API: Fetching products with limit:', limit);

    const response = await fetch(`${API_BASE_URL}/api/products?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      console.error("Backend not available, cannot fetch real products");
      return NextResponse.json({ error: "Backend not available" }, { status: 503 });
    }

    const productsData = await response.json();
    console.log('🔍 Backend response:', productsData);
    console.log('🔍 Backend response type:', typeof productsData);
    console.log('🔍 Backend response keys:', Object.keys(productsData || {}));
    
    // Handle backend response format (object with products array)
    const products = Array.isArray(productsData) ? productsData : productsData.products || [];
    console.log('📊 Processed products for frontend:', products.length);
    console.log('📦 First 3 products:', products.slice(0, 3).map((p: any) => p.name));
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products from backend:', error);
    return NextResponse.json({ error: "Failed to fetch products from backend" }, { status: 500 });
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    const response = await fetch(`${API_BASE_URL}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("Backend not available, cannot create product");
      return NextResponse.json({ error: "Backend not available" }, { status: 503 });
    }

    const product = await response.json();
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product in backend:", error);
    return NextResponse.json({ error: "Failed to create product in backend" }, { status: 500 });
  }
}
