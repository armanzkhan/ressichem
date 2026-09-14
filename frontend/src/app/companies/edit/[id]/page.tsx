"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";

interface Company {
  _id: string;
  company_id: string;
  name: string;
  email: string;
  address: string;
  industry: string;
  departments: string[];
  userCount: number;
  createdAt: string;
  isActive: boolean;
}

export default function EditCompany() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;

  const [formData, setFormData] = useState({
    company_id: "",
    name: "",
    email: "",
    address: "",
    industry: "",
    departments: [] as string[],
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState<Company | null>(null);
  const [newDepartment, setNewDepartment] = useState("");

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/companies/${companyId}`);
        if (response.ok) {
          const companyData = await response.json();
          setCompany(companyData);
          setFormData({
            company_id: companyData.company_id || "",
            name: companyData.name || "",
            email: companyData.email || "",
            address: companyData.address || "",
            industry: companyData.industry || "",
            departments: companyData.departments || [],
            isActive: companyData.isActive !== undefined ? companyData.isActive : true
          });
        } else {
          setMessage("Failed to load company data");
        }
      } catch (error) {
        console.error("Error fetching company:", error);
        setMessage("Error loading company data");
      }
    };

    if (companyId) {
      fetchCompany();
    }
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage("Company updated successfully!");
        setTimeout(() => {
          router.push("/companies");
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || "Failed to update company");
      }
    } catch (error) {
      console.error("Error updating company:", error);
      setMessage("Error updating company");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addDepartment = () => {
    if (newDepartment.trim() && !formData.departments.includes(newDepartment.trim())) {
      setFormData(prev => ({
        ...prev,
        departments: [...prev.departments, newDepartment.trim()]
      }));
      setNewDepartment("");
    }
  };

  const removeDepartment = (department: string) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.filter(d => d !== department)
    }));
  };

  if (!company) {
    return (
      <ProtectedRoute requiredPermission="companies.read">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredPermission="companies.update">
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">
            Edit Company
          </h2>
          <nav>
            <ol className="flex items-center gap-2">
              <li>
                <a className="font-medium" href="/companies">
                  Companies
                </a>
              </li>
              <li className="font-medium text-primary">/ Edit Company</li>
            </ol>
          </nav>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              Company Information
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6.5">
            <div className="mb-4.5 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  Company ID <span className="text-meta-1">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter company ID"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  value={formData.company_id}
                  onChange={(e) => handleInputChange("company_id", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  Company Name <span className="text-meta-1">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter company name"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
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
                  Industry
                </label>
                <input
                  type="text"
                  placeholder="Enter industry"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  value={formData.industry}
                  onChange={(e) => handleInputChange("industry", e.target.value)}
                />
              </div>
            </div>

            <div className="mb-4.5">
              <label className="mb-2.5 block text-black dark:text-white">
                Address <span className="text-meta-1">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Enter company address"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                required
              />
            </div>

            <div className="mb-4.5">
              <label className="mb-2.5 block text-black dark:text-white">
                Departments
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Enter department name"
                  className="flex-1 rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDepartment())}
                />
                <button
                  type="button"
                  onClick={addDepartment}
                  className="rounded bg-primary px-4 py-3 font-medium text-white hover:bg-opacity-90"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.departments.map((dept, index) => (
                  <span
                    key={`company-${index}-${company.name}`}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                  >
                    {dept}
                    <button
                      type="button"
                      onClick={() => removeDepartment(dept)}
                      className="ml-1 text-primary hover:text-primary/70"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-4.5">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-[1.5px] border-stroke"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange("isActive", e.target.checked)}
                />
                <span className="text-black dark:text-white">Active Company</span>
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
                  "Update Company"
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push("/companies")}
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
