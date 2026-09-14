import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const auth = request.headers.get("authorization");
    if (!auth) {
      return NextResponse.json({ success: false, message: "Authorization required" }, { status: 401 });
    }

    const companyId = request.headers.get("x-company-id") || "RESSICHEM";
    const incoming = await request.formData();
    const file = incoming.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ success: false, message: "No file selected" }, { status: 400 });
    }

    const outbound = new FormData();
    const name = file instanceof File ? file.name : "upload";
    outbound.append("file", file, name);

    const response = await fetch(`${API_BASE_URL}/api/qc/results/${id}/attachments`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "x-company-id": companyId,
      },
      body: outbound,
    });

    const text = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { success: false, message: text || "Upload failed" },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("QC attachment upload proxy error:", error);
    return NextResponse.json({ success: false, message: "Upload failed — could not reach backend" }, { status: 500 });
  }
}
