// API route disabled for static export
export const dynamic = 'force-static';
export const revalidate = false;

import { NextResponse } from 'next/server';
import { getAllUsers } from '../../users/storage';

export async function GET() {
  try {
    const storageUsers = getAllUsers();
    return NextResponse.json({
      message: 'Debug: Users in storage',
      storageUsers: storageUsers.map(u => ({ 
        id: u._id, 
        name: `${u.firstName} ${u.lastName}`,
        email: u.email 
      })),
      count: storageUsers.length
    });
  } catch (error) {
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
}
