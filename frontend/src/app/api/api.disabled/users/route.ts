// API route disabled for static export
export const dynamic = 'force-static';
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { demoUsers, addUser } from './storage';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    console.log("Fetching users - Auth header available:", !!authHeader);

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader }),
        },
      });

      if (response.ok) {
        const users = await response.json();
        console.log("Successfully fetched users from backend:", users.length);
        return NextResponse.json(users);
      } else {
        console.log("Backend response not ok, using in-memory storage");
        return NextResponse.json(demoUsers);
      }
    } catch (backendError) {
      console.log("Backend not available, using in-memory storage:", backendError instanceof Error ? backendError.message : 'Unknown error');
      return NextResponse.json(demoUsers);
    }
  } catch (error) {
    console.error('Error in GET users:', error);
    return NextResponse.json(demoUsers);
  }
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
    
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    // The backend /create endpoint expects the original form data
    const response = await fetch(`${API_BASE_URL}/api/users/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.log("Backend not available, adding user to in-memory storage for demo");
      const newUser = {
        _id: `user_${Date.now()}`,
        user_id: `user_${Date.now()}`,
        firstName: body.firstName || "New",
        lastName: body.lastName || "User",
        email: body.email || "new.user@example.com",
        phone: body.phone || "",
        role: body.role || "Staff",
        company_id: body.company_id || "RESSICHEM",
        isActive: body.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const addedUser = addUser(newUser);
      return NextResponse.json(addedUser, { status: 201 });
    }

    const user = await response.json();
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user in backend, using demo storage:', error);
    const newUser = {
      _id: `user_${Date.now()}`,
      user_id: `user_${Date.now()}`,
      firstName: body.firstName || "New",
      lastName: body.lastName || "User",
      email: body.email || "new.user@example.com",
      phone: body.phone || "",
      role: body.role || "Staff",
      company_id: body.company_id || "RESSICHEM",
      isActive: body.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const addedUser = addUser(newUser);
    return NextResponse.json(addedUser, { status: 201 });
  }
}
