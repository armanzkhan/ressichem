// API route disabled for static export
export const dynamic = 'force-static';
export const revalidate = false;

import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function POST(request: Request) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth) return NextResponse.json({ message: 'No token' }, { status: 401 });

    const formData = await request.formData();
    const resp = await fetch(`${BACKEND_URL}/api/users/me/avatar`, {
      method: 'POST',
      headers: { Authorization: auth },
      body: formData as any,
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (e) {
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}


