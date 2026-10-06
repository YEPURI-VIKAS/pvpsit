import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Mail, Shield, Lock, Eye, EyeOff, Clock, Check, AlertCircle, Edit3, Save, Camera, Trash2, KeyRound, History } from 'lucide-react';
import { api, uploadImage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface LoginEntry {
  id: number;
  timestamp: string;
  action: string;
  ipAddress?: string;
}

type ProfileTab = 'account' | 'password' | 'history';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('account');

  // Profile editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Login history
  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  };

  const fetchLoginHistory = useCallback(async () => {
    if (!user?.id) return;
    setHistoryLoading(true);
    try {
      const data = await api.get<LoginEntry[]>(`/login-history/user/${user.id}`);
      setLoginHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch login history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLoginHistory();
  }, [fetchLoginHistory]);

  // Profile name update
  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.put<any>('/auth/profile', { 
        fullName: fullName.trim(),
        avatarUrl: user?.user_metadata?.avatar_url || ''
      });

      if (user) {
        updateUser({
          ...user,
          user_metadata: {
            ...user.user_metadata,
            full_name: fullName.trim(),
          },
        });
      }

      if (res.token) {
        localStorage.setItem('jwt_token', res.token);
      }

      setIsEditingName(false);
      showToast('Profile updated successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const publicUrl = await uploadImage(file, 'facility-photos');
      
      await api.put<any>('/auth/profile', { 
        fullName: user?.user_metadata?.full_name || 'User',
        avatarUrl: publicUrl
      });

      if (user) {
        updateUser({
          ...user,
          user_metadata: {
            ...user.user_metadata,
            avatar_url: publicUrl,
          },
        });
      }
      
      showToast('Profile picture updated successfully!');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      showToast(err.message || 'Failed to upload profile picture', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm("Are you sure you want to remove your profile picture?")) return;
    setIsUploadingAvatar(true);
    try {
      await api.put<any>('/auth/profile', { 
        fullName: user?.user_metadata?.full_name || 'User',
        avatarUrl: ''
      });

      if (user) {
        updateUser({
          ...user,
          user_metadata: {
            ...user.user_metadata,
            avatar_url: '',
          },
        });
      }
      showToast('Profile picture removed.');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove picture', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // Password strength
  const getPasswordStrength = (pw: string): { label: string; color: string; width: string } => {
    if (!pw) return { label: '', color: '', width: '0%' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '20%' };
    if (score === 2) return { label: 'Fair', color: 'bg-orange-500', width: '40%' };
    if (score === 3) return { label: 'Good', color: 'bg-yellow-500', width: '60%' };
    if (score === 4) return { label: 'Strong', color: 'bg-emerald-500', width: '80%' };
    return { label: 'Very Strong', color: 'bg-green-600', width: '100%' };
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-24 right-8 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center animate-in slide-in-from-top-4 fade-in duration-300 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="w-2 h-2 bg-white rounded-full mr-3 animate-ping"></div>
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Profile & Settings</h1>
        <p className="text-gray-500 mt-1 font-medium">Manage your personal information, security, and sign-in activity.</p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column — Profile Card (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Gradient banner */}
            <div className="h-28 bg-gradient-to-br from-[#1E3A8A] to-indigo-500 relative">
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                <div 
                  className="group relative w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-extrabold shadow-lg border-4 border-white overflow-hidden bg-gradient-to-br from-[#1E3A8A] to-indigo-400 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to change profile picture"
                >
                  {user?.user_metadata?.avatar_url ? (
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                  
                  {/* Upload overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {isUploadingAvatar ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Camera size={22} className="text-white drop-shadow-md" />
                    )}
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>

            <div className="pt-16 pb-6 px-6 text-center">
              {/* Profile Photo Buttons */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#1E3A8A] hover:bg-blue-100 rounded-lg text-xs font-semibold transition-all"
                >
                  <Camera size={13} />
                  {user?.user_metadata?.avatar_url ? 'Change Photo' : 'Upload Photo'}
                </button>
                {user?.user_metadata?.avatar_url && (
                  <button
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-all"
                    title="Remove Photo"
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                )}
              </div>

              {/* Name */}
              {isEditingName ? (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="text-center text-lg font-bold text-gray-900 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/10"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="p-2 bg-[#1E3A8A] text-white rounded-xl hover:bg-[#1E3A8A]/90 transition-all disabled:opacity-50"
                  >
                    {savingProfile ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{user?.user_metadata?.full_name || 'User'}</h2>
                  <button
                    onClick={() => {
                      setFullName(user?.user_metadata?.full_name || '');
                      setIsEditingName(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-[#1E3A8A] hover:bg-blue-50 rounded-lg transition-all"
                    title="Edit Name"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              )}

              {/* Email */}
              <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500 mb-3">
                <Mail size={14} />
                <span>{user?.email}</span>
              </div>

              {/* Role Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border bg-blue-50 text-[#1E3A8A] border-blue-200">
                <Shield size={12} />
                {user?.user_metadata?.role || 'Unknown'}
              </div>
            </div>

            {/* Info rows */}
            <div className="border-t border-gray-100 px-6 py-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 font-medium flex items-center gap-1.5"><User size={14} /> Full Name</span>
                <span className="text-gray-700 font-semibold">{user?.user_metadata?.full_name || '-'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 font-medium flex items-center gap-1.5"><Mail size={14} /> Email</span>
                <span className="text-gray-700 font-semibold">{user?.email || '-'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 font-medium flex items-center gap-1.5"><Shield size={14} /> Role</span>
                <span className="text-gray-700 font-semibold">{user?.user_metadata?.role || '-'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 font-medium flex items-center gap-1.5"><Clock size={14} /> User ID</span>
                <span className="text-gray-500 font-mono text-xs">{user?.id || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column — Tabbed Settings with Anchor Buttons (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Navigation Anchor Buttons / Tabs */}
          <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex gap-2">
            <a
              href="#account"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('account');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold transition-all ${
                activeTab === 'account'
                  ? 'bg-[#1E3A8A] text-white shadow-md shadow-blue-900/10'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <User size={16} />
              <span>Account Info</span>
            </a>

            <a
              href="#change-password"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('password');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold transition-all ${
                activeTab === 'password'
                  ? 'bg-[#1E3A8A] text-white shadow-md shadow-blue-900/10'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <KeyRound size={16} />
              <span>Change Password</span>
            </a>

            <a
              href="#login-history"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('history');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-[#1E3A8A] text-white shadow-md shadow-blue-900/10'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <History size={16} />
              <span>Login History</span>
            </a>
          </div>

          {/* Tab 1: Account Information Details */}
          {activeTab === 'account' && (
            <div id="account" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-in fade-in duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <User size={18} className="text-[#1E3A8A]" />
                Account Details & Preferences
              </h3>
              <p className="text-xs text-gray-500 mb-5">View and update your display information.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/10 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm bg-gray-50 text-gray-500 cursor-not-allowed font-medium"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Email address is managed by institutional PVPSIT directory.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Assigned Role</label>
                  <input
                    type="text"
                    value={user?.user_metadata?.role || ''}
                    disabled
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm bg-gray-50 text-gray-500 cursor-not-allowed font-medium"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="w-full bg-[#1E3A8A] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#1E40AF] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                  >
                    {savingProfile ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save Profile Details
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Change Password Card */}
          {activeTab === 'password' && (
            <div id="change-password" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-in fade-in duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Lock size={18} className="text-[#1E3A8A]" />
                Change Password
              </h3>
              <p className="text-xs text-gray-500 mb-5">Update your password to keep your account secure.</p>

              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Current password */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full border border-gray-200 rounded-xl py-2.5 px-4 pr-10 text-sm outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/10 transition-all"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full border border-gray-200 rounded-xl py-2.5 px-4 pr-10 text-sm outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/10 transition-all"
                      placeholder="Enter new password (min 6 chars)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {newPassword && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: passwordStrength.width }}
                        />
                      </div>
                      <p className={`text-xs mt-1 font-medium ${
                        passwordStrength.label === 'Weak' ? 'text-red-500' :
                        passwordStrength.label === 'Fair' ? 'text-orange-500' :
                        passwordStrength.label === 'Good' ? 'text-yellow-600' :
                        'text-emerald-600'
                      }`}>
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full border border-gray-200 rounded-xl py-2.5 px-4 pr-10 text-sm outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/10 transition-all"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Passwords do not match
                    </p>
                  )}
                  {confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <Check size={12} /> Passwords match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={savingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                  className="w-full bg-[#1E3A8A] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#1E40AF] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                  {savingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} />
                      Update Password
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Tab 3: Login History Card */}
          {activeTab === 'history' && (
            <div id="login-history" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-in fade-in duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <History size={18} className="text-[#1E3A8A]" />
                Recent Sign-in Activity
              </h3>
              <p className="text-xs text-gray-500 mb-5">Your complete session and device login history.</p>

              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-[#1E3A8A] rounded-full animate-spin"></div>
                </div>
              ) : loginHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex bg-gray-50 p-3 rounded-full text-gray-400 mb-3">
                    <Clock size={24} />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">No login history records found.</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
                  {loginHistory.slice(0, 30).map((entry, idx) => (
                    <div
                      key={entry.id || idx}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors group"
                    >
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? 'bg-[#1E3A8A]' : 'bg-gray-300'}`} />
                        {idx < loginHistory.length - 1 && (
                          <div className="w-0.5 h-6 bg-gray-200 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                          <span className="font-semibold text-[#1E3A8A] text-xs">[{entry.action}]</span>
                          {new Date(entry.timestamp).toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </p>
                        {entry.ipAddress && (
                          <p className="text-xs text-gray-400 font-mono mt-0.5">IP: {entry.ipAddress}</p>
                        )}
                      </div>
                      {idx === 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase border border-emerald-200">Current Session</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
