"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import Image from "next/image";

export default function QCSiteSignupPage() {
  const [formData, setFormData] = useState({
    company_id: "RESSICHEM",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "QC Analyst", // Default role per SRS
    layer: "", // Three-layer model for R&D Chemist
    layerRole: "", // Specific role within layer
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const passwordMismatch = useMemo(() => {
    if (!formData.password || !formData.confirmPassword) return false;
    return formData.password !== formData.confirmPassword;
  }, [formData.password, formData.confirmPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Reset layerRole when layer changes
      if (name === "layer") {
        updated.layerRole = "";
      }
      // Auto-set layer for R&D Chemist role
      if (name === "role" && value === "R&D Chemist") {
        updated.layer = "R&D";
        updated.layerRole = "R&D_CHEMIST";
      }
      // Auto-set layer for Directors/Managers
      if (name === "role" && (value === "QC Manager" || value === "QC Admin")) {
        updated.layer = "MANAGEMENT";
        updated.layerRole = "PLANT_HEAD";
      }
      // Auto-set layer for QC Analyst
      if (name === "role" && value === "QC Analyst") {
        updated.layer = "QC";
        updated.layerRole = "QC_LAB_TECHNICIAN";
      }
      // Viewer doesn't need layer
      if (name === "role" && value === "QC Viewer") {
        updated.layer = "";
        updated.layerRole = "";
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }
    if (formData.role !== "QC Viewer" && (!formData.layer || !formData.layerRole)) {
      setMessage({ type: "error", text: "Please select both Layer and Role within Layer (SRS 2.3 requirement)" });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        company_id: formData.company_id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        layer: formData.layer || undefined,
        layerRole: formData.layerRole || undefined,
      };

      const response = await fetch("/api/qc/auth/site-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ type: "error", text: data?.message || "QC Site signup failed" });
        return;
      }

      setMessage({ type: "success", text: "Account created. You can now login to QC Site." });
      setFormData((prev) => ({
        ...prev,
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "QC Analyst",
        layer: "",
        layerRole: "",
      }));
    } catch (err) {
      console.error("QC Site signup error:", err);
      setMessage({ type: "error", text: "QC Site signup failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-2 sm:p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] dark:opacity-20"></div>
      
      {/* Blue gradient orbs - subtle */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob dark:opacity-5"></div>
      <div className="absolute top-40 right-10 w-72 h-72 bg-blue-300/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 dark:opacity-5"></div>
      <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000 dark:opacity-5"></div>

      {/* Ressichem Logo Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 dark:opacity-[0.03] pointer-events-none">
        <div className="relative w-[800px] h-[800px] max-w-[90vw] max-h-[90vh]">
          <Image
            src="/images/logo/logo.png"
            alt="Ressichem"
            fill
            className="object-contain"
            priority
            quality={100}
          />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50">
        <ThemeToggleSwitch />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Main card with glassmorphism */}
        <div className="rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-sm shadow-2xl border border-white/20 dark:bg-gray-800/80 dark:border-gray-700/20 p-6 sm:p-8 relative overflow-hidden">
          {/* Decorative blue gradient overlay */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-400/10 to-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          {/* Logo at Top */}
          <div className="flex justify-center mb-6 relative z-10">
            <div className="relative h-12 w-auto">
              <Image
                src="/images/logo/logo.png"
                alt="Ressichem"
                width={200}
                height={35}
                className="h-12 w-auto object-contain"
                priority
              />
            </div>
          </div>
          
          {/* Header section */}
          <div className="text-center mb-6 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-300 mb-2">
              QC Site Area
            </h2>
            <p className="text-sm text-blue-900 dark:text-blue-300">Create your account to access Quality Control modules</p>
          </div>

          <form className="space-y-3 relative z-10" onSubmit={handleSubmit}>
            {/* Company ID - Read Only */}
            <div>
              <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1.5 uppercase tracking-wide">
                Company Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <input
                  name="company_id"
                  type="text"
                  readOnly
                  className="w-full rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 py-2 pl-10 pr-20 text-sm font-semibold text-blue-900 dark:text-blue-300 cursor-not-allowed"
                  value={formData.company_id}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-300 text-xs font-semibold">
                    Read Only
                  </span>
                </div>
              </div>
            </div>
            {/* Name fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1.5 uppercase tracking-wide">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    name="firstName"
                    type="text"
                    className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-700/80 py-2 pl-10 pr-4 text-sm font-medium text-blue-900 dark:text-blue-300 placeholder-gray-400 hover:border-blue-900 dark:hover:border-blue-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1.5 uppercase tracking-wide">
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    name="lastName"
                    type="text"
                    className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-700/80 py-2 pl-10 pr-4 text-sm font-medium text-blue-900 dark:text-blue-300 placeholder-gray-400 hover:border-blue-900 dark:hover:border-blue-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1.5 uppercase tracking-wide">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-700/80 py-2 pl-10 pr-4 text-sm font-medium text-blue-900 dark:text-blue-300 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
                Select Your Role * (SRS Section 2.2)
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 py-3 px-4 text-sm font-medium text-blue-900 dark:text-blue-300 hover:border-blue-900 dark:hover:border-blue-700 transition-all"
              >
                <option value="QC Analyst">QC Analyst - QC data input, batch testing (SRS 2.2)</option>
                <option value="R&D Chemist">R&D Chemist - Input and analyze all R&D data (SRS 2.2)</option>
                <option value="QC Manager">Directors/Managers - Full access (SRS 2.2)</option>
                <option value="QC Admin">QC Admin - Full administrative access (SRS 2.2)</option>
                <option value="QC Viewer">Viewer - Read-only dashboards (SRS 2.2)</option>
              </select>
              <p className="text-xs text-blue-900 dark:text-blue-300 mt-1">
                Your role determines access to QC Site Area modules (Resin QC, Hardener QC, LMS QC, QA, R&D Trials, etc.)
              </p>
            </div>
            {/* Layer Selection */}
            <div>
              <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1.5 uppercase tracking-wide">
                Select Your Layer {formData.role !== "QC Viewer" ? "*" : ""} <span className="text-blue-600 dark:text-blue-400">(SRS 2.3)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                  </svg>
                </div>
                <select
                  name="layer"
                  value={formData.layer}
                  onChange={handleChange}
                  className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-700/80 py-2 pl-10 pr-8 text-sm font-medium text-blue-900 dark:text-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select Layer...</option>
                  <option value="QC">Layer 1: QC (Execution & Compliance)</option>
                  <option value="R&D">Layer 2: R&D (Innovation & Development)</option>
                  <option value="MANAGEMENT">Layer 3: Management (Governance & Approval)</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {formData.layer && (
              <div>
                <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1.5 uppercase tracking-wide">
                  Select Your Role Within Layer {formData.role !== "QC Viewer" ? "*" : ""}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <select
                    name="layerRole"
                    value={formData.layerRole}
                    onChange={handleChange}
                    className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-700/80 py-2 pl-10 pr-8 text-sm font-medium text-blue-900 dark:text-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select Role...</option>
                    {formData.layer === "QC" && (
                      <>
                        <option value="QC_LAB_TECHNICIAN">🔬 QC Lab Technician</option>
                        <option value="QC_SUPERVISOR">👨‍💼 QC Supervisor</option>
                      </>
                    )}
                    {formData.layer === "R&D" && (
                      <>
                        <option value="R&D_CHEMIST">⚗️ R&D Chemist</option>
                        <option value="SENIOR_R&D_SCIENTIST">🧪 Senior R&D Scientist</option>
                      </>
                    )}
                    {formData.layer === "MANAGEMENT" && (
                      <>
                        <option value="TECHNICAL_MANAGER_RND">🔧 Technical Manager (R&D)</option>
                        <option value="PLANT_HEAD">🏭 Plant Head</option>
                        <option value="CEO">👔 CEO</option>
                        <option value="DIRECTOR">🎯 Director</option>
                      </>
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
            {/* Role-specific info cards */}
            {formData.role === "R&D Chemist" && (
              <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">R&D Chemist: Access to R&D data only (no QC data)</p>
              </div>
            )}
            {formData.role === "QC Manager" && (
              <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">Full Access: All QC Site Area modules + approvals</p>
              </div>
            )}
            {formData.role === "QC Admin" && (
              <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">Full Administrative Access: All QC Site Area modules + approvals + admin controls</p>
              </div>
            )}
            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1.5 uppercase tracking-wide">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-700/80 py-2 pl-10 pr-4 text-sm font-medium text-blue-900 dark:text-blue-300 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1.5 uppercase tracking-wide">
                Confirm Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className={`w-full rounded-lg border-2 bg-white/80 dark:bg-gray-700/80 py-2 pl-10 pr-4 text-sm font-medium text-blue-900 dark:text-blue-300 placeholder-gray-400 focus:ring-2 transition-all ${
                    passwordMismatch
                      ? "border-red-300 dark:border-red-700 hover:border-red-500 dark:hover:border-red-600 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-800"
                      : "border-gray-200 dark:border-gray-600 hover:border-blue-900 dark:hover:border-blue-700 focus:border-blue-500 focus:ring-blue-200 dark:focus:ring-blue-800"
                  }`}
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                {passwordMismatch && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
              </div>
              {passwordMismatch && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Message Alert */}
            {message && (
              <div
                className={`rounded-lg border p-3 flex items-start gap-2 shadow-md ${
                  message.type === "success"
                    ? "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 dark:border-blue-800"
                    : "bg-gradient-to-r from-red-50 to-rose-50 border-red-200 dark:from-red-900/30 dark:to-rose-900/30 dark:border-red-800"
                }`}
              >
                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                  message.type === "success" ? "bg-blue-500" : "bg-red-500"
                }`}>
                  {message.type === "success" ? (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <p
                  className={`text-xs font-semibold flex-1 ${
                    message.type === "success" ? "text-blue-800 dark:text-blue-200" : "text-red-800 dark:text-red-200"
                  }`}
                >
                  {message.text}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-2.5 text-sm font-bold text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Create Account
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>

            {/* Login Link */}
            <div className="text-center pt-1">
              <p className="text-xs text-blue-900 dark:text-blue-300">
                Already have an account?{" "}
                <Link 
                  href="/qc/site-login" 
                  className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors inline-flex items-center gap-1"
                >
                  Sign in
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


