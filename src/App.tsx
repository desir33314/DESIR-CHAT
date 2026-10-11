import React, { useState } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { CallProvider, useCall } from './context/CallContext';
import { AndroidFrame } from './components/common/AndroidFrame';
import { Header } from './components/common/Header';
import { BottomNav, NavTab } from './components/common/BottomNav';
import { OfflineBanner } from './components/common/OfflineBanner';
import { AuthScreen } from './components/auth/AuthScreen';
import { ChatList } from './components/chat/ChatList';
import { ConversationScreen } from './components/chat/ConversationScreen';
import { ContactsScreen } from './components/contacts/ContactsScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { IncomingCallModal } from './components/call/IncomingCallModal';
import { ActiveCallView } from './components/call/ActiveCallView';
import { MessageSquareText, AlertCircle, X } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { activeChat } = useChat();
  const { activeCall, errorMessage, clearError } = useCall();
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState<NavTab>('chats');

  // Loading Splash Screen
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0B0F19] text-white">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 border border-blue-400/30 animate-pulse mb-4">
          <MessageSquareText className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-300 bg-clip-text text-transparent">
          DESIR-CHAT
        </h1>
        <p className="text-xs text-slate-400 mt-1">{t('tagline')}</p>
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mt-6" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <AuthScreen />;
  }

  // Active call view takes over full screen when in call
  if (activeCall) {
    return (
      <>
        <ActiveCallView />
        <IncomingCallModal />
      </>
    );
  }

  // Active chat conversation view overrides main tab
  if (activeChat) {
    return (
      <>
        <ConversationScreen />
        <IncomingCallModal />
      </>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F19] overflow-hidden relative">
      <Header
        title={
          currentTab === 'chats'
            ? t('chats')
            : currentTab === 'contacts'
            ? t('contacts')
            : currentTab === 'groups'
            ? t('groups')
            : currentTab === 'admin'
            ? t('admin')
            : t('profile')
        }
      />
      <OfflineBanner />

      {/* Global Call Error Banner */}
      {errorMessage && (
        <div className="mx-3 mt-2 p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-in fade-in z-30">
          <div className="flex items-center space-x-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            onClick={clearError}
            className="p-1 rounded-lg text-rose-300 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {currentTab === 'chats' && <ChatList filterType="all" />}
        {currentTab === 'contacts' && <ContactsScreen />}
        {currentTab === 'groups' && <ChatList filterType="group" />}
        {currentTab === 'profile' && <ProfileScreen />}
        {currentTab === 'admin' && <AdminDashboard />}
      </main>

      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      <IncomingCallModal />
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ChatProvider>
          <CallProvider>
            <AndroidFrame>
              <MainAppContent />
            </AndroidFrame>
          </CallProvider>
        </ChatProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
