"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";

const inputClass =
  "w-full rounded-xl border-2 border-gray-200 bg-white px-5 py-4 text-sm font-medium text-blue-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-950 dark:text-blue-50";

export default function ProductionSignupPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "operator",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      setMessage("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/production/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: "RESSICHEM",
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data?.message || "Could not create the account");
        return;
      }
      setCreated(true);
    } catch {
      setMessage("Could not create the account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-100 p-4 dark:bg-slate-950">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggleSwitch />
      </div>
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-blue-100 bg-white/90 p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-6 flex justify-center">
          <Image src="/images/logo/logo.png" alt="Ressichem" width={200} height={48} className="h-12 w-auto object-contain" priority />
        </div>
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-bold text-blue-900 dark:text-blue-50">Create Production Account</h2>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-blue-800 dark:text-blue-200">
            <span className="rounded-full bg-blue-100 px-3 py-1 font-medium dark:border dark:border-slate-600 dark:bg-slate-800">Reactor Area</span>
            <span className="rounded-full bg-blue-100 px-3 py-1 font-medium dark:border dark:border-slate-600 dark:bg-slate-800">LMS</span>
            <span className="rounded-full bg-blue-100 px-3 py-1 font-medium dark:border dark:border-slate-600 dark:bg-slate-800">BFS</span>
          </div>
        </div>
        {created ? (
          <div className="space-y-4 text-center">
            <p className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
              Account created. Sign in with this email and password.
            </p>
            <Link href="/production/login" className="block w-full rounded-xl bg-blue-600 p-4 text-sm font-semibold text-white">
              Go to Production Site login
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              name="firstName"
              required
              autoComplete="given-name"
              placeholder="First name"
              className={inputClass}
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <input
              name="lastName"
              autoComplete="family-name"
              placeholder="Last name"
              className={inputClass}
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
            <label className="block text-sm font-semibold text-blue-900 dark:text-blue-50">
              Role
              <select
                name="role"
                required
                className={`${inputClass} mt-1`}
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="admin">Overall Admin</option>
                <option value="manager">Manager</option>
                <option value="operator">Operator</option>
              </select>
              <span className="mt-1 block text-xs font-medium text-blue-700 dark:text-blue-200">
                {formData.role === "admin"
                  ? "Overall Admin can open Reactor Area, LMS, Drymix, and BFS."
                  : formData.role === "manager"
                    ? "Manager can open Reactor Area, LMS, and BFS."
                    : "Operator can open Reactor Area, LMS, and BFS."}
              </span>
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Email address"
              className={inputClass}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Password (at least 8 characters)"
              className={inputClass}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Confirm password"
              className={inputClass}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
            {message ? <p className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{message}</p> : null}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 p-4 text-sm font-semibold text-white disabled:opacity-50">
              {loading ? "Creating account..." : "Create account"}
            </button>
            <p className="text-center text-sm text-blue-800 dark:text-blue-200">
              <Link href="/production/login" className="font-semibold text-blue-600 hover:underline">
                Already have an account? Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
