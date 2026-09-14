import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function proxyHeaders(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const companyId = request.headers.get("x-company-id") || "RESSICHEM";
  return { auth, companyId };
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await context.params;
    const { auth, companyId } = proxyHeaders(request);
    if (!auth) {
      return NextResponse.json({ success: false, message: "Authorization required" }, { status: 401 });
    }

    const incoming = await request.formData();
    const file = incoming.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ success: false, message: "No file selected" }, { status: 400 });
    }

    const outbound = new FormData();
    const name = file instanceof File ? file.name : "upload";
    outbound.append("file", file, name);

    const response = await fetch(`${API_BASE_URL}/api/qc/results/${id}/attachments/${attachmentId}`, {
      method: "PUT",
      headers: { Authorization: auth, "x-company-id": companyId },
      body: outbound,
    });

    const text = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ success: false, message: text || "Replace failed" }, { status: response.status });
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("QC attachment replace proxy error:", error);
    return NextResponse.json({ success: false, message: "Replace failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await context.params;
    const { auth, companyId } = proxyHeaders(request);
    if (!auth) {
      return NextResponse.json({ success: false, message: "Authorization required" }, { status: 401 });
    }

    const response = await fetch(`${API_BASE_URL}/api/qc/results/${id}/attachments/${attachmentId}`, {
      method: "DELETE",
      headers: { Authorization: auth, "x-company-id": companyId },
    });

    const text = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ success: false, message: text || "Delete failed" }, { status: response.status });
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("QC attachment delete proxy error:", error);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}
