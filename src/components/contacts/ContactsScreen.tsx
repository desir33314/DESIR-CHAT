import React, { useState } from 'react';
import { Search, UserPlus, Check, X, MessageSquare, Clock, UserCheck, Phone, Video } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';
import { api } from '../../services/api';
import { User } from '../../types';

export const ContactsScreen: React.FC = () => {
  const { t } = useLanguage();
  const { startCall } = useCall();
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    sendFriendRequest,
    respondFriendRequest,
    startDirectChat,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await api.searchUsers(searchQuery.trim());
      setSearchResults(res.users);
      setActiveTab('search');
    } catch (err: any) {
      setFeedbackMsg(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (targetUserId: string) => {
    try {
      await sendFriendRequest(targetUserId);
      setFeedbackMsg(t('requestSent'));
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      setFeedbackMsg(err.message || 'Failed to send request');
    }
  };

  const isFriend = (userId: string) => friends.some((f) => f.id === userId);
  const isOutgoing = (userId: string) => outgoingRequests.some((r) => r.toUserId === userId);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F19] overflow-hidden pb-20 select-none">
      {/* Search Header */}
      <div className="p-4 bg-[#0D1527] border-b border-slate-800/80">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={t('searchUsers')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#151F38] border border-slate-700/80 rounded-2xl pl-10 pr-20 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition"
          />
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="absolute right-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-xl disabled:opacity-50 transition"
          >
            {isSearching ? '...' : t('searchChats').split(' ')[0]}
          </button>
        </form>

        {/* Tab switcher */}
        <div className="flex space-x-2 mt-3">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition ${
              activeTab === 'friends'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{t('friends')} ({friends.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition ${
              activeTab === 'requests'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t('friendRequests')}</span>
            {incomingRequests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                {incomingRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="mx-4 mt-2 p-2 bg-blue-500/10 border border-blue-500/30 text-cyan-300 text-xs text-center rounded-xl animate-in fade-in">
          {feedbackMsg}
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Search Results Tab */}
        {activeTab === 'search' && (
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Search Results ({searchResults.length})
              </h3>
              <button
                onClick={() => setActiveTab('friends')}
                className="text-xs text-cyan-400 hover:underline"
              >
                Back to Friends
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No users found for "{searchQuery}"
              </div>
            ) : (
              searchResults.map((u) => {
                const alreadyFriend = isFriend(u.id);
                const pending = isOutgoing(u.id);

                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#131D36]/60 border border-slate-800/80 mb-2"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar src={u.avatarUrl} name={u.displayName} size="md" isOnline={u.isOnline} />
                      <div>
                        <h4 className="text-xs font-bold text-white">{u.displayName}</h4>
                        <p className="text-[11px] text-slate-400">@{u.username}</p>
                      </div>
                    </div>

                    <div>
                      {alreadyFriend ? (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => startCall(u, 'audio')}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-400"
                            title="Apèl Vwa"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => startCall(u, 'video')}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-400"
                            title="Apèl Videyo"
                          >
                            <Video className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => startDirectChat(u)}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-600/30 text-cyan-300 border border-blue-500/40 text-xs font-semibold flex items-center space-x-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{t('startChat')}</span>
                          </button>
                        </div>
                      ) : pending ? (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-medium">
                          {t('requestSent')}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(u.id)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1 transition active:scale-95"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{t('addFriend')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                {t('friendRequests')} ({incomingRequests.length})
              </h3>
              {incomingRequests.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs bg-[#131D36]/30 rounded-2xl border border-slate-800/40">
                  {t('noRequests')}
                </div>
              ) : (
                incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#131D36]/80 border border-slate-800 mb-2"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar
                        src={req.fromUser?.avatarUrl}
                        name={req.fromUser?.displayName || 'User'}
                        size="md"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {req.fromUser?.displayName || 'New User'}
                        </h4>
                        <p className="text-[11px] text-slate-400">@{req.fromUser?.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => respondFriendRequest(req.id, true)}
                        className="w-8 h-8 rounded-full bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/40 text-emerald-400 flex items-center justify-center transition active:scale-95"
                        title={t('accept')}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => respondFriendRequest(req.id, false)}
                        className="w-8 h-8 rounded-full bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/40 text-rose-400 flex items-center justify-center transition active:scale-95"
                        title={t('decline')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {outgoingRequests.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                  Sent Requests ({outgoingRequests.length})
                </h3>
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#131D36]/40 border border-slate-800/60 mb-2"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar
                        src={req.toUser?.avatarUrl}
                        name={req.toUser?.displayName || 'User'}
                        size="sm"
                      />
                      <div>
                        <h4 className="text-xs font-semibold text-slate-300">
                          {req.toUser?.displayName || 'User'}
                        </h4>
                        <p className="text-[10px] text-slate-500">@{req.toUser?.username}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 italic">Pending...</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div>
            {friends.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <UserCheck className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs">{t('noFriends')}</p>
                <p className="text-[11px] text-slate-500">Search for @handles above to add friends!</p>
              </div>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#131D36]/60 hover:bg-[#131D36] border border-slate-800/80 mb-2 transition"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={friend.avatarUrl}
                      name={friend.displayName}
                      size="md"
                      isOnline={friend.isOnline}
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white">{friend.displayName}</h4>
                      <p className="text-[11px] text-slate-400">@{friend.username}</p>
                      {friend.statusMessage && (
                        <p className="text-[10px] text-slate-500 italic mt-0.5 max-w-[180px] truncate">
                          "{friend.statusMessage}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => startCall(friend, 'audio')}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 border border-slate-700/60 transition active:scale-95"
                      title="Apèl Vwa"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => startCall(friend, 'video')}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 border border-slate-700/60 transition active:scale-95"
                      title="Apèl Videyo"
                    >
                      <Video className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => startDirectChat(friend)}
                      className="p-2 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-cyan-400 hover:text-white border border-blue-500/40 transition active:scale-95"
                      title={t('startChat')}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
