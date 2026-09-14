"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { PersonalInfoForm } from "./_components/personal-info";
import { UploadPhotoForm } from "./_components/upload-photo";
import { useUser } from "@/components/Auth/user-context";
import { useState } from "react";

export default function SettingsPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("personal");

  // Allow super admin, company admin, managers, and customers always; otherwise require "edit_settings" permission
  if (!user?.isSuperAdmin && !user?.isCompanyAdmin && !user?.isManager && !user?.isCustomer && !user?.permissions?.includes("edit_settings")) {
    return (
      <div className="w-full min-w-0">
        <Breadcrumb pageName="Settings" />
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20 p-6 sm:p-8 lg:p-12 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-red-500 dark:text-red-400 text-sm sm:text-base">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <Breadcrumb pageName="Settings" />

      {/* Header Section */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 xl:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-blue-900 flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-blue-900 dark:text-white">
                Account Settings
              </h1>
              <p className="text-blue-700 dark:text-blue-300 text-sm sm:text-base lg:text-lg mt-1">
                Manage your personal information and account preferences.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl border border-white/20 dark:border-gray-700/20 p-1 sm:p-2">
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab("personal")}
              className={`flex items-center justify-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 rounded-md sm:rounded-lg transition-all duration-300 text-sm sm:text-base font-medium ${
                activeTab === "personal"
                  ? "bg-blue-900 text-white shadow-lg"
                  : "text-gray-600 dark:text-gray-400 hover:text-blue-900 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="hidden sm:inline">Personal Info</span>
              <span className="sm:hidden">Info</span>
            </button>
            <button
              onClick={() => setActiveTab("photo")}
              className={`flex items-center justify-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 rounded-md sm:rounded-lg transition-all duration-300 text-sm sm:text-base font-medium ${
                activeTab === "photo"
                  ? "bg-blue-900 text-white shadow-lg"
                  : "text-gray-600 dark:text-gray-400 hover:text-blue-900 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Profile Photo</span>
              <span className="sm:hidden">Photo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {activeTab === "personal" && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20 overflow-hidden">
            <PersonalInfoForm />
          </div>
        )}
        
        {activeTab === "photo" && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20 overflow-hidden">
            <UploadPhotoForm />
          </div>
        )}
      </div>
    </div>
  );
}