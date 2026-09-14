'use client';

import React, { useState, useEffect } from 'react';

interface Customer {
  _id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  address?: string;
  assignedManager?: {
    manager_id: {
      _id: string;
      user_id: string;
      assignedCategories: Array<{
        category: string;
        isActive: boolean;
      }>;
    };
    assignedBy: string;
    assignedAt: string;
    isActive: boolean;
  };
}

export default function CustomerProfile() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const fetchCustomerData = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch('/api/customers/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomer(data.customer);
        
        // Initialize edit form with current data
        if (data.customer) {
          setEditForm({
            companyName: data.customer.companyName || '',
            contactName: data.customer.contactName || '',
            email: data.customer.email || '',
            phone: data.customer.phone || '',
            address: data.customer.address || ''
          });
        }
        
        // Fetch current user to get avatarUrl
        const meResp = await fetch('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (meResp.ok) {
          const me = await meResp.json();
          setAvatarUrl(me.user?.avatarUrl || '');
        }
        setMessage('✅ Profile loaded successfully!');
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to load profile: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      setMessage('❌ Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAvatar = async () => {
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ avatarUrl }),
      });
      if (resp.ok) {
        setMessage('✅ Profile picture updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const err = await resp.json();
        setMessage(`❌ Failed to update picture: ${err.message || 'Unknown error'}`);
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (e) {
      setMessage('❌ Error updating profile picture');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form to original values
      setEditForm({
        companyName: customer?.companyName || '',
        contactName: customer?.contactName || '',
        email: customer?.email || '',
        phone: customer?.phone || '',
        address: customer?.address || ''
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = async () => {
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch('/api/customers/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      
      if (resp.ok) {
        setMessage('✅ Profile updated successfully!');
        setIsEditing(false);
        // Refresh customer data
        await fetchCustomerData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const err = await resp.json();
        setMessage(`❌ Failed to update profile: ${err.message || 'Unknown error'}`);
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (e) {
      setMessage('❌ Error updating profile');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Loading Profile</h2>
          <p className="text-gray-600 dark:text-gray-400">Fetching your profile information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header Section */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-white/30 dark:border-gray-700/50 sticky top-0 z-30">
        <div className="px-4 py-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              My Profile
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage your account information
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-2xl border-l-4 ${
            message.startsWith('✅') 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-400 text-green-800 dark:text-green-200' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-400 text-red-800 dark:text-red-200'
          }`}>
            <div className="flex items-center">
              <span className="text-lg mr-2">{message.startsWith('✅') ? '✅' : '❌'}</span>
              <span className="font-medium">{message.substring(2)}</span>
            </div>
          </div>
        )}

        {/* Profile Information */}
        {customer && (
          <div className="space-y-6">
            {/* Profile Picture Section */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/30 dark:border-gray-700/50 rounded-3xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border-4 border-white/30">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center">
                          <span className="text-3xl text-white">👤</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  </div>
                  
                  {/* Profile Info */}
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-2xl font-bold text-white mb-1">{customer.contactName}</h2>
                    <p className="text-white/80 mb-2">{customer.companyName}</p>
                    <p className="text-white/70 text-sm">{customer.email}</p>
                  </div>
                </div>
              </div>
              
              {/* Avatar Update Section */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Update Profile Picture</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="url"
                      placeholder="https://example.com/my-avatar.jpg"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full px-4 py-3 bg-white/90 dark:bg-gray-700/90 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                  <button
                    onClick={handleSaveAvatar}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl font-medium hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Save Picture
                  </button>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/30 dark:border-gray-700/50 rounded-3xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-6 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Company Information</h3>
                  <button
                    onClick={handleEditToggle}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                      isEditing 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Company Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.companyName}
                        onChange={(e) => setEditForm({...editForm, companyName: e.target.value})}
                        className="w-full px-4 py-3 bg-white/90 dark:bg-gray-700/90 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-lg text-gray-900 dark:text-white font-medium">{customer.companyName}</p>
                    )}
                  </div>

                  {/* Contact Person */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Contact Person</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.contactName}
                        onChange={(e) => setEditForm({...editForm, contactName: e.target.value})}
                        className="w-full px-4 py-3 bg-white/90 dark:bg-gray-700/90 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-lg text-gray-900 dark:text-white font-medium">{customer.contactName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                        className="w-full px-4 py-3 bg-white/90 dark:bg-gray-700/90 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-lg text-gray-900 dark:text-white font-medium">{customer.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Phone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                        className="w-full px-4 py-3 bg-white/90 dark:bg-gray-700/90 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-lg text-gray-900 dark:text-white font-medium">{customer.phone || 'Not provided'}</p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="mt-6 space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Address</label>
                  {isEditing ? (
                    <textarea
                      value={editForm.address}
                      onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/90 dark:bg-gray-700/90 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white resize-none"
                    />
                  ) : (
                    <p className="text-lg text-gray-900 dark:text-white font-medium">{customer.address || 'Not provided'}</p>
                  )}
                </div>

                {/* Save Button */}
                {isEditing && (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleSaveChanges}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Manager Assignment */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/30 dark:border-gray-700/50 rounded-3xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-6 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-2xl">👨‍💼</span>
                  Manager Assignment
                </h3>
              </div>
              
              <div className="p-6">
                {customer.assignedManager ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-lg">✅</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-green-800 dark:text-green-200">Assigned to Manager</h4>
                        <p className="text-sm text-green-600 dark:text-green-300">
                          Status: {customer.assignedManager.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
                        <p className="text-sm text-green-700 dark:text-green-300 font-medium">Assigned Date</p>
                        <p className="text-green-800 dark:text-green-200 font-semibold">
                          {new Date(customer.assignedManager.assignedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
                        <p className="text-sm text-green-700 dark:text-green-300 font-medium">Assignment Status</p>
                        <p className="text-green-800 dark:text-green-200 font-semibold">
                          {customer.assignedManager.isActive ? '🟢 Active' : '🔴 Inactive'}
                        </p>
                      </div>
                    </div>
                    
                    {customer.assignedManager.manager_id.assignedCategories.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-3">Manager Categories:</h5>
                        <div className="flex flex-wrap gap-2">
                          {customer.assignedManager.manager_id.assignedCategories.map((category, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-200"
                            >
                              {category.category}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-lg">⚠️</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">No Manager Assigned</h4>
                        <p className="text-sm text-yellow-600 dark:text-yellow-300">
                          You haven't been assigned to a manager yet
                        </p>
                      </div>
                    </div>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      Contact support for assistance with manager assignment.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}