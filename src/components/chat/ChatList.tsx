import React, { useState } from 'react';
import { Search, Plus, MessageSquare, Users, Mic, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';
import { NewChatModal } from './NewChatModal';
import { Chat } from '../../types';

interface ChatListProps {
  filterType?: 'all' | 'direct' | 'group';
}

export const ChatList: React.FC<ChatListProps> = ({ filterType = 'all' }) => {
  const { t } = useLanguage();
  const { chats, selectChat, typingUsers, isLoadingChats } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  const filteredChats = chats
    .filter((chat) => {
      if (filterType === 'direct') return chat.type === 'direct';
      if (filterType === 'group') return chat.type === 'group';
      return true;
    })
    .filter((chat) => {
      const q = searchQuery.toLowerCase();
      const matchTitle = chat.title?.toLowerCase().includes(q);
      const matchLastMsg = chat.lastMessage?.text?.toLowerCase().includes(q);
      const matchParticipants = chat.participants?.some(
        (p) => p.displayName.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)
      );
      return matchTitle || matchLastMsg || matchParticipants;
    });

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getChatSubtitle = (chat: Chat) => {
    const typingUser = typingUsers[chat.id];
    if (typingUser) {
      return (
        <span className="text-cyan-400 font-semibold animate-pulse">
          {typingUser} {t('typing')}
        </span>
      );
    }

    if (!chat.lastMessage) {
      return <span className="text-slate-500 italic">{t('noChatsSub')}</span>;
    }

    const { attachmentType, text } = chat.lastMessage;

    if (attachmentType === 'audio') {
      return (
        <span className="flex items-center space-x-1 text-cyan-400">
          <Mic className="w-3 h-3" />
          <span>{t('voiceMessage')}</span>
        </span>
      );
    }

    if (attachmentType === 'image') {
      return (
        <span className="flex items-center space-x-1 text-indigo-300">
          <ImageIcon className="w-3 h-3" />
          <span>{t('photo')}</span>
        </span>
      );
    }

    return <span className="truncate">{text}</span>;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F19] overflow-hidden relative">
      {/* Search Header */}
      <div className="px-4 py-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={t('searchChats')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#131D36]/80 border border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/80 transition"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 pb-24 space-y-1">
        {isLoadingChats ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">{t('uploading')}</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400">
              <MessageSquare className="w-7 h-7 text-cyan-400/60" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">{t('noChats')}</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">{t('noChatsSub')}</p>
            </div>
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition active:scale-95"
            >
              {t('startChat')}
            </button>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isGroup = chat.type === 'group';
            const unread = chat.unreadCount || 0;

            return (
              <div
                key={chat.id}
                onClick={() => selectChat(chat)}
                className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-[#131D36]/60 border border-transparent hover:border-slate-800/80 cursor-pointer transition select-none active:scale-[0.99]"
              >
                <div className="relative">
                  <Avatar
                    src={chat.avatarUrl}
                    name={chat.title || 'Chat'}
                    size="md"
                    isOnline={
                      isGroup
                        ? undefined
                        : chat.participants?.find((p) => p.displayName === chat.title)?.isOnline
                    }
                  />
                  {isGroup && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 border border-[#0B0F19] flex items-center justify-center text-[10px] text-white">
                      <Users className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-xs font-bold text-slate-100 truncate pr-2">
                      {chat.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {formatTimestamp(chat.lastMessage?.timestamp || chat.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-slate-400 truncate pr-2">
                      {getChatSubtitle(chat)}
                    </div>

                    {unread > 0 && (
                      <span className="px-1.5 py-0.5 min-w-4 h-4 bg-gradient-to-r from-blue-500 to-cyan-400 text-[10px] font-bold text-slate-950 rounded-full flex items-center justify-center shrink-0 shadow-sm shadow-cyan-400/20">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button (FAB) for Android */}
      <button
        onClick={() => setIsNewChatOpen(true)}
        className="fixed bottom-20 right-5 z-20 w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition"
        title={t('startChat')}
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* New Chat Modal */}
      <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
    </div>
  );
};
