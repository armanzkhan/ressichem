"use client";

import { useUser } from "@/components/Auth/user-context";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState("");
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  const getDisplayUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith('/uploads')) return `${backendUrl}${url}`;
    return url;
  };
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    // Redirect customers to orders/create page
    if (!loading && user) {
      const userType = localStorage.getItem('userType');
      const userRole = localStorage.getItem('userRole');
      
      if (user.isCustomer || user.role === 'customer' || userType === 'customer' || userRole === 'customer') {
        console.log('👤 Customer user on profile page, redirecting to orders/create');
        router.push('/orders/create');
        return;
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const resp = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
        if (resp.ok) {
          const data = await resp.json();
          setAvatarUrl(data.user?.avatarUrl || "");
        }
      } catch {}
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <Breadcrumb pageName="Profile" />

      {/* Profile Header */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20 p-3 sm:p-4 lg:p-6 xl:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            <div className="flex-shrink-0">
              {avatarUrl ? (
                <img 
                  src={getDisplayUrl(avatarUrl)} 
                  alt="Avatar" 
                  className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full object-cover border-2 border-white/20 dark:border-gray-700/20 shadow-lg" 
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent truncate">
                {user?.email}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg mt-1 truncate">
                {user?.department} • {user?.company_id}
              </p>
              {user?.isSuperAdmin && (
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 text-xs sm:text-sm font-medium text-white shadow-lg mt-2">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipRule="evenodd" />
                  </svg>
                  Super Administrator
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Avatar Editor */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20">
          <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 border-b border-white/20 dark:border-gray-700/20">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white">Profile Picture</h3>
            </div>
          </div>
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div className="flex-shrink-0">
                {avatarUrl ? (
                  <img src={getDisplayUrl(avatarUrl)} alt="Avatar" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white/20 dark:border-gray-700/20 shadow-lg" />
                ) : (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <div className="text-lg sm:text-xl font-bold text-white">{user?.email?.charAt(0).toUpperCase()}</div>
                  </div>
                )}
              </div>
              <div className="flex-1 w-full min-w-0 space-y-2 sm:space-y-3">
                <input
                  type="url"
                  placeholder="https://example.com/my-avatar.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full rounded-md sm:rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-purple-400 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                />
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs sm:text-sm text-gray-900 border border-gray-300 rounded-md sm:rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 px-3 py-2 sm:px-4 sm:py-3"
                  />
                  <button
                    disabled={saving || !file}
                    onClick={async () => {
                      if (!file) return;
                      try {
                        setSaving(true);
                        const token = localStorage.getItem('token');
                        const fd = new FormData();
                        fd.append('avatar', file);
                        const resp = await fetch('/api/users/me/avatar', {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}` },
                          body: fd,
                        });
                        const data = await resp.json();
                        if (resp.ok) {
                          setAvatarUrl(data.avatarUrl);
                          setMessage('✅ Avatar uploaded');
                        } else {
                          setMessage(`❌ Failed: ${data.message || 'Unknown error'}`);
                        }
                      } catch {
                        setMessage('❌ Failed to upload');
                      } finally {
                        setSaving(false);
                        setTimeout(() => setMessage(''), 3000);
                      }
                    }}
                    className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-md sm:rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:bg-gray-400 transition-all duration-300 hover:shadow-lg"
                  >
                    {saving ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
                <button
                  disabled={saving}
                  onClick={async () => {
                    try {
                      setSaving(true);
                      const token = localStorage.getItem('token');
                      const resp = await fetch('/api/users/me', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ avatarUrl }),
                      });
                      if (resp.ok) {
                        setMessage('✅ Profile picture updated');
                      } else {
                        const err = await resp.json();
                        setMessage(`❌ Failed: ${err.message || 'Unknown error'}`);
                      }
                    } catch {
                      setMessage('❌ Failed to update');
                    } finally {
                      setSaving(false);
                      setTimeout(() => setMessage(''), 3000);
                    }
                  }}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-md sm:rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:bg-gray-400 transition-all duration-300 hover:shadow-lg"
                >
                  {saving ? 'Saving...' : 'Save URL'}
                </button>
              </div>
            </div>
            {message && (
              <div className={`mt-3 p-2 sm:p-3 rounded-md text-xs sm:text-sm ${
                message.includes('✅') 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
        {/* Basic Information */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20">
          <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 border-b border-white/20 dark:border-gray-700/20">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
            </div>
          </div>
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white/50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">
                  Email Address
                </label>
                <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">{user?.email}</p>
              </div>
              <div className="bg-white/50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">
                  Department
                </label>
                <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">{user?.department}</p>
              </div>
              <div className="bg-white/50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">
                  Company ID
                </label>
                <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">{user?.company_id}</p>
              </div>
              <div className="bg-white/50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">
                  User ID
                </label>
                <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">{user?.user_id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Roles and Permissions */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20">
          <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 border-b border-white/20 dark:border-gray-700/20">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white">Roles & Permissions</h3>
            </div>
          </div>
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
                  Assigned Roles
                </label>
                {user?.roles && user.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {user.roles.map((role, index) => (
                      <span key={`role-${index}-${role}`} className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium text-white shadow-lg">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipRule="evenodd" />
                        </svg>
                        {role}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">No roles assigned</p>
                )}
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
                  Key Permissions
                </label>
                {user?.permissions && user.permissions.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {user.permissions.slice(0, 5).map((permission, index) => (
                      <div key={`permission-${index}-${permission}`} className="flex items-center gap-2 sm:gap-3 bg-white/50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-2 sm:p-3">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                          <svg className="w-2 h-2 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">{permission}</span>
                      </div>
                    ))}
                    {user.permissions.length > 5 && (
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-white/30 dark:bg-gray-700/30 rounded-lg sm:rounded-xl p-2 sm:p-3">
                        +{user.permissions.length - 5} more permissions
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">No permissions assigned</p>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>

      {/* Account Actions */}
      <div className="mt-4 sm:mt-6 lg:mt-8">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/20 dark:border-gray-700/20">
          <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 border-b border-white/20 dark:border-gray-700/20">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white">Account Actions</h3>
            </div>
          </div>
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <button className="flex items-center justify-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-3 py-2 sm:px-4 sm:py-3 text-white hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="hidden sm:inline">Edit Profile</span>
                <span className="sm:hidden">Edit</span>
              </button>
              <button className="flex items-center justify-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-gray-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-gray-500 dark:hover:bg-gray-600 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="hidden sm:inline">Change Password</span>
                <span className="sm:hidden">Password</span>
              </button>
              <button className="flex items-center justify-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-red-300 bg-white px-3 py-2 sm:px-4 sm:py-3 text-red-600 hover:border-red-400 hover:bg-red-50 dark:border-red-600 dark:bg-red-900/20 dark:text-red-400 dark:hover:border-red-500 dark:hover:bg-red-900/30 transition-all duration-300 hover:shadow-lg text-xs sm:text-sm lg:text-base">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}