import React from 'react';
import { MessageSquare, Users, MessageCircle, User as UserIcon, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';

export type NavTab = 'chats' | 'contacts' | 'groups' | 'profile' | 'admin';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { chats, incomingRequests } = useChat();

  const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const pendingRequests = incomingRequests.length;

  const tabs: { id: NavTab; labelKey: any; icon: React.ElementType; badge?: number }[] = [
    {
      id: 'chats',
      labelKey: 'chats',
      icon: MessageSquare,
      badge: totalUnread,
    },
    {
      id: 'contacts',
      labelKey: 'contacts',
      icon: Users,
      badge: pendingRequests,
    },
    {
      id: 'groups',
      labelKey: 'groups',
      icon: MessageCircle,
    },
    {
      id: 'profile',
      labelKey: 'profile',
      icon: UserIcon,
    },
  ];

  if (user?.role === 'admin') {
    tabs.push({
      id: 'admin',
      labelKey: 'admin',
      icon: ShieldAlert,
    });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#0B0F19]/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 max-w-md mx-auto select-none">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 active:scale-95 ${
                isActive ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200 font-normal'
              }`}
            >
              <div
                className={`relative px-3.5 py-1 rounded-full transition-all duration-200 ${
                  isActive ? 'bg-blue-600/20 text-cyan-400 shadow-sm shadow-blue-500/20' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />

                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-4.5 h-4.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-[10px] font-bold text-white rounded-full flex items-center justify-center border-2 border-[#0B0F19] shadow-sm animate-pulse">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                ) : null}
              </div>

              <span className="text-[11px] mt-0.5 tracking-tight">
                {t(tab.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
