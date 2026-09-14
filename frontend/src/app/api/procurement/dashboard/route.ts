import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const companyId = request.headers.get("x-company-id") || "RESSICHEM";

    const response = await fetch(`${API_BASE_URL}/api/procurement/dashboard`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        ...(authHeader ? { Authorization: authHeader } : {}),
        "x-company-id": companyId,
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Frontend API - /api/procurement/dashboard error:", error);
    return NextResponse.json({ success: false, message: "Failed to load dashboard" }, { status: 500 });
  }
}
