export type Language = 'ht' | 'fr' | 'en';

export type UserStatus = 'online' | 'away' | 'busy' | 'offline';

export interface PrivacySettings {
  readReceipts?: boolean;
  lastSeen?: 'everyone' | 'contacts' | 'nobody';
}

export interface NotificationSettings {
  sound?: boolean;
  inAppBanners?: boolean;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  statusMessage?: string;
  isOnline: boolean;
  statusState?: UserStatus;
  role?: 'admin' | 'user';
  isSuspended?: boolean;
  blockedUserIds?: string[];
  privacySettings?: PrivacySettings;
  notificationSettings?: NotificationSettings;
  lastSeen?: string;
  createdAt: string;
  updatedAt?: string;
}

export type AttachmentType = 'none' | 'image' | 'video' | 'audio' | 'file';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface MessageReplyInfo {
  id: string;
  senderName: string;
  text?: string;
  attachmentType?: AttachmentType;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  attachmentType: AttachmentType;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  audioDuration?: number; // duration in seconds
  status: MessageStatus;
  readBy: string[]; // array of userIds
  replyTo?: MessageReplyInfo;
  isForwarded?: boolean;
  deletedForEveryone?: boolean;
  deletedForUserIds?: string[];
  createdAt: string;
  isOptimistic?: boolean;
}

export type ChatType = 'direct' | 'group';

export interface Chat {
  id: string;
  type: ChatType;
  title: string;
  description?: string;
  avatarUrl?: string;
  participantIds: string[];
  participants?: User[];
  adminIds?: string[]; // group administrators
  createdById: string;
  lastMessage?: {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    timestamp: string;
    attachmentType: AttachmentType;
  };
  unreadCount?: number;
  deletedForUserIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: FriendRequestStatus;
  createdAt: string;
  updatedAt?: string;
  fromUser?: User;
  toUser?: User;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface UploadResponse {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  duration?: number;
}

export type CallType = 'audio' | 'video';

export type CallStatus =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'connected'
  | 'ended'
  | 'declined'
  | 'busy'
  | 'error';

export interface ActiveCall {
  id: string;
  otherUser: User;
  type: CallType;
  status: CallStatus;
  isIncoming: boolean;
  connectedAt?: number;
}

export interface AdminStats {
  totalUsers: number;
  totalChats: number;
  totalMessages: number;
  activeSessions: number;
  adminEmail: string;
  uptimeSeconds: number;
  firebaseConfigured: boolean;
}
