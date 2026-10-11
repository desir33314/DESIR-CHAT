import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Chat, FriendRequest, Message, User } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  typingUsers: Record<string, string>; // chatId -> userName
  friends: User[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  selectChat: (chat: Chat | null) => void;
  sendMessage: (payload: {
    text?: string;
    attachmentType?: 'none' | 'image' | 'video' | 'audio' | 'file';
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentSize?: number;
    audioDuration?: number;
  }) => Promise<void>;
  sendVoiceMessage: (blob: Blob, duration: number) => Promise<void>;
  sendMediaAttachment: (file: File) => Promise<void>;
  startDirectChat: (targetUser: User) => Promise<Chat>;
  createGroupChat: (title: string, participantIds: string[], avatarUrl?: string) => Promise<Chat>;
  sendFriendRequest: (targetUserId: string) => Promise<void>;
  respondFriendRequest: (requestId: string, accept: boolean) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  refreshChats: () => Promise<void>;
  refreshFriends: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState<boolean>(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [friends, setFriends] = useState<User[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);

  const activeChatRef = useRef<Chat | null>(null);
  activeChatRef.current = activeChat;

  const refreshChats = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getChats();
      setChats(res.chats);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    }
  }, [user]);

  const refreshFriends = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getFriends();
      setFriends(res.friends);
      setIncomingRequests(res.incoming);
      setOutgoingRequests(res.outgoing);
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    }
  }, [user]);

  // Load chats & friends when user logs in
  useEffect(() => {
    if (user) {
      setIsLoadingChats(true);
      Promise.all([refreshChats(), refreshFriends()]).finally(() => {
        setIsLoadingChats(false);
      });
    } else {
      setChats([]);
      setActiveChat(null);
      setMessages([]);
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
    }
  }, [user, refreshChats, refreshFriends]);

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChat || !user) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);

    api
      .getMessages(activeChat.id)
      .then(res => {
        if (isMounted) {
          setMessages(res.messages);
          // Mark as read in local chat list
          setChats(prev =>
            prev.map(c => (c.id === activeChat.id ? { ...c, unreadCount: 0 } : c))
          );
        }
      })
      .catch(err => {
        console.error('Failed to load messages:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeChat?.id, user]);

  // Handle SSE Realtime Events
  useEffect(() => {
    if (!user) return;

    const cleanup = api.onRealtimeEvent((event, data) => {
      if (event === 'new_message') {
        const { message, chatId } = data;
        const currentActive = activeChatRef.current;

        // If in current chat, append
        if (currentActive && currentActive.id === chatId) {
          setMessages(prev => {
            // deduplicate
            if (prev.some(m => m.id === message.id)) return prev;
            return [...prev, message];
          });
          api.markChatRead(chatId);
        }

        // Update last message in chat list
        setChats(prev =>
          prev.map(c => {
            if (c.id === chatId) {
              const isUnread = (!currentActive || currentActive.id !== chatId) && message.senderId !== user.id;
              return {
                ...c,
                lastMessage: {
                  id: message.id,
                  text: message.text || (message.attachmentType === 'audio' ? '🎤 Voice Message' : '📎 Attachment'),
                  senderId: message.senderId,
                  senderName: message.senderName,
                  timestamp: message.createdAt,
                  attachmentType: message.attachmentType,
                },
                unreadCount: isUnread ? (c.unreadCount || 0) + 1 : 0,
                updatedAt: message.createdAt,
              };
            }
            return c;
          }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        );
      }

      if (event === 'messages_read') {
        const { chatId, userId } = data;
        if (activeChatRef.current && activeChatRef.current.id === chatId) {
          setMessages(prev =>
            prev.map(m => {
              if (m.senderId === user.id && !m.readBy.includes(userId)) {
                return { ...m, status: 'read', readBy: [...m.readBy, userId] };
              }
              return m;
            })
          );
        }
      }

      if (event === 'typing') {
        const { chatId, userName, isTyping } = data;
        setTypingUsers(prev => {
          if (isTyping) {
            return { ...prev, [chatId]: userName };
          } else {
            const next = { ...prev };
            delete next[chatId];
            return next;
          }
        });

        // Auto clear after 4 seconds
        if (isTyping) {
          setTimeout(() => {
            setTypingUsers(prev => {
              const next = { ...prev };
              if (next[chatId] === userName) {
                delete next[chatId];
              }
              return next;
            });
          }, 4000);
        }
      }

      if (event === 'friend_request' || event === 'friend_request_status') {
        refreshFriends();
      }

      if (event === 'chat_created') {
        refreshChats();
      }
    });

    return () => {
      cleanup();
    };
  }, [user, refreshChats, refreshFriends]);

  const selectChat = (chat: Chat | null) => {
    setActiveChat(chat);
    if (chat) {
      api.markChatRead(chat.id);
    }
  };

  const sendMessage = async (payload: {
    text?: string;
    attachmentType?: 'none' | 'image' | 'video' | 'audio' | 'file';
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentSize?: number;
    audioDuration?: number;
  }) => {
    if (!activeChat || !user) return;
    setIsSendingMessage(true);

    // Optimistic message
    const tempId = 'temp_' + Date.now();
    const optimistic: Message = {
      id: tempId,
      chatId: activeChat.id,
      senderId: user.id,
      senderName: user.displayName,
      senderAvatar: user.avatarUrl,
      text: payload.text || '',
      attachmentType: payload.attachmentType || 'none',
      attachmentUrl: payload.attachmentUrl,
      attachmentName: payload.attachmentName,
      attachmentSize: payload.attachmentSize,
      audioDuration: payload.audioDuration,
      status: 'sending',
      readBy: [user.id],
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages(prev => [...prev, optimistic]);

    try {
      const res = await api.sendMessage(activeChat.id, payload);
      // Replace optimistic with real, or filter out tempId if already added by SSE
      setMessages(prev => {
        const alreadyHasMessage = prev.some(m => m.id === res.message.id);
        if (alreadyHasMessage) {
          return prev.filter(m => m.id !== tempId);
        }
        return prev.map(m => (m.id === tempId ? res.message : m));
      });
      refreshChats();
    } catch (err) {
      console.error('Failed to send message:', err);
      // Mark failed
      setMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...m, status: 'sending' } : m))
      );
    } finally {
      setIsSendingMessage(false);
    }
  };

  const sendVoiceMessage = async (blob: Blob, duration: number) => {
    if (!activeChat || !user) return;
    setIsSendingMessage(true);
    try {
      const filename = `voice_${Date.now()}.webm`;
      const uploaded = await api.uploadBlob(blob, filename, duration);
      await sendMessage({
        text: '',
        attachmentType: 'audio',
        attachmentUrl: uploaded.url,
        attachmentName: filename,
        attachmentSize: uploaded.size,
        audioDuration: Math.round(duration),
      });
    } catch (err) {
      console.error('Failed to upload and send voice message:', err);
      throw err;
    } finally {
      setIsSendingMessage(false);
    }
  };

  const sendMediaAttachment = async (file: File) => {
    if (!activeChat || !user) return;
    setIsSendingMessage(true);

    try {
      let attachmentType: 'image' | 'video' | 'file' = 'file';
      if (file.type.startsWith('image/')) attachmentType = 'image';
      else if (file.type.startsWith('video/')) attachmentType = 'video';

      const uploaded = await api.uploadBlob(file, file.name);
      await sendMessage({
        text: '',
        attachmentType,
        attachmentUrl: uploaded.url,
        attachmentName: file.name,
        attachmentSize: file.size,
      });
    } catch (err) {
      console.error('Failed to upload file attachment:', err);
      throw err;
    } finally {
      setIsSendingMessage(false);
    }
  };

  const startDirectChat = async (targetUser: User): Promise<Chat> => {
    if (!user) throw new Error('Not authenticated');
    const res = await api.createChat({
      type: 'direct',
      participantIds: [targetUser.id],
    });
    await refreshChats();
    const fullChat = {
      ...res.chat,
      title: targetUser.displayName,
      avatarUrl: targetUser.avatarUrl,
      participants: [user, targetUser],
    };
    setActiveChat(fullChat);
    return fullChat;
  };

  const createGroupChat = async (
    title: string,
    participantIds: string[],
    avatarUrl?: string
  ): Promise<Chat> => {
    if (!user) throw new Error('Not authenticated');
    const res = await api.createChat({
      type: 'group',
      title,
      participantIds,
      avatarUrl,
    });
    await refreshChats();
    setActiveChat(res.chat);
    return res.chat;
  };

  const sendFriendRequest = async (targetUserId: string) => {
    await api.sendFriendRequest(targetUserId);
    await refreshFriends();
  };

  const respondFriendRequest = async (requestId: string, accept: boolean) => {
    await api.respondFriendRequest(requestId, accept);
    await refreshFriends();
    await refreshChats();
  };

  const sendTyping = (isTyping: boolean) => {
    if (activeChat) {
      api.sendTyping(activeChat.id, isTyping);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        messages,
        isLoadingChats,
        isLoadingMessages,
        isSendingMessage,
        typingUsers,
        friends,
        incomingRequests,
        outgoingRequests,
        selectChat,
        sendMessage,
        sendVoiceMessage,
        sendMediaAttachment,
        startDirectChat,
        createGroupChat,
        sendFriendRequest,
        respondFriendRequest,
        sendTyping,
        refreshChats,
        refreshFriends,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
