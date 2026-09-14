"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/components/Auth/user-context";

export default function DebugManagerPage() {
  const { user, isManager } = useUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState({});

  const testManagerProfile = async () => {
    setLoading(true);
    setError("");
    
    try {
      const token = localStorage.getItem("token");
      console.log("🔍 Debug Info:");
      console.log("User:", user);
      console.log("Is Manager:", isManager());
      console.log("Token:", token ? "Present" : "Missing");
      
      // Decode JWT token to see what's inside
      if (token) {
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            console.log("🔑 JWT Token payload:", payload);
          }
        } catch (e) {
          console.log("❌ Could not decode JWT token:", e);
        }
      }
      
      setDebugInfo({
        user: user,
        isManager: isManager(),
        hasToken: !!token,
        tokenLength: token?.length || 0
      });
      
      if (!token) {
        setError("❌ No authentication token found. Please login first.");
        return;
      }

      console.log("🌐 Making API request to /api/managers/profile...");
      
      const response = await fetch('/api/managers/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response headers:", response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Manager profile data:", data);
        console.log("📊 Profile details:", {
          hasManager: !!data.manager,
          managerId: data.manager?._id,
          userId: data.manager?.user_id,
          categories: data.manager?.assignedCategories,
          level: data.manager?.managerLevel
        });
        setProfile(data.manager);
        setError("");
      } else {
        const errorData = await response.json();
        console.error("❌ API Error:", errorData);
        console.error("❌ Full error response:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorData
        });
        setError(`❌ API Error (${response.status}): ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("❌ Fetch Error:", error);
      setError(`Fetch Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    try {
      console.log("🔐 Testing login...");
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'sales@ressichem.com',
          password: 'password123'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Login successful:", data);
        localStorage.setItem("token", data.token);
        setError("✅ Login successful! Please refresh the page.");
      } else {
        const errorData = await response.json();
        console.error("❌ Login failed:", errorData);
        setError(`Login failed: ${errorData.message}`);
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      setError(`Login error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Manager Dashboard Debug</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Context Info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">User Context</h2>
          <div className="space-y-2">
            <p><strong>User:</strong> {user ? user.email : "Not logged in"}</p>
            <p><strong>Is Manager:</strong> {isManager() ? "Yes" : "No"}</p>
            <p><strong>Manager Profile:</strong> {user?.managerProfile ? "Present" : "Not present"}</p>
            {user?.managerProfile && (
              <div className="ml-4 text-sm">
                <p>Categories: {user.managerProfile.assignedCategories?.length || 0}</p>
                <p>Level: {user.managerProfile.managerLevel}</p>
              </div>
            )}
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Debug Info</h2>
          <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 space-x-4">
        <button
          onClick={testLogin}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Test Login
        </button>
        
        <button
          onClick={testManagerProfile}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Testing..." : "Test Manager Profile API"}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Profile Display */}
      {profile && (
        <div className="mt-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <h3 className="font-semibold">Manager Profile Found:</h3>
          <pre className="mt-2 text-sm overflow-auto">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-800">Debug Instructions:</h3>
        <ol className="mt-2 text-sm text-blue-700 space-y-1">
          <li>1. Click "Test Login" to login with sales@ressichem.com</li>
          <li>2. Click "Test Manager Profile API" to test the API</li>
          <li>3. Check browser console for detailed logs</li>
          <li>4. If login fails, check if backend server is running</li>
          <li>5. If API fails, check Network tab for request details</li>
        </ol>
      </div>
    </div>
  );
}
