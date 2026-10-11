import React, { useState } from 'react';
import { MessageSquareText, Lock, Mail, User, AtSign, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Language } from '../../types';

export const AuthScreen: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { login, register, resetPassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!identifier.trim() || !password) {
          throw new Error(t('fillAllFields'));
        }
        await login(identifier.trim(), password);
      } else if (mode === 'signup') {
        if (!username.trim() || !displayName.trim() || !email.trim() || !password) {
          throw new Error(t('fillAllFields'));
        }
        if (password !== confirmPassword) {
          throw new Error(t('passwordMismatch'));
        }
        await register(username.trim(), displayName.trim(), email.trim(), password);
      } else if (mode === 'forgot') {
        if (!email.trim() || !password) {
          throw new Error(t('fillAllFields'));
        }
        const msg = await resetPassword(email.trim(), password);
        setSuccessMsg(msg);
        setTimeout(() => setMode('login'), 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('errorOccurred'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (demoIdentifier: string, demoPass: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await login(demoIdentifier, demoPass);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-between p-4 max-w-md mx-auto select-none">
      {/* Top Bar with Language Selector */}
      <div className="flex justify-between items-center py-2">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            DESIR-CHAT SECURE
          </span>
        </div>

        <div className="flex items-center space-x-1 bg-slate-900/90 border border-slate-800 p-1 rounded-2xl">
          {(['ht', 'fr', 'en'] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-xl transition ${
                language === lang
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'ht' ? 'HT' : lang === 'fr' ? 'FR' : 'EN'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div className="my-auto py-4">
        {/* Brand Hero */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 border border-blue-400/40 transform hover:scale-105 transition">
            <MessageSquareText className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent">
            {t('appName')}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {t('welcomeSub')}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-[#131D36] p-1 rounded-2xl border border-slate-800/80 mb-5">
          <button
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              mode === 'login'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('login')}
          </button>
          <button
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              mode === 'signup'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('signup')}
          </button>
        </div>

        {/* Alert Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-center animate-in fade-in">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs text-center flex items-center justify-center space-x-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 ml-1">
                  {t('displayName')}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Jean-Paul"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[#131D36] border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 ml-1">
                  {t('username')}
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="jean_paul"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#131D36] border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
              </div>
            </>
          )}

          {(mode === 'signup' || mode === 'forgot') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 ml-1">
                {t('email')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#131D36] border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 ml-1">
                {t('username')} / {t('email')}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="jean_bap or jean@desirchat.app"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-[#131D36] border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1 ml-1">
              <label className="text-[11px] font-semibold text-slate-300">
                {mode === 'forgot' ? 'Nouvo Modpas / New Password' : t('password')}
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMsg(null);
                  }}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  {t('forgotPassword')}
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#131D36] border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 ml-1">
                {t('confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#131D36] border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>
              {isLoading
                ? t('sending')
                : mode === 'login'
                ? t('login')
                : mode === 'signup'
                ? t('signup')
                : t('resetPassword')}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {mode === 'forgot' && (
          <div className="mt-3 text-center">
            <button
              onClick={() => setMode('login')}
              className="text-xs text-slate-400 hover:text-cyan-400 transition"
            >
              ← {t('backToLogin')}
            </button>
          </div>
        )}

        {/* Quick Demo Accounts for Instant Testing */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <div className="flex items-center space-x-1 text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Koneksyon Rapid / Instant Demo Accounts</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('jean_bap', 'Pass12345!')}
              disabled={isLoading}
              className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-left transition active:scale-95 flex items-center space-x-2"
            >
              <div className="w-7 h-7 rounded-xl bg-blue-600/30 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                JB
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-200 truncate">Jean-Baptiste</p>
                <p className="text-[9px] text-slate-400">@jean_bap</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('marie_claire', 'Pass12345!')}
              disabled={isLoading}
              className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-left transition active:scale-95 flex items-center space-x-2"
            >
              <div className="w-7 h-7 rounded-xl bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                MC
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-200 truncate">Marie-Claire</p>
                <p className="text-[9px] text-slate-400">@marie_claire</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-2 text-[10px] text-slate-500">
        DESIR-CHAT • {t('allRightsReserved')} © 2026
      </footer>
    </div>
  );
};
