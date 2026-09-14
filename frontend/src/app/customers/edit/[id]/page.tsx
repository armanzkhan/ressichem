"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";

interface Customer {
  _id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  company_id: string;
  createdAt: string;
}

export default function EditCustomer() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

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
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await fetch(`/api/customers/${customerId}`);
        if (response.ok) {
          const customerData = await response.json();
          setCustomer(customerData);
          setFormData({
            companyName: customerData.companyName || "",
            contactName: customerData.contactName || "",
            email: customerData.email || "",
            phone: customerData.phone || "",
            street: customerData.street || "",
            city: customerData.city || "",
            state: customerData.state || "",
            zip: customerData.zip || "",
            country: customerData.country || "Pakistan",
            company_id: customerData.company_id || "RESSICHEM"
          });
        } else {
          setMessage("Failed to load customer data");
        }
      } catch (error) {
        console.error("Error fetching customer:", error);
        setMessage("Error loading customer data");
      }
    };

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage("Customer updated successfully!");
        setTimeout(() => {
          router.push("/customers");
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || "Failed to update customer");
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      setMessage("Error updating customer");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!customer) {
    return (
      <ProtectedRoute requiredPermission="customers.read">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredPermission="customers.update">
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">
            Edit Customer
          </h2>
          <nav>
            <ol className="flex items-center gap-2">
              <li>
                <a className="font-medium" href="/customers">
                  Customers
                </a>
              </li>
              <li className="font-medium text-primary">/ Edit Customer</li>
            </ol>
          </nav>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              Customer Information
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6.5">
            <div className="mb-4.5 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  Company Name <span className="text-meta-1">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter company name"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange("companyName", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  Contact Name <span className="text-meta-1">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter contact name"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  value={formData.contactName}
                  onChange={(e) => handleInputChange("contactName", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-4.5 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  Email <span className="text-meta-1">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  Phone <span className="text-meta-1">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-4.5">
              <label className="mb-2.5 block text-black dark:text-white">
                Street Address <span className="text-meta-1">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter street address"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                value={formData.street}
                onChange={(e) => handleInputChange("street", e.target.value)}
                required
              />
            </div>

            <div className="mb-4.5 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  City <span className="text-meta-1">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter city"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  State/Province
                </label>
                <input
                  type="text"
                  placeholder="Enter state/province"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  ZIP/Postal Code
                </label>
                <input
                  type="text"
                  placeholder="Enter ZIP/postal code"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  value={formData.zip}
                  onChange={(e) => handleInputChange("zip", e.target.value)}
                />
              </div>
            </div>

            <div className="mb-4.5">
              <label className="mb-2.5 block text-black dark:text-white">
                Country
              </label>
              <input
                type="text"
                placeholder="Enter country"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                value={formData.country}
                onChange={(e) => handleInputChange("country", e.target.value)}
              />
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
                    Updating...
                  </div>
                ) : (
                  "Update Customer"
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push("/customers")}
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
