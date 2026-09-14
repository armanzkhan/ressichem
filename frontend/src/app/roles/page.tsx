"use client";

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Role {
  _id: string;
  name: string;
  description: string;
  company_id: string;
  permissionGroups: string[];
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  _id: string;
  key: string;
  description: string;
  company_id: string;
  group?: string;
}

interface PermissionGroup {
  _id: string;
  name: string;
  company_id: string;
  permissions: string[];
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
    permissionGroups: [] as string[],
    isActive: true
  });

  // Fetch roles and permissions
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const [rolesRes, permissionsRes, permissionGroupsRes] = await Promise.all([
        fetch('/api/roles', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/permissions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/permission-groups', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData);
      }

      if (permissionsRes.ok) {
        const permissionsData = await permissionsRes.json();
        setPermissions(permissionsData);
      }

      if (permissionGroupsRes.ok) {
        const permissionGroupsData = await permissionGroupsRes.json();
        setPermissionGroups(permissionGroupsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Create new role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newRole)
      });

      if (response.ok) {
        setMessage("✅ Role created successfully!");
        setNewRole({ name: "", description: "", permissions: [], permissionGroups: [], isActive: true });
        setShowCreateForm(false);
        fetchData();
      } else {
        const error = await response.json();
        setMessage(`❌ Error: ${error.message}`);
      }
    } catch (error) {
      setMessage("❌ Error creating role");
    }
  };

  // Update role
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/roles/${editingRole._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingRole)
      });

      if (response.ok) {
        setMessage("✅ Role updated successfully!");
        setShowEditForm(false);
        setEditingRole(null);
        fetchData();
      } else {
        const error = await response.json();
        setMessage(`❌ Error: ${error.message}`);
      }
    } catch (error) {
      setMessage("❌ Error updating role");
    }
  };

  // Delete role
  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMessage("✅ Role deleted successfully!");
        fetchData();
      } else {
        const error = await response.json();
        setMessage(`❌ Error: ${error.message}`);
      }
    } catch (error) {
      setMessage("❌ Error deleting role");
    }
  };

  // Filter roles
  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="w-full min-w-0 max-w-full overflow-x-hidden">
        <Breadcrumb pageName="Roles Management" />

        {/* Header */}
        <div className="mb-3 sm:mb-4 lg:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 lg:gap-4">
            <div>
              <p className="text-xs sm:text-sm lg:text-base text-blue-700 dark:text-blue-300">
                Manage user roles and their permissions
              </p>
            </div>
            <PermissionGate permission="roles.create">
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-lg sm:rounded-xl text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Create Role</span>
                <span className="sm:hidden">Add</span>
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.includes('✅') 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Create Role Form */}
        {showCreateForm && (
          <div className="mb-4 sm:mb-6">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-white">Create New Role</h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
              </div>

              <form onSubmit={handleCreateRole} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newRole.name}
                      onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Sales Manager"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description *
                    </label>
                    <input
                      type="text"
                      required
                      value={newRole.description}
                      onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Role description"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={newRole.isActive}
                    onChange={(e) => setNewRole({...newRole, isActive: e.target.checked})}
                    className="h-4 w-4 text-blue-900 focus:ring-blue-900 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Active role
                  </label>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Permission Groups
                    </label>
                    <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                      {permissionGroups.map((group) => (
                        <label key={group._id} className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600">
                          <input
                            type="checkbox"
                            checked={newRole.permissionGroups.includes(group._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewRole({
                                  ...newRole,
                                  permissionGroups: [...newRole.permissionGroups, group._id]
                                });
                              } else {
                                setNewRole({
                                  ...newRole,
                                  permissionGroups: newRole.permissionGroups.filter(p => p !== group._id)
                                });
                              }
                            }}
                            className="mr-3 text-blue-900 focus:ring-blue-900"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {group.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {group.permissions.length} permissions
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Individual Permissions
                    </label>
                    <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                      {permissions.map((permission) => (
                        <label key={permission._id} className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600">
                          <input
                            type="checkbox"
                            checked={newRole.permissions.includes(permission._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewRole({
                                  ...newRole,
                                  permissions: [...newRole.permissions, permission._id]
                                });
                              } else {
                                setNewRole({
                                  ...newRole,
                                  permissions: newRole.permissions.filter(p => p !== permission._id)
                                });
                              }
                            }}
                            className="mr-3 text-blue-900 focus:ring-blue-900"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {permission.key}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {permission.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg transition-colors"
                  >
                    Create Role
                  </button>
              </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Role Form */}
        {showEditForm && editingRole && (
          <div className="mb-4 sm:mb-6">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-white">Edit Role</h3>
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingRole(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
              </div>
              
              <form onSubmit={handleUpdateRole} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingRole.name}
                      onChange={(e) => setEditingRole({...editingRole, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingRole.description}
                      onChange={(e) => setEditingRole({...editingRole, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={editingRole.isActive}
                    onChange={(e) => setEditingRole({...editingRole, isActive: e.target.checked})}
                    className="h-4 w-4 text-blue-900 focus:ring-blue-900 border-gray-300 rounded"
                  />
                  <label htmlFor="editIsActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Active role
                  </label>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Permission Groups
                    </label>
                    <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                      {permissionGroups.map((group) => (
                        <label key={group._id} className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600">
                          <input
                            type="checkbox"
                            checked={editingRole.permissionGroups.includes(group._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingRole({
                                  ...editingRole,
                                  permissionGroups: [...editingRole.permissionGroups, group._id]
                                });
                              } else {
                                setEditingRole({
                                  ...editingRole,
                                  permissionGroups: editingRole.permissionGroups.filter(p => p !== group._id)
                                });
                              }
                            }}
                            className="mr-3 text-blue-900 focus:ring-blue-900"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {group.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {group.permissions.length} permissions
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Individual Permissions
                    </label>
                    <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                      {permissions.map((permission) => (
                        <label key={permission._id} className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600">
                          <input
                            type="checkbox"
                            checked={editingRole.permissions.includes(permission._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingRole({
                                  ...editingRole,
                                  permissions: [...editingRole.permissions, permission._id]
                                });
                              } else {
                                setEditingRole({
                                  ...editingRole,
                                  permissions: editingRole.permissions.filter(p => p !== permission._id)
                                });
                              }
                            }}
                            className="mr-3 text-blue-900 focus:ring-blue-900"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {permission.key}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {permission.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingRole(null);
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg transition-colors"
                  >
                    Update Role
                  </button>
              </div>
              </form>
            </div>
          </div>
        )}

          {/* Search */}
        <div className="mb-4 sm:mb-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-md border border-white/20 dark:border-gray-700/20 p-3 sm:p-4">
              <div className="relative">
                <input
                  type="text"
                placeholder="Search roles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

        {/* Roles List */}
            <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-blue-900 dark:text-white">Roles</h2>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {filteredRoles.length} role{filteredRoles.length !== 1 ? 's' : ''} found
              </div>
            </div>
            
            {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredRoles.length > 0 ? (
                  filteredRoles.map((role) => (
                  <div key={role._id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-white/20 dark:border-gray-700/20 p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-blue-900 dark:text-white text-lg truncate">
                              {role.name}
                            </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {role.description}
                            </p>
                          </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          role.isActive 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {role.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                        </div>
                        
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Permission Groups</span>
                        <span className="text-sm text-gray-900 dark:text-white">{role.permissionGroups.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Individual Permissions</span>
                        <span className="text-sm text-gray-900 dark:text-white">{role.permissions.length}</span>
                      </div>
                    </div>
                      
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <PermissionGate permission="roles.update">
                            <button
                              onClick={() => {
                                setEditingRole(role);
                                setShowEditForm(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                            >
                              Edit
                            </button>
                          </PermissionGate>
                          <PermissionGate permission="roles.delete">
                            <button
                              onClick={() => handleDeleteRole(role._id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                            >
                              Delete
                            </button>
                          </PermissionGate>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(role.createdAt).toLocaleDateString()}
                            </span>
                      </div>
                      </div>
                    </div>
                  ))
                ) : (
                <div className="col-span-full text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-white mb-2">No roles found</h3>
                  <p className="text-gray-500 dark:text-gray-400">Try adjusting your search criteria.</p>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </ProtectedRoute>
  );
}