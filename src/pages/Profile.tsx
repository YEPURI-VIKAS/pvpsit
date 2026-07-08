import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Mail, Shield, Lock, Eye, EyeOff, Clock, Check, AlertCircle, Edit3, Save } from 'lucide-react';
import { api, uploadImage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface LoginEntry {
  id: number;
  timestamp: string;
  action: string;
  ipAddress?: string;
}

const Profile = () => {
  const { user } = useAuth();

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
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
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
      const res = await api.put<any>('/auth/profile', { fullName: fullName.trim() });

      // Update localStorage with new values
      const updatedUser = {
        ...user,
        user_metadata: {
          ...user?.user_metadata,
          full_name: fullName.trim(),
        },
      };
      localStorage.setItem('pvpsit_auth_user', JSON.stringify(updatedUser));

      if (res.token) {
        localStorage.setItem('pvpsit_auth_token', res.token);
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
      // 1. Upload to storage
      const publicUrl = await uploadImage(file, 'facility-photos');
      
      // 2. Save to auth profile
      await api.put<any>('/auth/profile', { 
        fullName: user?.user_metadata?.full_name || 'User',
        avatarUrl: publicUrl
      });

      // 3. Update localStorage
      const updatedUser = {
        ...user,
        user_metadata: {
          ...user?.user_metadata,
          avatar_url: publicUrl,
        },
      };
      localStorage.setItem('pvpsit_auth_user', JSON.stringify(updatedUser));
      
      // Force reload to let AuthContext pick it up, or just rely on onAuthStateChange if it triggers
      // onAuthStateChange might trigger for updateUser, but we can also just show a toast
      showToast('Profile picture updated successfully! It may take a moment to appear everywhere.');
      
      // Clear input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      showToast(err.message || 'Failed to upload profile picture', 'error');
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
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Profile</h1>
        <p className="text-gray-500 mt-1 font-medium">Manage your account information and security settings.</p>
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
                      <Edit3 size={20} className="text-white drop-shadow-md" />
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

        {/* Right Column — Password + History (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Change Password Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
                    placeholder="Enter new password"
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
                className="w-full bg-[#1E3A8A] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#1E3A8A]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingPassword ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    Update Password
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Login History Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Clock size={18} className="text-[#1E3A8A]" />
              Login History
            </h3>
            <p className="text-xs text-gray-500 mb-5">Your recent sign-in activity.</p>

            {historyLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-[#1E3A8A] rounded-full animate-spin"></div>
              </div>
            ) : loginHistory.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex bg-gray-50 p-3 rounded-full text-gray-400 mb-3">
                  <Clock size={24} />
                </div>
                <p className="text-sm text-gray-500 font-medium">No login history available</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {loginHistory.slice(0, 20).map((entry, idx) => (
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
                        })}
                      </p>
                      {entry.ipAddress && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{entry.ipAddress}</p>
                      )}
                    </div>
                    {idx === 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">Latest</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
