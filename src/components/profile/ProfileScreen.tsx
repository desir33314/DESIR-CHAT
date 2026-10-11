import React, { useState } from 'react';
import { Camera, Check, LogOut, Shield, Bell, HelpCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { api } from '../../services/api';

export const ProfileScreen: React.FC = () => {
  const { t } = useLanguage();
  const { user, updateProfile, logout } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!user) return null;

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSaving(true);
      const res = await api.uploadBlob(file, file.name);
      setAvatarUrl(res.url);
      await updateProfile({ avatarUrl: res.url });
      showToast(t('profileSaved'));
    } catch (err: any) {
      showToast(err.message || 'Avatar upload failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        statusMessage: statusMessage.trim(),
        avatarUrl,
      });
      showToast(t('profileSaved'));
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F19] overflow-y-auto pb-24 select-none">
      {/* Toast */}
      {toastMessage && (
        <div className="sticky top-2 z-50 mx-4 p-2.5 rounded-2xl bg-emerald-600/90 text-white text-xs font-semibold shadow-xl text-center border border-emerald-400/30 animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-gradient-to-b from-[#131D36] to-[#0B0F19] p-6 text-center border-b border-slate-800 flex flex-col items-center">
        <div className="relative mb-3">
          <Avatar src={avatarUrl || user.avatarUrl} name={displayName || user.displayName} size="xl" />
          <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 hover:bg-cyan-500 border-2 border-[#0B0F19] text-white flex items-center justify-center cursor-pointer shadow-lg transition active:scale-95">
            <Camera className="w-4 h-4" />
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarFile}
              className="hidden"
            />
          </label>
        </div>

        <h2 className="text-base font-extrabold text-white">{user.displayName}</h2>
        <p className="text-xs text-cyan-400 font-mono mt-0.5">@{user.username}</p>
        <p className="text-[11px] text-slate-400 font-mono">{user.email}</p>

        <div className="flex items-center space-x-2 mt-2">
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('online')}</span>
          </span>

          {user.role === 'admin' ? (
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
              ADMINISTRATÈ
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold">
              MANM
            </span>
          )}
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="p-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            {t('displayName')}
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-[#131D36] border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            {t('status')}
          </label>
          <input
            type="text"
            value={statusMessage}
            placeholder="e.g. Nan travay / At work"
            onChange={(e) => setStatusMessage(e.target.value)}
            className="w-full bg-[#131D36] border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            {t('bio')}
          </label>
          <textarea
            rows={3}
            value={bio}
            placeholder="A short story about you..."
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-[#131D36] border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center space-x-1.5"
        >
          <Check className="w-4 h-4" />
          <span>{isSaving ? t('uploading') : t('saveProfile')}</span>
        </button>
      </form>

      {/* Quick Settings & Logout */}
      <div className="px-4 space-y-2 mt-2">
        <div className="p-3 bg-[#131D36]/60 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-2 text-slate-400">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>{t('privacy')}</span>
            </span>
            <span className="text-[11px] font-semibold text-emerald-400">E2E Protected</span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-2">
            <span className="flex items-center space-x-2 text-slate-400">
              <Bell className="w-4 h-4 text-violet-400" />
              <span>{t('soundNotifications')}</span>
            </span>
            <span className="text-[11px] font-semibold text-cyan-400">Enabled</span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-2">
            <span className="flex items-center space-x-2 text-slate-400">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>{t('version')}</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">v1.0.0</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center space-x-1.5 transition active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );
};
