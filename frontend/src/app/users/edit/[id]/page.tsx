"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import { getAuthHeaders } from "@/lib/auth";

interface User {
  _id: string;
  user_id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  company_id: string;
  isActive: boolean;
  isCustomer?: boolean;
  isManager?: boolean;
  createdAt: string;
}

export default function EditUser() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    company_id: "RESSICHEM",
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  // Determine user type
  const userType = user ? (
    user.isCustomer ? 'Customer' :
    user.isManager ? 'Manager' :
    'Staff'
  ) : null;
  
  // Check if form should be read-only (customers and managers are read-only)
  const isReadOnly = user ? (user.isCustomer || user.isManager) : false;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${userId}`, {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setFormData({
            firstName: userData.firstName || "",
            lastName: userData.lastName || "",
            email: userData.email || "",
            phone: userData.phone || "",
            role: userData.role || "",
            company_id: userData.company_id || "RESSICHEM",
            isActive: userData.isActive !== undefined ? userData.isActive : true
          });
        } else {
          setMessage("Failed to load user data. The user may not exist or you may not have permission.");
          setUser(null);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setMessage("Error loading user data");
        setUser(null);
      } finally {
        setInitialized(true);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage("User updated successfully!");
        setTimeout(() => {
          router.push("/users");
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || "Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      setMessage("Error updating user");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // While fetching initial data, show a loading spinner
  if (!initialized) {
    return (
      <ProtectedRoute requiredPermission="users.read">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </ProtectedRoute>
    );
  }

  // If initialized but user not found or not accessible, show an error message instead of a blank page
  if (!user) {
    return (
      <ProtectedRoute requiredPermission="users.update">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto px-4">
            <h2 className="text-2xl font-bold text-dark dark:text-white mb-4">
              User Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The requested user could not be loaded. They may have been deleted, 
              or you might not have permission to edit this user.
            </p>
            {message && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                {message}
              </p>
            )}
            <button
              onClick={() => router.push("/users")}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-center font-medium text-white hover:bg-opacity-90"
            >
              Back to Users
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredPermission="users.update">
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">
            Edit User
          </h2>
          <nav>
            <ol className="flex items-center gap-2">
              <li>
                <a className="font-medium" href="/users">
                  Users
                </a>
              </li>
              <li className="font-medium text-primary">/ Edit User</li>
            </ol>
          </nav>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-black dark:text-white">
                User Information
              </h3>
              {userType && (
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    userType === 'Customer' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    userType === 'Manager' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {userType}
                  </span>
                  {isReadOnly && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      Read Only
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {isReadOnly && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mx-6.5 mt-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> This user is a {userType?.toLowerCase()}. {userType} accounts cannot be edited through this interface.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="p-6.5">
            <div className="mb-4.5 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  First Name <span className="text-meta-1">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter first name"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  disabled={isReadOnly}
                  required
                />
              </div>

              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  Last Name <span className="text-meta-1">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter last name"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  disabled={isReadOnly}
                  required
                />
              </div>
            </div>

            <div className="mb-4.5">
              <label className="mb-2.5 block text-black dark:text-white">
                Email <span className="text-meta-1">*</span>
              </label>
              <input
                type="email"
                placeholder="Enter email address"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                disabled={isReadOnly}
                required
              />
            </div>

            <div className="mb-4.5">
              <label className="mb-2.5 block text-black dark:text-white">
                Phone <span className="text-meta-1">*</span>
              </label>
              <input
                type="tel"
                placeholder="Enter phone number"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                disabled={isReadOnly}
                required
              />
            </div>

            <div className="mb-4.5">
              <label className="mb-2.5 block text-black dark:text-white">
                Role <span className="text-meta-1">*</span>
              </label>
              <select
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                value={formData.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
                disabled={isReadOnly}
                required
              >
                <option value="">Select Role</option>
                <option value="Staff">Staff</option>
                <option value="Sales Manager">Sales Manager</option>
                <option value="Sales Representative">Sales Representative</option>
                <option value="Inventory Manager">Inventory Manager</option>
                <option value="Super Admin">Super Admin</option>
              </select>
            </div>

            <div className="mb-4.5">
              <label className="mb-2.5 block text-black dark:text-white">
                Company ID
              </label>
              <input
                type="text"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                value={formData.company_id}
                onChange={(e) => handleInputChange("company_id", e.target.value)}
                disabled={isReadOnly}
                required
              />
            </div>

            <div className="mb-4.5">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-[1.5px] border-stroke"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange("isActive", e.target.checked)}
                  disabled={isReadOnly}
                />
                <span className="text-black dark:text-white">Active User</span>
              </label>
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
              {!isReadOnly && (
                <button
                  type="submit"
                  className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Updating...
                    </div>
                  ) : (
                    "Update User"
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push("/users")}
                className={`flex w-full justify-center rounded border border-stroke bg-gray-2 p-3 font-medium text-black hover:bg-opacity-90 dark:border-strokedark dark:bg-meta-4 dark:text-white ${isReadOnly ? '' : ''}`}
              >
                {isReadOnly ? 'Back to Users' : 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
