import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = request.headers.get("authorization") || "";

    const response = await fetch(`${API_BASE_URL}/api/qc/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Frontend API - /api/qc/ai/chat error:", error);
    return NextResponse.json({ success: false, message: "AI assistant request failed" }, { status: 500 });
  }
}
