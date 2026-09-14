"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import {
  PROCUREMENT_ACCESS_LEVELS,
  PROCUREMENT_AREAS,
  areasForAccessLevel,
  type ProcurementAccessLevel,
  type ProcurementArea,
} from "@/lib/procurementRoles";

export default function ProcurementSignupPage() {
  const [formData, setFormData] = useState({
    company_id: "RESSICHEM",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    signupKey: "",
    area: "local" as ProcurementArea,
    accessLevel: "user" as ProcurementAccessLevel,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const availableAreas = useMemo(
    () => areasForAccessLevel(formData.accessLevel),
    [formData.accessLevel]
  );

  const passwordMismatch = useMemo(() => {
    if (!formData.password || !formData.confirmPassword) return false;
    return formData.password !== formData.confirmPassword;
  }, [formData.password, formData.confirmPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "accessLevel") {
        const nextLevel = value as ProcurementAccessLevel;
        const nextAreas = areasForAccessLevel(nextLevel);
        if (!nextAreas.includes(prev.area) && nextAreas[0]) {
          updated.area = nextAreas[0];
        }
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

    setLoading(true);
    try {
      const payload: Record<string, string> = {
        company_id: formData.company_id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        accessLevel: formData.accessLevel,
      };
      if (formData.accessLevel !== "admin") {
        payload.area = formData.area;
      }
      if (formData.signupKey.trim()) {
        payload.signupKey = formData.signupKey.trim();
      }

      const response = await fetch("/api/procurement/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ type: "error", text: data?.message || "Procurement signup failed" });
        return;
      }

      setMessage({ type: "success", text: "Account created. You can now sign in." });
      setFormData((prev) => ({
        ...prev,
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        signupKey: "",
        area: "local",
        accessLevel: "user",
      }));
    } catch (err) {
      console.error("Procurement signup error:", err);
      setMessage({ type: "error", text: "Procurement signup failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border-2 border-gray-200 bg-white py-3 px-4 text-sm font-medium text-blue-900 placeholder:text-gray-500 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none hover:border-gray-300 dark:border-slate-600 dark:bg-slate-950 dark:text-blue-50 dark:placeholder:text-slate-400 dark:focus:border-blue-400 dark:focus:ring-blue-900/40 dark:hover:border-slate-500";

  const selectClass =
    "w-full rounded-xl border-2 border-gray-200 bg-white py-3 px-4 text-sm font-medium text-blue-900 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-slate-600 dark:bg-slate-950 dark:text-blue-50 dark:focus:border-blue-400 dark:focus:ring-blue-900/40";

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex items-center justify-center p-2 sm:p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-100 dark:opacity-10" />

      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob dark:opacity-5" />
      <div className="absolute top-40 right-10 z-0 w-72 h-72 bg-blue-300/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 dark:opacity-5" />
      <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000 dark:opacity-5" />

      <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none">
        <div className="relative w-[800px] h-[800px] max-w-[90vw] max-h-[90vh]">
          <Image
            src="/images/logo/logo.png"
            alt="Ressichem"
            fill
            className="object-contain opacity-[0.07] dark:opacity-[0.05]"
            priority
            quality={100}
            sizes="(max-width: 768px) 90vw, 800px"
          />
        </div>
      </div>

      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50">
        <ThemeToggleSwitch />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-sm shadow-2xl border border-blue-100 p-6 sm:p-8 dark:bg-slate-900 dark:border-slate-700 dark:shadow-black/40">
          <div className="flex justify-center mb-6">
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

          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-50 mb-2">
              Create Procurement Account
            </h2>
            <p className="text-sm text-blue-700 dark:text-blue-200">
              Choose your access level and procurement area
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                name="firstName"
                type="text"
                required
                placeholder="First name"
                value={formData.firstName}
                onChange={handleChange}
                className={inputClass}
              />
              <input
                name="lastName"
                type="text"
                required
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              className={inputClass}
            />

            <input
              name="phone"
              type="tel"
              placeholder="Phone (optional)"
              value={formData.phone}
              onChange={handleChange}
              className={inputClass}
            />

            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className={inputClass}
            />

            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={inputClass}
            />
            {passwordMismatch ? (
              <p className="text-xs font-medium text-red-600 dark:text-red-300">Passwords do not match</p>
            ) : null}

            <div>
              <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1.5 uppercase tracking-wide">
                Access level *
              </label>
              <select
                name="accessLevel"
                value={formData.accessLevel}
                onChange={handleChange}
                required
                className={selectClass}
              >
                {PROCUREMENT_ACCESS_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label} — {level.description}
                  </option>
                ))}
              </select>
            </div>

            {formData.accessLevel !== "admin" ? (
              <div>
                <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1.5 uppercase tracking-wide">
                  Procurement area *
                </label>
                <select
                  name="area"
                  value={availableAreas.includes(formData.area) ? formData.area : availableAreas[0]}
                  onChange={handleChange}
                  required
                  className={selectClass}
                >
                  {PROCUREMENT_AREAS.filter((item) => availableAreas.includes(item.value)).map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label} — {item.description}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Admin accounts have access to Local, Import, and Export.
              </p>
            )}

            <input
              name="signupKey"
              type="password"
              placeholder="Registration key (if required)"
              value={formData.signupKey}
              onChange={handleChange}
              className={inputClass}
            />

            {message ? (
              <div
                className={`rounded-xl border-2 p-4 ${
                  message.type === "success"
                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                    : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 animate-shake"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    message.type === "success"
                      ? "text-green-800 dark:text-green-200"
                      : "text-red-800 dark:text-red-200"
                  }`}
                >
                  {message.text}
                </p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || passwordMismatch}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 p-4 text-sm font-semibold text-white shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>

            <div className="text-center space-y-2 text-xs text-blue-800 dark:text-blue-200 pt-1">
              <div>
                Already have an account?{" "}
                <Link
                  href="/procurement/login"
                  className="font-semibold text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-100 hover:underline transition-colors"
                >
                  Sign in
                </Link>
              </div>
              <div>
                <Link
                  href="/auth/sign-in"
                  className="font-semibold text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-100 hover:underline transition-colors"
                >
                  Back to main sign in
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%,
          100% {
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
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-5px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(5px);
          }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  );
}
