export const dynamic = "force-static";
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// ✅ Helper to get token (from header or cookies)
async function getAuthToken(request: NextRequest): Promise<string | null> {
  const headerToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const cookieToken = (await cookies()).get("token")?.value;
  return headerToken || cookieToken || null;
}

// GET /api/companies/[id] - Fetch a specific company
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch from backend
    const resolvedParams = await params;
    const response = await fetch(`${BACKEND_URL}/api/companies/${resolvedParams.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const company = await response.json();
    return NextResponse.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company' },
      { status: 500 }
    );
  }
}

// PUT /api/companies/[id] - Update a specific company
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const resolvedParams = await params;

    // Update in backend
    const response = await fetch(`${BACKEND_URL}/api/companies/${resolvedParams.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }
      const errorData = await response.json();
      throw new Error(errorData.message || `Backend responded with status: ${response.status}`);
    }

    const updatedCompany = await response.json();
    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update company' },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/[id] - Delete a specific company
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Delete from backend
    const resolvedParams = await params;
    const response = await fetch(`${BACKEND_URL}/api/companies/${resolvedParams.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }
      const errorData = await response.json();
      throw new Error(errorData.message || `Backend responded with status: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete company' },
      { status: 500 }
    );
  }
}
