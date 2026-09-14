export const dynamic = "force-static";
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUser, updateUser, deleteUser, getAllUsers } from '../storage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      console.log("No authentication token found, returning user from in-memory storage for demo");
      const user = getUser(id);
      if (user) {
        return NextResponse.json(user);
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    const user = await response.json();
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      console.log("No authentication token found, updating user in in-memory storage for demo");
      const updatedUser = updateUser(id, body);
      if (updatedUser) {
        return NextResponse.json(updatedUser);
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to update user');
    }

    const user = await response.json();
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    console.log("Attempting to delete user with ID:", id);
    console.log("Token available:", !!token);
    
    // Show what users are available in storage
    const allUsers = getAllUsers();
    console.log("Users available in storage:", allUsers.map(u => ({ id: u._id, name: `${u.firstName} ${u.lastName}` })));

    // First try the backend if available
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        console.log("Successfully deleted user from backend");
        return NextResponse.json({ message: 'User deleted successfully' });
      } else {
        console.log("Backend delete failed, trying in-memory storage");
        // If backend fails, try in-memory storage
        const deleted = deleteUser(id);
        console.log("In-memory delete result:", deleted);
        if (deleted) {
          return NextResponse.json({ message: 'User deleted successfully' });
        } else {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
      }
    } catch (backendError) {
      console.log("Backend not available, trying in-memory storage");
      // If backend is not available, try in-memory storage
      const deleted = deleteUser(id);
      console.log("In-memory delete result:", deleted);
      if (deleted) {
        return NextResponse.json({ message: 'User deleted successfully' });
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
