import React from 'react';
import { MessageSquareText, Globe } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Language } from '../../types';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  rightAction,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();

  const cycleLanguage = () => {
    const nextLang: Record<Language, Language> = {
      ht: 'fr',
      fr: 'en',
      en: 'ht',
    };
    setLanguage(nextLang[language]);
  };

  const langLabels: Record<Language, string> = {
    ht: '🇭🇹 Kreyòl',
    fr: '🇫🇷 Français',
    en: '🇺🇸 English',
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 border border-blue-400/30">
            <MessageSquareText className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-300 bg-clip-text text-transparent">
                DESIR-CHAT
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-cyan-400 border border-blue-500/20">
                PRO
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 leading-none mt-0.5">
              {title && title !== 'DESIR-CHAT' ? (
                <>
                  <span className="text-cyan-300 font-medium">{title}</span>
                  {user && <span>• @{user.username}</span>}
                </>
              ) : user ? (
                <span>@{user.username}</span>
              ) : (
                <span>{subtitle || t('tagline')}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {rightAction}

          <button
            onClick={cycleLanguage}
            title={t('language')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-medium text-slate-200 transition active:scale-95"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-semibold">{langLabels[language]}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
