import { useState, useEffect, useCallback, Fragment } from 'react';
import { Search, Filter, Trash2, Shield, Users, Clock, ChevronDown, ChevronUp, X, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface User {
  id: string | number;
  email: string;
  fullName: string;
  role: string;
  createdAt?: string;
  lastLogin?: string;
}

interface LoginEntry {
  id: number;
  userId: string | number;
  email: string;
  timestamp: string;
  action: string;
  ipAddress?: string;
}

const ROLES = ['Student', 'Faculty / Staff', 'Admin'];

const roleBadgeStyles: Record<string, string> = {
  Admin: 'bg-purple-100 text-purple-700 border-purple-200',
  'Faculty / Staff': 'bg-blue-100 text-blue-700 border-blue-200',
  Student: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [expandedUserId, setExpandedUserId] = useState<string | number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [actionLoading, setActionLoading] = useState<string | number | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, historyData] = await Promise.all([
        api.get<User[]>('/users'),
        api.get<LoginEntry[]>('/login-history'),
      ]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setLoginHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      showToast('Failed to load user data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRoleChange = async (userId: string | number, newRole: string) => {
    if (newRole === 'Admin') {
      const currentAdminCount = users.filter(u => u.role === 'Admin').length;
      const targetUser = users.find(u => u.id === userId);
      const isAlreadyAdmin = targetUser?.role === 'Admin';
      
      if (!isAlreadyAdmin && currentAdminCount >= 3) {
        showToast('The project is limited to a maximum of 3 Admins.', 'error');
        return;
      }
    }

    setActionLoading(userId);
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast(`Role updated to ${newRole}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update role', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.user) return;
    const userId = deleteModal.user.id;
    setActionLoading(userId);
    try {
      await api.delete(`/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeleteModal({ open: false, user: null });
      showToast('User deleted successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleExpand = (userId: string | number) => {
    setExpandedUserId(prev => prev === userId ? null : userId);
  };

  const getUserLoginHistory = (userId: string | number) => {
    return loginHistory.filter(entry => String(entry.userId) === String(userId));
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Stats
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'Admin').length;
  const facultyCount = users.filter(u => u.role === 'Faculty / Staff').length;
  const studentCount = users.filter(u => u.role === 'Student').length;

  const statCards = [
    { label: 'Total Users', value: totalUsers, icon: Users, color: 'from-blue-500 to-indigo-600' },
    { label: 'Admins', value: adminCount, icon: Shield, color: 'from-purple-500 to-violet-600' },
    { label: 'Faculty', value: facultyCount, icon: Users, color: 'from-amber-500 to-orange-600' },
    { label: 'Students', value: studentCount, icon: Users, color: 'from-emerald-500 to-teal-600' },
  ];

  if (currentUser?.user_metadata?.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <Shield size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 text-sm">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-24 right-8 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center animate-in slide-in-from-top-4 fade-in duration-300 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="w-2 h-2 bg-white rounded-full mr-3 animate-ping"></div>
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">User Management</h1>
          <p className="text-gray-500 mt-1 font-medium">Manage user accounts, roles, and access control.</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
                <h3 className="text-2xl font-extrabold text-gray-900">{loading ? '--' : stat.value}</h3>
              </div>
              <div className={`bg-gradient-to-br ${stat.color} p-2.5 rounded-xl text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/30">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/10 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={16} className="text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/10 transition-all cursor-pointer"
            >
              <option value="All">All Roles</option>
              {ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-16 text-center">
            <div className="inline-flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1E3A8A] rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-medium text-gray-500">Loading users...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="inline-flex bg-gray-50 p-4 rounded-full text-gray-400 mb-4">
              <Users size={32} />
            </div>
            <h3 className="font-bold text-gray-900 text-base">No users found</h3>
            <p className="text-gray-500 text-xs mt-1 max-w-xs mx-auto">
              {searchQuery || roleFilter !== 'All' ? 'Try adjusting your filters.' : 'No user accounts exist yet.'}
            </p>
          </div>
        ) : (
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full whitespace-nowrap min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 md:px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 md:px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 md:px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 md:px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Last Login</th>
                  <th className="text-right px-4 md:px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((u) => {
                  const isExpanded = expandedUserId === u.id;
                  const userHistory = getUserLoginHistory(u.id);
                  const isSelf = String(currentUser?.id) === String(u.id);

                  return (
                    <Fragment key={u.id}>
                      <tr
                        onClick={() => toggleExpand(u.id)}
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 md:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1E3A8A] to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                              {u.fullName ? u.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                            </div>
                            <span className="font-semibold text-sm text-gray-900">{u.fullName || 'Unnamed'}</span>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 text-sm text-gray-600">{u.email}</td>
                        <td className="px-4 md:px-6 py-4">
                          <select
                            value={u.role}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleRoleChange(u.id, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            disabled={isSelf || actionLoading === u.id}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border cursor-pointer outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                              roleBadgeStyles[u.role] || 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {ROLES.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock size={12} />
                            <span>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}</span>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {!isSelf && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteModal({ open: true, user: u });
                                }}
                                disabled={actionLoading === u.id}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 disabled:opacity-30"
                                title="Delete user"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            <button className="p-1.5 text-gray-400">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Login History */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="bg-gray-50/50 px-6 py-4">
                            <div className="ml-12">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Clock size={12} />
                                Login History
                              </h4>
                              {userHistory.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {userHistory.slice(0, 10).map((entry) => (
                                    <div key={entry.id} className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-gray-100 text-xs">
                                      <span className="text-gray-700 font-medium">
                                        <span className="font-semibold text-[#1E3A8A] mr-2">[{entry.action}]</span>
                                        {new Date(entry.timestamp).toLocaleString('en-US', {
                                          month: 'short', day: 'numeric', year: 'numeric',
                                          hour: '2-digit', minute: '2-digit',
                                        })}
                                      </span>
                                      {entry.ipAddress && (
                                        <span className="text-gray-400 font-mono">{entry.ipAddress}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400">No login history available.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile View */}
        {filteredUsers.length > 0 && !loading && (
          <div className="md:hidden">
            <div className="flex flex-col divide-y divide-gray-100">
              {filteredUsers.map((u) => {
                const isExpanded = expandedUserId === u.id;
                const userHistory = getUserLoginHistory(u.id);
                const isSelf = String(currentUser?.id) === String(u.id);

                return (
                  <div key={u.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E3A8A] to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
                          {u.fullName ? u.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-gray-900 leading-tight">{u.fullName || 'Unnamed'}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {!isSelf && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModal({ open: true, user: u });
                            }}
                            disabled={actionLoading === u.id}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30"
                            title="Delete user"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => toggleExpand(u.id)}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 text-sm mt-2">
                      <div className="text-gray-500 text-xs flex items-center">Role</div>
                      <div className="flex justify-end">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={isSelf || actionLoading === u.id}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                            roleBadgeStyles[u.role] || 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="text-gray-500 text-xs flex items-center">Last Login</div>
                      <div className="flex justify-end items-center gap-1.5 text-xs text-gray-700 font-medium">
                        <Clock size={12} className="text-gray-400" />
                        <span>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 bg-gray-50/80 rounded-xl p-3 border border-gray-100 animate-in slide-in-from-top-2 fade-in duration-200">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Clock size={12} />
                          Login History
                        </h4>
                        {userHistory.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {userHistory.slice(0, 10).map((entry) => (
                              <div key={entry.id} className="flex flex-col bg-white px-3 py-2 rounded-lg border border-gray-100 text-xs shadow-sm">
                                <div className="flex justify-between mb-1">
                                  <span className="font-semibold text-[#1E3A8A]">[{entry.action}]</span>
                                  {entry.ipAddress && (
                                    <span className="text-gray-400 font-mono">{entry.ipAddress}</span>
                                  )}
                                </div>
                                <span className="text-gray-600">
                                  {new Date(entry.timestamp).toLocaleString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">No login history available.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && deleteModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModal({ open: false, user: null })} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-full max-w-md animate-in zoom-in-95 fade-in duration-200">
            <button
              onClick={() => setDeleteModal({ open: false, user: null })}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all"
            >
              <X size={18} />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-50 p-4 rounded-full mb-4">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete User</h3>
              <p className="text-sm text-gray-500 mb-1">Are you sure you want to delete this user?</p>
              <p className="text-sm font-semibold text-gray-700 mb-6">{deleteModal.user.fullName} ({deleteModal.user.email})</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteModal({ open: false, user: null })}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading === deleteModal.user.id}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {actionLoading === deleteModal.user.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
