import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/api/procurement/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-company-id": body.company_id || "RESSICHEM",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Frontend API - /api/procurement/auth/signup error:", error);
    return NextResponse.json({ success: false, message: "Procurement signup failed" }, { status: 500 });
  }
}
