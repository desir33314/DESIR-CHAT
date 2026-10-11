import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface DBUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  salt: string;
  avatarUrl: string;
  bio: string;
  statusMessage: string;
  isOnline: boolean;
  role?: 'admin' | 'user';
  isSuspended?: boolean;
  blockedUserIds?: string[];
  privacySettings?: {
    readReceipts?: boolean;
    lastSeen?: 'everyone' | 'contacts' | 'nobody';
  };
  notificationSettings?: {
    sound?: boolean;
    inAppBanners?: boolean;
  };
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBChat {
  id: string;
  type: 'direct' | 'group';
  title: string;
  description?: string;
  avatarUrl?: string;
  participantIds: string[];
  adminIds?: string[];
  createdById: string;
  deletedForUserIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DBMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  attachmentType: 'none' | 'image' | 'video' | 'audio' | 'file';
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  audioDuration?: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  readBy: string[];
  replyTo?: {
    id: string;
    senderName: string;
    text?: string;
    attachmentType?: 'none' | 'image' | 'video' | 'audio' | 'file';
  };
  isForwarded?: boolean;
  deletedForEveryone?: boolean;
  deletedForUserIds?: string[];
  createdAt: string;
}

export interface DBFriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
}

export interface DBSchema {
  users: DBUser[];
  chats: DBChat[];
  messages: DBMessage[];
  friendRequests: DBFriendRequest[];
  sessions: { token: string; userId: string; expiresAt: number }[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'desir_chat.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const chosenSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, chosenSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: chosenSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const calculated = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return calculated === hash;
}

function getInitialDB(): DBSchema {
  const adminPass = hashPassword('DesirChat2026!');
  const jeanPass = hashPassword('Pass12345!');
  const mariePass = hashPassword('Pass12345!');

  const defaultUsers: DBUser[] = [
    {
      id: 'usr_desir_support',
      username: 'desir_support',
      displayName: 'DESIR Assistant',
      email: 'support@desirchat.app',
      passwordHash: adminPass.hash,
      salt: adminPass.salt,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      bio: 'Ofisyèl Sipò DESIR-CHAT. Byenvini sou platfòm lan!',
      statusMessage: 'Toujou disponib pou ede w / Always here to help',
      isOnline: true,
      role: 'admin',
      isSuspended: false,
      blockedUserIds: [],
      privacySettings: { readReceipts: true, lastSeen: 'everyone' },
      notificationSettings: { sound: true, inAppBanners: true },
      lastSeen: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'usr_jean_haiti',
      username: 'jean_bap',
      displayName: 'Jean-Baptiste Pierre',
      email: 'jean@desirchat.app',
      passwordHash: jeanPass.hash,
      salt: jeanPass.salt,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      bio: 'Enjenyè lojisyèl nan Pòtoprens. Fanatik mizik Konpa.',
      statusMessage: 'Nan travay sou nouvo pwojè 🇭🇹',
      isOnline: true,
      role: 'user',
      isSuspended: false,
      blockedUserIds: [],
      privacySettings: { readReceipts: true, lastSeen: 'everyone' },
      notificationSettings: { sound: true, inAppBanners: true },
      lastSeen: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'usr_marie_claire',
      username: 'marie_claire',
      displayName: 'Marie-Claire Laurent',
      email: 'marie@desirchat.app',
      passwordHash: mariePass.hash,
      salt: mariePass.salt,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      bio: 'Designer UI & Fotograf. M renmen kominikasyon klè!',
      statusMessage: 'Koute vokal yo pita 🎵',
      isOnline: false,
      role: 'user',
      isSuspended: false,
      blockedUserIds: [],
      privacySettings: { readReceipts: true, lastSeen: 'everyone' },
      notificationSettings: { sound: true, inAppBanners: true },
      lastSeen: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const defaultChats: DBChat[] = [
    {
      id: 'chat_welcome_support',
      type: 'direct',
      title: 'DESIR Assistant',
      participantIds: ['usr_desir_support'],
      createdById: 'usr_desir_support',
      deletedForUserIds: [],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'chat_group_haiti_tech',
      type: 'group',
      title: '🇭🇹 Ayiti Tech & Devs',
      description: 'Gwoup ofisyèl pou diskite teknoloji, pwogramasyon ak inovasyon ann Ayiti.',
      avatarUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80',
      participantIds: ['usr_desir_support', 'usr_jean_haiti', 'usr_marie_claire'],
      adminIds: ['usr_jean_haiti'],
      createdById: 'usr_jean_haiti',
      deletedForUserIds: [],
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const defaultMessages: DBMessage[] = [
    {
      id: 'msg_welcome_1',
      chatId: 'chat_welcome_support',
      senderId: 'usr_desir_support',
      senderName: 'DESIR Assistant',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      text: 'Byenvini sou DESIR-CHAT! Ou ka voye mesaj tèks, fè apèl vwa ak videyo, reponn mesaj, pataje foto, epi kreye gwoup!',
      attachmentType: 'none',
      status: 'sent',
      readBy: ['usr_desir_support'],
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'msg_group_1',
      chatId: 'chat_group_haiti_tech',
      senderId: 'usr_jean_haiti',
      senderName: 'Jean-Baptiste Pierre',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      text: 'Alo tout moun! DESIR-CHAT vrèman rapid sou telefòn Android mwen an. Kijan nou wè interface la?',
      attachmentType: 'none',
      status: 'read',
      readBy: ['usr_jean_haiti', 'usr_desir_support', 'usr_marie_claire'],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
    },
    {
      id: 'msg_group_2',
      chatId: 'chat_group_haiti_tech',
      senderId: 'usr_marie_claire',
      senderName: 'Marie-Claire Laurent',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      text: 'Koulè ble elektrik ak nwa nèt sa a bèl anpil! Pataje kèk foto oswa vwa nou tande.',
      attachmentType: 'none',
      status: 'read',
      readBy: ['usr_jean_haiti', 'usr_desir_support', 'usr_marie_claire'],
      replyTo: {
        id: 'msg_group_1',
        senderName: 'Jean-Baptiste Pierre',
        text: 'Alo tout moun! DESIR-CHAT vrèman rapid sou telefòn Android mwen an.'
      },
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
    }
  ];

  return {
    users: defaultUsers,
    chats: defaultChats,
    messages: defaultMessages,
    friendRequests: [],
    sessions: []
  };
}

export class Database {
  private static instance: Database;
  private db: DBSchema;

  private constructor() {
    this.db = this.load();
  }

  public static get(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private load(): DBSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure properties exist on old schemas
        if (parsed.users) {
          parsed.users.forEach((u: DBUser) => {
            if (!u.blockedUserIds) u.blockedUserIds = [];
            if (!u.privacySettings) u.privacySettings = { readReceipts: true, lastSeen: 'everyone' };
            if (!u.notificationSettings) u.notificationSettings = { sound: true, inAppBanners: true };
          });
        }
        if (parsed.chats) {
          parsed.chats.forEach((c: DBChat) => {
            if (!c.deletedForUserIds) c.deletedForUserIds = [];
            if (c.type === 'group' && !c.adminIds) c.adminIds = [c.createdById];
          });
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse database, resetting to default:', e);
    }
    const initial = getInitialDB();
    this.saveDirect(initial);
    return initial;
  }

  private saveDirect(data: DBSchema) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write db file:', e);
    }
  }

  public save() {
    this.saveDirect(this.db);
  }

  // --- Users ---
  public findUserById(id: string): DBUser | undefined {
    return this.db.users.find(u => u.id === id);
  }

  public findUserByEmailOrUsername(identifier: string): DBUser | undefined {
    const term = identifier.trim().toLowerCase().replace(/^@/, '');
    return this.db.users.find(
      u => u.username.toLowerCase() === term || u.email.toLowerCase() === term
    );
  }

  public createUser(user: DBUser): DBUser {
    if (!user.blockedUserIds) user.blockedUserIds = [];
    if (!user.privacySettings) user.privacySettings = { readReceipts: true, lastSeen: 'everyone' };
    if (!user.notificationSettings) user.notificationSettings = { sound: true, inAppBanners: true };
    this.db.users.push(user);
    this.save();
    return user;
  }

  public updateUser(id: string, updates: Partial<DBUser>): DBUser | undefined {
    const user = this.findUserById(id);
    if (!user) return undefined;
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return user;
  }

  public deleteUser(id: string): boolean {
    const initialLen = this.db.users.length;
    this.db.users = this.db.users.filter(u => u.id !== id);
    this.db.sessions = this.db.sessions.filter(s => s.userId !== id);
    this.save();
    return this.db.users.length < initialLen;
  }

  public suspendUser(id: string, suspended: boolean): DBUser | undefined {
    const user = this.findUserById(id);
    if (!user) return undefined;
    user.isSuspended = suspended;
    user.updatedAt = new Date().toISOString();
    if (suspended) {
      // kill active sessions
      this.db.sessions = this.db.sessions.filter(s => s.userId !== id);
    }
    this.save();
    return user;
  }

  public blockUser(userId: string, targetUserId: string, block: boolean): DBUser | undefined {
    const user = this.findUserById(userId);
    if (!user) return undefined;
    if (!user.blockedUserIds) user.blockedUserIds = [];
    if (block) {
      if (!user.blockedUserIds.includes(targetUserId)) {
        user.blockedUserIds.push(targetUserId);
      }
    } else {
      user.blockedUserIds = user.blockedUserIds.filter(id => id !== targetUserId);
    }
    user.updatedAt = new Date().toISOString();
    this.save();
    return user;
  }

  public isUserBlocked(senderId: string, recipientId: string): boolean {
    const recipient = this.findUserById(recipientId);
    if (!recipient || !recipient.blockedUserIds) return false;
    return recipient.blockedUserIds.includes(senderId);
  }

  public searchUsers(query: string, currentUserId: string): DBUser[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return this.db.users.filter(u => u.id !== currentUserId && !u.isSuspended).slice(0, 30);
    }
    return this.db.users.filter(
      u =>
        u.id !== currentUserId &&
        !u.isSuspended &&
        (u.username.toLowerCase().includes(q) ||
         u.displayName.toLowerCase().includes(q) ||
         u.email.toLowerCase().includes(q))
    ).slice(0, 30);
  }

  public getAllUsers(): DBUser[] {
    return this.db.users;
  }

  // --- Sessions ---
  public createSession(userId: string): string {
    const token = 'desir_tok_' + crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
    this.db.sessions.push({ token, userId, expiresAt });
    this.save();
    return token;
  }

  public validateSession(token: string): DBUser | null {
    const session = this.db.sessions.find(s => s.token === token);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      this.deleteSession(token);
      return null;
    }
    const user = this.findUserById(session.userId);
    return user || null;
  }

  public deleteSession(token: string) {
    this.db.sessions = this.db.sessions.filter(s => s.token !== token);
    this.save();
  }

  // --- Friends ---
  public getFriends(userId: string): DBUser[] {
    const acceptedRequests = this.db.friendRequests.filter(
      r => r.status === 'accepted' && (r.fromUserId === userId || r.toUserId === userId)
    );
    const friendIds = acceptedRequests.map(r => (r.fromUserId === userId ? r.toUserId : r.fromUserId));
    return friendIds
      .map(id => this.findUserById(id))
      .filter((u): u is DBUser => !!u && !u.isSuspended);
  }

  public getFriendRequests(userId: string) {
    const incoming = this.db.friendRequests.filter(r => r.toUserId === userId && r.status === 'pending');
    const outgoing = this.db.friendRequests.filter(r => r.fromUserId === userId && r.status === 'pending');
    return { incoming, outgoing };
  }

  public sendFriendRequest(fromUserId: string, toUserId: string): DBFriendRequest {
    const existing = this.db.friendRequests.find(
      r => (r.fromUserId === fromUserId && r.toUserId === toUserId) ||
           (r.fromUserId === toUserId && r.toUserId === fromUserId)
    );
    if (existing) {
      if (existing.status === 'declined') {
        existing.status = 'pending';
        existing.fromUserId = fromUserId;
        existing.toUserId = toUserId;
        existing.updatedAt = new Date().toISOString();
        this.save();
      }
      return existing;
    }

    const request: DBFriendRequest = {
      id: 'req_' + crypto.randomUUID(),
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.db.friendRequests.push(request);
    this.save();
    return request;
  }

  public respondFriendRequest(requestId: string, userId: string, accept: boolean): DBFriendRequest | undefined {
    const req = this.db.friendRequests.find(r => r.id === requestId && r.toUserId === userId);
    if (!req) return undefined;
    req.status = accept ? 'accepted' : 'declined';
    req.updatedAt = new Date().toISOString();
    this.save();

    if (accept) {
      this.getOrCreateDirectChat(req.fromUserId, req.toUserId);
    }
    return req;
  }

  // --- Chats ---
  public getUserChats(userId: string): DBChat[] {
    return this.db.chats.filter(c => {
      const isParticipant = c.participantIds.includes(userId);
      const isNotDeleted = !c.deletedForUserIds || !c.deletedForUserIds.includes(userId);
      return isParticipant && isNotDeleted;
    });
  }

  public getChatById(chatId: string): DBChat | undefined {
    return this.db.chats.find(c => c.id === chatId);
  }

  public getOrCreateDirectChat(userA: string, userB: string): DBChat {
    const existing = this.db.chats.find(
      c => c.type === 'direct' && c.participantIds.includes(userA) && c.participantIds.includes(userB)
    );
    if (existing) {
      // If deleted for userA or userB, un-delete it when reopened
      if (existing.deletedForUserIds) {
        existing.deletedForUserIds = existing.deletedForUserIds.filter(id => id !== userA && id !== userB);
        this.save();
      }
      return existing;
    }

    const chat: DBChat = {
      id: 'chat_' + crypto.randomUUID(),
      type: 'direct',
      title: '',
      participantIds: [userA, userB],
      createdById: userA,
      deletedForUserIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.db.chats.push(chat);
    this.save();
    return chat;
  }

  public createGroupChat(
    createdById: string,
    title: string,
    participantIds: string[],
    avatarUrl?: string,
    description?: string
  ): DBChat {
    const uniqueParticipants = Array.from(new Set([createdById, ...participantIds]));
    const chat: DBChat = {
      id: 'chat_' + crypto.randomUUID(),
      type: 'group',
      title,
      description,
      avatarUrl,
      participantIds: uniqueParticipants,
      adminIds: [createdById],
      createdById,
      deletedForUserIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.db.chats.push(chat);
    this.save();
    return chat;
  }

  public updateChatInfo(
    chatId: string,
    requesterId: string,
    updates: { title?: string; description?: string; avatarUrl?: string }
  ): DBChat | null {
    const chat = this.getChatById(chatId);
    if (!chat) return null;
    if (chat.type === 'group') {
      const isAdmin = chat.createdById === requesterId || (chat.adminIds && chat.adminIds.includes(requesterId));
      if (!isAdmin) return null;
    }
    if (updates.title) chat.title = updates.title;
    if (updates.description !== undefined) chat.description = updates.description;
    if (updates.avatarUrl !== undefined) chat.avatarUrl = updates.avatarUrl;
    chat.updatedAt = new Date().toISOString();
    this.save();
    return chat;
  }

  public addGroupMember(chatId: string, requesterId: string, newUserId: string): DBChat | null {
    const chat = this.getChatById(chatId);
    if (!chat || chat.type !== 'group') return null;
    const isAdmin = chat.createdById === requesterId || (chat.adminIds && chat.adminIds.includes(requesterId));
    if (!isAdmin) return null;

    if (!chat.participantIds.includes(newUserId)) {
      chat.participantIds.push(newUserId);
      chat.updatedAt = new Date().toISOString();
      this.save();
    }
    return chat;
  }

  public removeGroupMember(chatId: string, requesterId: string, targetUserId: string): DBChat | null {
    const chat = this.getChatById(chatId);
    if (!chat || chat.type !== 'group') return null;
    const isAdmin = chat.createdById === requesterId || (chat.adminIds && chat.adminIds.includes(requesterId));
    if (!isAdmin && requesterId !== targetUserId) return null;

    chat.participantIds = chat.participantIds.filter(id => id !== targetUserId);
    if (chat.adminIds) {
      chat.adminIds = chat.adminIds.filter(id => id !== targetUserId);
    }
    chat.updatedAt = new Date().toISOString();
    this.save();
    return chat;
  }

  public deleteChatForUser(chatId: string, userId: string): boolean {
    const chat = this.getChatById(chatId);
    if (!chat) return false;
    if (!chat.deletedForUserIds) chat.deletedForUserIds = [];
    if (!chat.deletedForUserIds.includes(userId)) {
      chat.deletedForUserIds.push(userId);
      this.save();
    }
    // Also mark messages deleted for user
    for (const msg of this.db.messages) {
      if (msg.chatId === chatId) {
        if (!msg.deletedForUserIds) msg.deletedForUserIds = [];
        if (!msg.deletedForUserIds.includes(userId)) {
          msg.deletedForUserIds.push(userId);
        }
      }
    }
    this.save();
    return true;
  }

  public ensureUserInWelcomeChat(userId: string) {
    const welcome = this.db.chats.find(c => c.id === 'chat_welcome_support');
    if (welcome && !welcome.participantIds.includes(userId)) {
      welcome.participantIds.push(userId);
    }
    const group = this.db.chats.find(c => c.id === 'chat_group_haiti_tech');
    if (group && !group.participantIds.includes(userId)) {
      group.participantIds.push(userId);
    }
    this.save();
  }

  // --- Messages ---
  public getChatMessages(chatId: string, userId?: string, limit = 150): DBMessage[] {
    return this.db.messages
      .filter(m => {
        if (m.chatId !== chatId) return false;
        if (userId && m.deletedForUserIds && m.deletedForUserIds.includes(userId)) return false;
        return true;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-limit);
  }

  public createMessage(msg: DBMessage): DBMessage {
    if (!msg.deletedForUserIds) msg.deletedForUserIds = [];
    this.db.messages.push(msg);
    const chat = this.getChatById(msg.chatId);
    if (chat) {
      chat.updatedAt = msg.createdAt;
      // If someone previously hid/deleted the chat, show it again on new message
      chat.deletedForUserIds = [];
    }
    this.save();
    return msg;
  }

  public deleteMessage(messageId: string, userId: string, forEveryone: boolean): DBMessage | null {
    const msg = this.db.messages.find(m => m.id === messageId);
    if (!msg) return null;

    if (forEveryone) {
      // Only sender or admin can delete for everyone
      if (msg.senderId !== userId) return null;
      msg.deletedForEveryone = true;
      msg.text = 'Mesaj sa a efase / Ce message a été supprimé';
      msg.attachmentType = 'none';
      msg.attachmentUrl = undefined;
    } else {
      if (!msg.deletedForUserIds) msg.deletedForUserIds = [];
      if (!msg.deletedForUserIds.includes(userId)) {
        msg.deletedForUserIds.push(userId);
      }
    }
    this.save();
    return msg;
  }

  public markMessagesRead(chatId: string, userId: string) {
    let updated = false;
    for (const m of this.db.messages) {
      if (m.chatId === chatId && m.senderId !== userId && !m.readBy.includes(userId)) {
        m.readBy.push(userId);
        m.status = 'read';
        updated = true;
      }
    }
    if (updated) {
      this.save();
    }
  }

  public markMessagesDelivered(chatId: string, userId: string) {
    let updated = false;
    for (const m of this.db.messages) {
      if (m.chatId === chatId && m.senderId !== userId && m.status === 'sent') {
        m.status = 'delivered';
        updated = true;
      }
    }
    if (updated) {
      this.save();
    }
  }

  public getLastMessage(chatId: string, userId?: string): DBMessage | undefined {
    const chatMsgs = this.db.messages.filter(m => {
      if (m.chatId !== chatId) return false;
      if (userId && m.deletedForUserIds && m.deletedForUserIds.includes(userId)) return false;
      return true;
    });
    if (chatMsgs.length === 0) return undefined;
    return chatMsgs[chatMsgs.length - 1];
  }

  public getUnreadCount(chatId: string, userId: string): number {
    return this.db.messages.filter(
      m => m.chatId === chatId &&
           m.senderId !== userId &&
           !m.readBy.includes(userId) &&
           (!m.deletedForUserIds || !m.deletedForUserIds.includes(userId))
    ).length;
  }

  public getStats() {
    return {
      totalUsers: this.db.users.length,
      totalChats: this.db.chats.length,
      totalMessages: this.db.messages.length,
      activeSessions: this.db.sessions.filter(s => s.expiresAt > Date.now()).length
    };
  }
}
