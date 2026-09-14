"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import { useEffect } from "react";

export default function CreateCustomer() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "Pakistan",
    company_id: "RESSICHEM"
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [createLogin, setCreateLogin] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [managers, setManagers] = useState<{ _id: string; user_id: string; email?: string }[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [roles, setRoles] = useState<{ _id: string; name: string }[]>([]);
  const [customerRoleId, setCustomerRoleId] = useState("");

  useEffect(() => {
    const fetchManagersAndRoles = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: any = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // Managers
        try {
          const mgrResp = await fetch('/api/managers/all', { headers });
          if (mgrResp.ok) {
            const mgrData = await mgrResp.json();
            setManagers(mgrData.managers || []);
          }
        } catch {}

        // Roles (to find Customer role id)
        try {
          const roleResp = await fetch('/api/roles', { headers });
          if (roleResp.ok) {
            const roleData = await roleResp.json();
            const list = Array.isArray(roleData) ? roleData : (roleData.roles || []);
            setRoles(list);
            const customer = list.find((r: any) => (r.name || '').toLowerCase() === 'customer');
            if (customer?._id) setCustomerRoleId(customer._id);
          }
        } catch {}
      } catch {}
    };
    fetchManagersAndRoles();
  }, []);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@!#%&';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setPassword(pwd);
    setConfirmPassword(pwd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Get token from localStorage
      const token = localStorage.getItem("token");
      
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json();
      
      if (response.ok) {
        const createdCustomer = responseData;
        const customerId = createdCustomer?._id || createdCustomer?.customer?._id || createdCustomer?.id;
        console.log('✅ Customer created successfully:', {
          customerId,
          companyName: createdCustomer.companyName,
          email: createdCustomer.email
        });

        // Optionally create login
        if (createLogin) {
          if (!formData.email) throw new Error('Customer email required to create login');
          if (password.length < 6 || password !== confirmPassword) throw new Error('Password mismatch or too short');

          // Create user with role=Customer (if role id found)
          const userPayload: any = {
            email: formData.email,
            password,
            firstName: formData.contactName?.split(' ')[0] || formData.contactName,
            lastName: formData.contactName?.split(' ').slice(1).join(' ') || '',
            company_id: formData.company_id,
            isCustomer: true,
            userType: 'customer',
            roles: customerRoleId ? [customerRoleId] : [],
            department: 'Customer'
          };
          
          console.log('👤 Creating user account for customer:', userPayload.email);
          const createUserResp = await fetch('/api/users/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(userPayload)
          });
          
          const userResponseData = await createUserResp.json();
          if (!createUserResp.ok) {
            console.error('❌ Failed to create user:', userResponseData);
            throw new Error(userResponseData.message || userResponseData.error || 'Failed to create customer user');
          }
          console.log('✅ User account created successfully:', userResponseData.email || userResponseData.user?.email);
        }

        // Optionally assign manager
        if (selectedManagerId && customerId) {
          try {
            await fetch(`/api/customers/${customerId}/assign-manager`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ customerId, managerId: selectedManagerId })
            });
          } catch (managerError) {
            console.warn('⚠️ Failed to assign manager:', managerError);
            // Don't fail the whole operation if manager assignment fails
          }
        }

        setMessage("✅ Customer created successfully!");
        setTimeout(() => router.push('/customers'), 1200);
      } else {
        console.error('❌ Failed to create customer:', responseData);
        const errorMessage = responseData.message || responseData.error || "Failed to create customer";
        const validationErrors = responseData.errors ? 
          `Validation errors: ${responseData.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ')}` : 
          '';
        setMessage(`${errorMessage}${validationErrors ? ` - ${validationErrors}` : ''}`);
      }
    } catch (error: any) {
      console.error("❌ Error creating customer:", error);
      setMessage(error.message || "Error creating customer. Please check all required fields are filled.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ProtectedRoute requiredPermission="customers.create">
      <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-10">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent dark:from-white dark:to-gray-300">
              Add New Customer
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Create a customer profile with contact and address details.</p>
          </div>
          <nav className="mt-4 sm:mt-0 text-sm">
            <ol className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <li>
                <a className="font-medium hover:text-primary" href="/customers">
                  Customers
                </a>
              </li>
              <li className="font-medium text-primary">/ Add Customer</li>
            </ol>
          </nav>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/20 bg-white/80 dark:bg-gray-900/70 backdrop-blur-sm shadow-xl dark:border-gray-700/40">
          <div className="border-b border-white/30 dark:border-gray-700/50 px-6 sm:px-8 py-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white">🏢</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Customer Information</h3>
          </div>
          <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6">
            {/* Company & Contact */}
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name <span className="text-meta-1">*</span></label>
                <input
                  type="text"
                  placeholder="Enter company name"
                  className="w-full rounded-xl border border-stroke bg-white dark:bg-dark-2 py-3 px-4 font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-form-strokedark"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange("companyName", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Name <span className="text-meta-1">*</span></label>
                <input
                  type="text"
                  placeholder="Enter contact name"
                  className="w-full rounded-xl border border-stroke bg-white dark:bg-dark-2 py-3 px-4 font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-form-strokedark"
                  value={formData.contactName}
                  onChange={(e) => handleInputChange("contactName", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Email <span className="text-meta-1">*</span></label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  className="w-full rounded-xl border border-stroke bg-white dark:bg-dark-2 py-3 px-4 font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-form-strokedark"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone <span className="text-meta-1">*</span></label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  className="w-full rounded-xl border border-stroke bg-white dark:bg-dark-2 py-3 px-4 font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-form-strokedark"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Create Login Toggle - Enhanced Visibility */}
            <div className="mb-6 rounded-xl border-2 border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 p-6">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={createLogin}
                  onChange={(e) => setCreateLogin(e.target.checked)}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="text-lg font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  🔐 Create Login Account for Customer
                </label>
              </div>
              
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                Enable this customer to log into the system and access their dashboard, orders, and products.
              </p>

              {createLogin && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-stroke bg-white dark:bg-dark-2 py-3 px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter password (minimum 6 characters)"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-stroke bg-white dark:bg-dark-2 py-3 px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Confirm password"
                      required
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-3 items-center">
                    <button 
                      type="button" 
                      onClick={generatePassword} 
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                    >
                      🎲 Generate Secure Password
                    </button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Minimum 6 characters required
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Assign Manager */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Assign Manager (optional)</label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full rounded-xl border border-stroke bg-white dark:bg-dark-2 py-3 px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Select Manager --</option>
                  {managers.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.email || m.user_id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Role</label>
                <input
                  type="text"
                  value={customerRoleId ? 'Customer' : 'Customer (role not found)'}
                  readOnly
                  className="w-full rounded-xl border border-stroke bg-gray-50 dark:bg-dark-3 py-3 px-4 text-gray-600"
                />
              </div>
            </div>

            {/* Address */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Street Address <span className="text-meta-1">*</span></label>
              <input
                type="text"
                placeholder="Enter street address"
                className="w-full rounded-xl border border-stroke bg-white dark:bg-dark-2 py-3 px-4 font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-form-strokedark"
                value={formData.street}
                onChange={(e) => handleInputChange("street", e.target.value)}
                required
              />
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">City <span className="text-meta-1">*</span></label>
                <input
                  type="text"
                  placeholder="Enter city"
                  className="w-full rounded-xl border border-stroke bg-white dark:bg-dark-2 py-3 px-4 font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-form-strokedark"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">State/Province</label>
                <input
                  type="text"
                  placeholder="Enter state/province"
                  className="w-full rounded-xl border border-stroke bg-white dark:bg-dark-2 py-3 px-4 font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-form-strokedark"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">ZIP/Postal Code</label>
                <input
                  type="text"
                  placeholder="Enter ZIP/postal code"
                  className="w-full rounded-xl border border-stroke bg-white dark:bg-dark-2 py-3 px-4 font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-form-strokedark"
                  value={formData.zip}
                  onChange={(e) => handleInputChange("zip", e.target.value)}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Country</label>
              <input
                type="text"
                placeholder="Enter country"
                className="w-full rounded-xl border border-stroke bg-white dark:bg-dark-2 py-3 px-4 font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-form-strokedark"
                value={formData.country}
                onChange={(e) => handleInputChange("country", e.target.value)}
              />
            </div>

            {message && (
              <div className={`mb-6 p-4 rounded-xl ${
                message.includes("successfully") 
                  ? "bg-green-50 text-green-800 border border-green-200" 
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}>
                {message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-3 font-medium text-white shadow hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </div>
                ) : (
                  "Create Customer"
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push("/customers")}
                className="inline-flex w-full items-center justify-center rounded-xl border border-stroke bg-gray-50 p-3 font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
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
