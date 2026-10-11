import React, { useState } from 'react';
import { X, Search, Users, UserPlus, Check, MessageSquarePlus } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';
import { User } from '../../types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { friends, startDirectChat, createGroupChat } = useChat();
  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredFriends = friends.filter(
    (f) =>
      f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectFriend = (userId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleStartDirect = async (friend: User) => {
    try {
      setIsSubmitting(true);
      await startDirectChat(friend);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to start chat');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError('Please provide a group name');
      return;
    }
    if (selectedFriends.length === 0) {
      setError('Select at least one member');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await createGroupChat(groupName.trim(), selectedFriends);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <MessageSquarePlus className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              {tab === 'direct' ? t('startChat') : t('newGroup')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="px-5 pt-3">
          <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => {
                setTab('direct');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition ${
                tab === 'direct'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('directMessages')}</span>
            </button>
            <button
              onClick={() => {
                setTab('group');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition ${
                tab === 'group'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t('groups')}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
            {error}
          </div>
        )}

        {/* Direct Chat Contact Picker */}
        {tab === 'direct' && (
          <div className="flex-1 flex flex-col p-5 overflow-hidden">
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={t('searchUsers')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredFriends.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-xs">{t('noFriends')}</p>
                </div>
              ) : (
                filteredFriends.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleStartDirect(f)}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/60 transition text-left active:scale-[0.98]"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar
                        src={f.avatarUrl}
                        name={f.displayName}
                        size="md"
                        isOnline={f.isOnline}
                      />
                      <div>
                        <h4 className="text-sm font-semibold text-white leading-tight">
                          {f.displayName}
                        </h4>
                        <p className="text-xs text-slate-400">@{f.username}</p>
                      </div>
                    </div>
                    <span className="text-xs text-cyan-400 font-semibold px-2 py-1 bg-cyan-400/10 rounded-xl">
                      {t('startChat')}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Group Chat Creator */}
        {tab === 'group' && (
          <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col p-5 overflow-hidden">
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  {t('groupName')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fanmi & Zanmi 🇭🇹"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>

              <label className="text-xs font-semibold text-slate-300 block">
                {t('groupMembers')} ({selectedFriends.length})
              </label>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4">
              {friends.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  {t('noFriends')}
                </div>
              ) : (
                friends.map((f) => {
                  const isSelected = selectedFriends.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => toggleSelectFriend(f.id)}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border cursor-pointer transition select-none ${
                        isSelected
                          ? 'bg-blue-600/20 border-cyan-400/40'
                          : 'bg-slate-800/30 border-slate-800/60 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar src={f.avatarUrl} name={f.displayName} size="sm" isOnline={f.isOnline} />
                        <div>
                          <h4 className="text-xs font-semibold text-white leading-tight">
                            {f.displayName}
                          </h4>
                          <p className="text-[11px] text-slate-400">@{f.username}</p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border transition ${
                          isSelected
                            ? 'bg-cyan-400 border-cyan-400 text-slate-950'
                            : 'border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !groupName.trim() || selectedFriends.length === 0}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-blue-500/20 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
            >
              {isSubmitting ? t('uploading') : t('createGroupBtn')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
