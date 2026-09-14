"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";

export default function CreateRole() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const availablePermissions = [
    "users.view", "users.create", "users.edit", "users.delete",
    "customers.view", "customers.create", "customers.edit", "customers.delete",
    "orders.view", "orders.create", "orders.edit", "orders.delete",
    "products.view", "products.create", "products.edit", "products.delete",
    "companies.view", "companies.create", "companies.edit", "companies.delete",
    "roles.view", "roles.create", "roles.edit", "roles.delete",
    "permissions.view", "permissions.create", "permissions.edit", "permissions.delete"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/roles`, {
      method: "POST",
      headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(formData),
    });

      if (response.ok) {
        setMessage("Role created successfully!");
        setFormData({
          name: "",
          description: "",
          permissions: []
        });
        setTimeout(() => {
          router.push("/roles");
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || "Failed to create role");
      }
    } catch (error) {
      console.error("Error creating role:", error);
      setMessage("Error creating role");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
  };

  const selectAllPermissions = () => {
    setFormData(prev => ({ ...prev, permissions: availablePermissions }));
  };

  const clearAllPermissions = () => {
    setFormData(prev => ({ ...prev, permissions: [] }));
  };

  return (
    <ProtectedRoute requiredPermission="role_add">
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">
            Add New Role
          </h2>
          <nav>
            <ol className="flex items-center gap-2">
              <li>
                <a className="font-medium" href="/roles">
                  Roles
                </a>
              </li>
              <li className="font-medium text-primary">/ Add Role</li>
            </ol>
          </nav>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              Role Information
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6.5">
            <div className="mb-4.5">
              <label className="mb-2.5 block text-black dark:text-white">
                Role Name <span className="text-meta-1">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter role name"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
            </div>

            <div className="mb-4.5">
              <label className="mb-2.5 block text-black dark:text-white">
                Description <span className="text-meta-1">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Enter role description"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                required
              />
            </div>

            <div className="mb-4.5">
              <div className="mb-3 flex items-center justify-between">
                <label className="block text-black dark:text-white">
                  Permissions <span className="text-meta-1">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllPermissions}
                    className="text-sm text-primary hover:text-primary/70"
                  >
                    Select All
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    type="button"
                    onClick={clearAllPermissions}
                    className="text-sm text-primary hover:text-primary/70"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {availablePermissions.map((permission) => (
                  <label key={permission} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-[1.5px] border-stroke"
                      checked={formData.permissions.includes(permission)}
                      onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                    />
                    <span className="text-sm text-black dark:text-white">
                      {permission}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {message && (
              <div className={`mb-4.5 p-4 rounded ${
                message.includes("successfully") 
                  ? "bg-green-50 text-green-800 border border-green-200" 
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}>
                {message}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </div>
                ) : (
                  "Create Role"
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push("/roles")}
                className="flex w-full justify-center rounded border border-stroke bg-gray-2 p-3 font-medium text-black hover:bg-opacity-90 dark:border-strokedark dark:bg-meta-4 dark:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
