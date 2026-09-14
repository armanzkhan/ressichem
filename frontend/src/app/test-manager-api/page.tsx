"use client";

import { useState } from "react";

export default function TestManagerAPIPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const testAPI = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("❌ No token found in localStorage");
        setLoading(false);
        return;
      }

      console.log("🔍 Testing Manager Profile API...");
      console.log("Token present:", !!token);
      
      // Decode token
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log("🔑 Token payload:", payload);
        console.log("   User ID:", payload.user_id);
        console.log("   Company ID:", payload.company_id);
        console.log("   Email:", payload.email);
      } catch (e) {
        console.error("❌ Could not decode token:", e);
      }

      // Test direct backend call
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      console.log("🌐 Backend URL:", backendUrl);
      
      const directBackendResponse = await fetch(`${backendUrl}/api/managers/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log("📡 Direct Backend Response:", {
        status: directBackendResponse.status,
        statusText: directBackendResponse.statusText,
        ok: directBackendResponse.ok
      });

      let directBackendData;
      try {
        directBackendData = await directBackendResponse.json();
        console.log("📦 Direct Backend Data:", directBackendData);
      } catch (e) {
        console.error("❌ Could not parse direct backend response:", e);
        directBackendData = { error: "Could not parse response" };
      }

      // Test Next.js API route
      console.log("🌐 Testing Next.js API route...");
      const nextApiResponse = await fetch('/api/managers/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log("📡 Next.js API Response:", {
        status: nextApiResponse.status,
        statusText: nextApiResponse.statusText,
        ok: nextApiResponse.ok
      });

      let nextApiData;
      try {
        nextApiData = await nextApiResponse.json();
        console.log("📦 Next.js API Data:", nextApiData);
      } catch (e) {
        console.error("❌ Could not parse Next.js API response:", e);
        nextApiData = { error: "Could not parse response" };
      }

      setResult({
        token: {
          present: !!token,
          length: token.length,
          preview: token.substring(0, 50) + "..."
        },
        backendUrl,
        directBackend: {
          status: directBackendResponse.status,
          statusText: directBackendResponse.statusText,
          ok: directBackendResponse.ok,
          data: directBackendData
        },
        nextApi: {
          status: nextApiResponse.status,
          statusText: nextApiResponse.statusText,
          ok: nextApiResponse.ok,
          data: nextApiData
        }
      });

    } catch (err) {
      console.error("❌ Test Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Manager Profile API Test</h1>
      
      <button
        onClick={testAPI}
        disabled={loading}
        className="mb-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "Testing..." : "Test API"}
      </button>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="p-4 bg-gray-100 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Test Results</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">Direct Backend Call:</h3>
            <p>Status: {result.directBackend.status} {result.directBackend.statusText}</p>
            <p>OK: {result.directBackend.ok ? "✅ Yes" : "❌ No"}</p>
            {result.directBackend.data && (
              <div className="mt-2">
                <p className="font-semibold">Response:</p>
                <pre className="text-xs bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(result.directBackend.data, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold mb-2">Next.js API Route:</h3>
            <p>Status: {result.nextApi.status} {result.nextApi.statusText}</p>
            <p>OK: {result.nextApi.ok ? "✅ Yes" : "❌ No"}</p>
            {result.nextApi.data && (
              <div className="mt-2">
                <p className="font-semibold">Response:</p>
                <pre className="text-xs bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(result.nextApi.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Open browser console (F12) to see detailed logs</li>
          <li>Click "Test API" button</li>
          <li>Check the results above</li>
          <li>Compare Direct Backend vs Next.js API route responses</li>
          <li>Share the console logs and results if issue persists</li>
        </ol>
      </div>
    </div>
  );
}

