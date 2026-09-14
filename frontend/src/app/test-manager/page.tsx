"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/components/Auth/user-context";

export default function TestManagerPage() {
  const { user, isManager } = useUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const testManagerProfile = async () => {
    setLoading(true);
    setError("");
    
    try {
      const token = localStorage.getItem("token");
      console.log("Testing manager profile with token:", token ? "Present" : "Missing");
      
      const response = await fetch('/api/managers/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log("Manager profile data:", data);
        setProfile(data.manager);
      } else {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        setError(`API Error: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      setError(`Fetch Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Manager Profile Test</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">User Context:</h2>
        <p>User: {user ? user.email : "Not logged in"}</p>
        <p>Is Manager: {isManager() ? "Yes" : "No"}</p>
        <p>Manager Profile: {user?.managerProfile ? "Present" : "Not present"}</p>
        {user?.managerProfile && (
          <div className="ml-4">
            <p>Assigned Categories: {user.managerProfile.assignedCategories?.length || 0}</p>
            <p>Manager Level: {user.managerProfile.managerLevel}</p>
          </div>
        )}
      </div>

      <div className="mb-4">
        <button
          onClick={testManagerProfile}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Testing..." : "Test Manager Profile API"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {profile && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <h3 className="font-semibold">Manager Profile Found:</h3>
          <pre className="mt-2 text-sm overflow-auto">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
