"use client";

import { useUser } from "@/components/Auth/user-context";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Company {
  _id: string;
  company_id: string;
  name: string;
  email: string;
  address: string;
  userCount: number;
  createdAt: string;
  isActive: boolean;
  industry: string;
  departments: string[];
}

export default function CompaniesPage() {
  const { user, hasPermission } = useUser();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    company_id: "",
    name: "",
    email: "",
    address: "",
    industry: "",
    departments: [] as string[],
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  // Fetch companies
  const fetchCompanies = async () => {
    const token = localStorage.getItem('token');
    console.log('🔐 Token found:', !!token);
    console.log('🔐 Token preview:', token ? `${token.substring(0, 20)}...` : 'No token');
    
    fetch('/api/companies', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      console.log('📡 Response status:', response.status);
      if (response.ok) {
        return response.json();
      } else {
        return response.json().then(errorData => {
          throw new Error(errorData.error || 'Unknown error');
        });
      }
    })
    .then(data => {
      console.log('✅ Companies fetched:', data);
      setCompanies(data);
    })
    .catch(error => {
      console.error('❌ Error fetching companies:', error);
      setMessage(`❌ Failed to fetch companies: ${error.message}`);
      setTimeout(() => setMessage(""), 5000);
    })
    .finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = selectedIndustry === "all" || company.industry === selectedIndustry;
    return matchesSearch && matchesIndustry;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const industries = [...new Set(companies.map(company => company.industry))];

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const token = localStorage.getItem('token');
      const url = editingCompany ? `/api/companies/${editingCompany._id}` : '/api/companies';
      const method = editingCompany ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage(editingCompany ? "✅ Company updated successfully!" : "✅ Company created successfully!");
        await fetchCompanies();
        setShowModal(false);
        setEditingCompany(null);
        setFormData({
          company_id: "",
          name: "",
          email: "",
          address: "",
          industry: "",
          departments: [],
          isActive: true
        });
      } else {
        setMessage("❌ Failed to save company");
      }
    } catch (error) {
      console.error('Error saving company:', error);
      setMessage("❌ Error saving company");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit company
  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      company_id: company.company_id,
      name: company.name,
      email: company.email,
      address: company.address,
      industry: company.industry,
      departments: company.departments,
      isActive: company.isActive
    });
    setShowModal(true);
  };

  // Handle delete company
  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!confirm(`Are you sure you want to delete ${companyName}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await fetchCompanies();
      } else {
        console.error('Failed to delete company');
      }
    } catch (error) {
      console.error('Error deleting company:', error);
    }
  };

  // Handle add company
  const handleAddCompany = () => {
    setEditingCompany(null);
    setFormData({
      company_id: "",
      name: "",
      email: "",
      address: "",
      industry: "",
      departments: [],
      isActive: true
    });
    setShowModal(true);
  };

  return (
    <PermissionGate permission="companies.read" fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-8xl mb-6">🏢</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            You don&apos;t have permission to view companies.
          </p>
        </div>
      </div>
    }>
      <div className="w-full min-w-0">
        <Breadcrumb pageName="Companies" />

        {/* Header Section */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 xl:p-8">
            <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6">
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent truncate">
                    Company Management
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm lg:text-base mt-1 truncate">
                    Manage companies and their information
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={fetchCompanies}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg sm:rounded-xl border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-center font-medium text-gray-700 hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-blue-400 disabled:opacity-50 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base"
                >
                  <svg className={`mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Refresh</span>
                  <span className="sm:hidden">↻</span>
                </button>
                <PermissionGate permission="companies.create">
                  <button 
                    onClick={handleAddCompany}
                    className="inline-flex items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-3 text-center font-medium text-white hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base"
                  >
                    <svg className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">Add Company</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                </PermissionGate>
              </div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className="mb-4 sm:mb-6">
            <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl ${
              message.includes("✅") 
                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200" 
                : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200"
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base">{message}</span>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col gap-2 sm:gap-3 lg:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search companies by name, email, or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 pl-8 sm:pl-10 lg:pl-12 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                  />
                  <svg className="absolute left-2 sm:left-3 lg:left-4 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="sm:w-48">
                <div className="relative">
                  <select
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                    className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 pr-6 sm:pr-8 lg:pr-10 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 appearance-none transition-all duration-300 text-xs sm:text-sm lg:text-base"
                  >
                    <option value="all">All Industries</option>
                    {industries.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                  <svg className="absolute right-1.5 sm:right-2 lg:right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Companies List */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4 lg:mb-6">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white">Companies</h2>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {filteredCompanies.length} compan{filteredCompanies.length !== 1 ? 'ies' : 'y'} found
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-6 sm:py-8 lg:py-12">
              <div className="text-center">
                <div className="inline-block h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
                <p className="mt-2 sm:mt-3 lg:mt-4 text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400">Loading companies...</p>
              </div>
            </div>
          ) : filteredCompanies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 xl:gap-6">
              {filteredCompanies.map((company) => (
                <div key={company._id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 hover:shadow-lg sm:hover:shadow-xl lg:hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] lg:hover:scale-105">
                  <div className="flex items-start justify-between mb-2 sm:mb-3 lg:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm lg:text-lg truncate">
                          {company.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                          {company.industry}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 flex-shrink-0">
                      <PermissionGate permission="companies.edit">
                        <button 
                          onClick={() => handleEditCompany(company)}
                          className="p-1 sm:p-1.5 lg:p-2 rounded-md sm:rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          title="Edit Company"
                        >
                          <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </PermissionGate>
                      <PermissionGate permission="companies.delete">
                        <button 
                          onClick={() => handleDeleteCompany(company._id, company.name)}
                          className="p-1 sm:p-1.5 lg:p-2 rounded-md sm:rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          title="Delete Company"
                        >
                          <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </PermissionGate>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 sm:space-y-2 lg:space-y-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                        {company.email}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                        {company.address}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {company.userCount} users
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        Joined {formatDate(company.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 sm:mt-4 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium ${
                        company.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {company.isActive ? "Active" : "Inactive"}
                    </span>
                    
                    <PermissionGate permission="users.read">
                      <button className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors">
                        View Users
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 lg:py-12">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 lg:mb-4">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">No companies found</h3>
              <p className="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400">
                {searchTerm ? "Try adjusting your search criteria." : "Get started by adding your first company."}
              </p>
            </div>
          )}
        </div>

        {/* Company Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
            <div className="w-full max-w-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/20 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">
                  {editingCompany ? "Edit Company" : "Add New Company"}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingCompany(null);
                    setFormData({
                      company_id: "",
                      name: "",
                      email: "",
                      address: "",
                      industry: "",
                      departments: [],
                      isActive: true
                    });
                  }}
                  className="p-1 sm:p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-3 sm:p-4 lg:p-6">
                <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      Company ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                      value={formData.company_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      Industry <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                      value={formData.industry}
                      onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                      rows={3}
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      Departments
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add department (comma separated)"
                        className="flex-1 rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                        value={formData.departments.join(", ")}
                        onChange={(e) => {
                          const departments = e.target.value.split(",").map(d => d.trim()).filter(d => d);
                          setFormData(prev => ({ ...prev, departments }));
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {formData.departments.map((dept, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-md"
                        >
                          {dept}
                          <button
                            type="button"
                            onClick={() => {
                              const newDepartments = formData.departments.filter((_, i) => i !== index);
                              setFormData(prev => ({ ...prev, departments: newDepartments }));
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 focus:ring-blue-500"
                        checked={formData.isActive}
                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      />
                      <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                        Active Company
                      </span>
                    </label>
                  </div>
                </div>

                {message && (
                  <div className={`mt-3 sm:mt-4 p-3 rounded-lg ${
                    message.includes("✅") 
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200" 
                      : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200"
                  }`}>
                    <span className="text-xs sm:text-sm">{message}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingCompany(null);
                      setFormData({
                        company_id: "",
                        name: "",
                        email: "",
                        address: "",
                        industry: "",
                        departments: [],
                        isActive: true
                      });
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 sm:py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-xs sm:text-sm lg:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 sm:flex-none px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md sm:rounded-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-xs sm:text-sm lg:text-base"
                  >
                    {submitting ? "Saving..." : editingCompany ? "Update Company" : "Create Company"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}