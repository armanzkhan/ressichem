"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";

interface Permission {
  _id: string;
  name?: string;
  description?: string;
  key?: string;
}

interface PermissionGroup {
  _id: string;
  name: string;
  permissions: Permission[];
}

interface Role {
  _id: string;
  name: string;
  description: string;
  permissionGroups: PermissionGroup[];
}

export default function EditRole() {
  const { id } = useParams();
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ Helper: Create headers safely
  function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem("token") || "";
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // ✅ Fetch role and permissions
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const headers = getAuthHeaders();

        const [roleRes, permRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/roles/${id}`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/permissions`, { headers }),
        ]);

        if (!roleRes.ok || !permRes.ok) {
          throw new Error("Failed to load role or permissions");
        }

        const roleData: Role = await roleRes.json();
        const permData: Permission[] = await permRes.json();

        setRole(roleData);
        setPermissions(permData);

        // Get existing role's permissions (use direct permissions field if available, fallback to permission groups)
        const allPerms = (roleData as any).permissions?.map((p: any) => p._id) || 
                        (roleData as any).permissionGroups?.flatMap((pg: any) => pg.permissions.map((p: any) => p._id)) || [];
        setSelectedPermissions(allPerms);
      } catch (err) {
        console.error("Error fetching role/permissions:", err);
        setError("Failed to load role or permissions. Please check your token or server.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  // ✅ Handle checkbox toggle
  const handlePermissionToggle = (permId: string, checked: boolean) => {
    setSelectedPermissions(prev =>
      checked ? [...prev, permId] : prev.filter(p => p !== permId)
    );
  };

  // ✅ Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/roles/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: role?.name,
          description: role?.description,
          permissions: selectedPermissions,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to update role");
      }

      alert("Role updated successfully!");
      router.push("/roles");
    } catch (err: any) {
      console.error("Error updating role:", err);
      setError(err.message || "Error updating role");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold">Loading permissions...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600 font-medium">
        ❌ {error}
      </div>
    );
  }

  if (!role) {
    return (
      <div className="p-6 text-gray-500">No role found.</div>
    );
  }

  return (
    <ProtectedRoute requiredPermission="role_edit">
      <div className="mx-auto max-w-screen-2xl p-6">
        <h2 className="text-2xl font-bold mb-4">Edit Role: {role.name}</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-medium mb-2">Role Name</label>
            <input
              type="text"
              className="w-full rounded border border-gray-300 px-4 py-2"
              value={role.name}
              onChange={(e) => setRole({ ...role, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-2">Description</label>
            <textarea
              className="w-full rounded border border-gray-300 px-4 py-2"
              rows={3}
              value={role.description}
              onChange={(e) => setRole({ ...role, description: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-3">Permissions</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {permissions.map((perm) => (
                <label key={perm._id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(perm._id)}
                    onChange={(e) => handlePermissionToggle(perm._id, e.target.checked)}
                  />
                  {perm.description || perm.key}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500">{error}</p>}

          <div className="flex gap-4">
            <button
              type="submit"
              className="rounded bg-primary text-white px-5 py-2 hover:bg-opacity-90"
            >
              Update Role
            </button>
            <button
              type="button"
              onClick={() => router.push("/roles")}
              className="rounded border border-gray-400 px-5 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
