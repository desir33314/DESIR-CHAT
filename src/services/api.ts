import { AdminStats, AuthSession, Chat, FriendRequest, Message, UploadResponse, User } from '../types';

const TOKEN_KEY = 'desir_chat_token';
const OFFLINE_QUEUE_KEY = 'desir_chat_offline_queue';

class ApiService {
  private token: string | null = null;
  private sse: EventSource | null = null;
  private sseListeners: ((event: string, data: any) => void)[] = [];
  private isOnlineState: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY);
      window.addEventListener('online', () => {
        this.isOnlineState = true;
        this.processOfflineQueue();
      });
      window.addEventListener('offline', () => {
        this.isOnlineState = false;
      });
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    if (token) {
      this.connectSSE();
    } else {
      this.disconnectSSE();
    }
  }

  public isOnline(): boolean {
    return this.isOnlineState;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(endpoint, {
        ...options,
        headers,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || `Request failed with status ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      if (!this.isOnlineState || err.message.includes('Failed to fetch')) {
        throw new Error('Network error: Device is offline or server unreachable');
      }
      throw err;
    }
  }

  // --- Real-time SSE Connection ---
  public connectSSE() {
    if (!this.token || typeof window === 'undefined') return;
    this.disconnectSSE();

    const sseUrl = `/api/realtime?token=${encodeURIComponent(this.token)}`;
    this.sse = new EventSource(sseUrl);

    const eventNames = [
      'connected',
      'presence',
      'new_message',
      'messages_read',
      'typing',
      'friend_request',
      'friend_request_status',
      'chat_created',
      'incoming_call',
      'call_accepted',
      'call_rejected',
      'call_signal',
      'call_ended',
      'user_suspended'
    ];

    eventNames.forEach(evt => {
      this.sse?.addEventListener(evt, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.notifySSE(evt, data);
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      });
    });

    this.sse.onerror = () => {
      // Reconnect handled automatically by EventSource
    };
  }

  public disconnectSSE() {
    if (this.sse) {
      this.sse.close();
      this.sse = null;
    }
  }

  public onRealtimeEvent(listener: (event: string, data: any) => void): () => void {
    this.sseListeners.push(listener);
    return () => {
      this.sseListeners = this.sseListeners.filter(l => l !== listener);
    };
  }

  private notifySSE(event: string, data: any) {
    this.sseListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (e) {
        console.error('Listener callback error:', e);
      }
    });
  }

  // --- Auth ---
  public async login(identifier: string, password: string): Promise<AuthSession> {
    const data = await this.request<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    this.setToken(data.token);
    return data;
  }

  public async register(
    username: string,
    displayName: string,
    email: string,
    password: string
  ): Promise<AuthSession> {
    const data = await this.request<AuthSession>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, displayName, email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  public async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  public async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      this.setToken(null);
    }
  }

  public async resetPassword(email: string, newPassword: string): Promise<{ message: string }> {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword }),
    });
  }

  // --- Users & Profiles ---
  public async searchUsers(query: string): Promise<{ users: User[] }> {
    return this.request(`/api/users/search?q=${encodeURIComponent(query)}`);
  }

  public async updateProfile(updates: Partial<User>): Promise<{ user: User }> {
    return this.request('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // --- Friends ---
  public async getFriends(): Promise<{
    friends: User[];
    incoming: FriendRequest[];
    outgoing: FriendRequest[];
  }> {
    return this.request('/api/friends');
  }

  public async sendFriendRequest(toUserId: string): Promise<{ request: FriendRequest }> {
    return this.request('/api/friends/request', {
      method: 'POST',
      body: JSON.stringify({ toUserId }),
    });
  }

  public async respondFriendRequest(
    requestId: string,
    accept: boolean
  ): Promise<{ request: FriendRequest }> {
    return this.request('/api/friends/respond', {
      method: 'POST',
      body: JSON.stringify({ requestId, accept }),
    });
  }

  // --- Chats ---
  public async getChats(): Promise<{ chats: Chat[] }> {
    return this.request('/api/chats');
  }

  public async createChat(data: {
    type: 'direct' | 'group';
    participantIds: string[];
    title?: string;
    avatarUrl?: string;
  }): Promise<{ chat: Chat }> {
    return this.request('/api/chats', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async getMessages(chatId: string): Promise<{ messages: Message[] }> {
    return this.request(`/api/chats/${chatId}/messages`);
  }

  public async sendMessage(
    chatId: string,
    payload: {
      text?: string;
      attachmentType?: string;
      attachmentUrl?: string;
      attachmentName?: string;
      attachmentSize?: number;
      audioDuration?: number;
    }
  ): Promise<{ message: Message }> {
    // If offline, store in offline queue
    if (!this.isOnlineState) {
      this.enqueueOfflineMessage(chatId, payload);
      const optimisticMsg: Message = {
        id: 'opt_' + Date.now(),
        chatId,
        senderId: 'me',
        senderName: 'You',
        text: payload.text || '',
        attachmentType: (payload.attachmentType as any) || 'none',
        attachmentUrl: payload.attachmentUrl,
        attachmentName: payload.attachmentName,
        attachmentSize: payload.attachmentSize,
        audioDuration: payload.audioDuration,
        status: 'sending',
        readBy: [],
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };
      return { message: optimisticMsg };
    }

    return this.request(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async markChatRead(chatId: string): Promise<void> {
    try {
      await this.request(`/api/chats/${chatId}/read`, { method: 'PUT' });
    } catch {
      // quiet fail
    }
  }

  public async sendTyping(chatId: string, isTyping: boolean): Promise<void> {
    try {
      await this.request(`/api/chats/${chatId}/typing`, {
        method: 'POST',
        body: JSON.stringify({ isTyping }),
      });
    } catch {
      // quiet fail
    }
  }

  // --- Uploads ---
  public async uploadDataUrl(
    dataUrl: string,
    filename: string,
    mimeType: string,
    duration?: number
  ): Promise<UploadResponse> {
    return this.request<UploadResponse>('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, filename, mimeType, duration }),
    });
  }

  public async uploadBlob(
    blob: Blob,
    filename: string,
    duration?: number
  ): Promise<UploadResponse> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const res = await this.uploadDataUrl(dataUrl, filename, blob.type, duration);
          resolve(res);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file blob'));
      reader.readAsDataURL(blob);
    });
  }

  // --- Real-time Calls (WebRTC Signaling) ---
  public async initiateCall(
    targetUserId: string,
    callType: 'audio' | 'video'
  ): Promise<{ callId: string; status: string; receiver: User; message?: string }> {
    return this.request('/api/calls/initiate', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, callType }),
    });
  }

  public async respondCall(
    callId: string,
    accept: boolean
  ): Promise<{ success: boolean; status: string }> {
    return this.request('/api/calls/respond', {
      method: 'POST',
      body: JSON.stringify({ callId, accept }),
    });
  }

  public async sendCallSignal(payload: {
    callId: string;
    type: 'offer' | 'answer' | 'candidate';
    sdp?: string;
    candidate?: any;
  }): Promise<{ success: boolean }> {
    return this.request('/api/calls/signal', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async endCall(callId: string): Promise<{ success: boolean }> {
    return this.request('/api/calls/end', {
      method: 'POST',
      body: JSON.stringify({ callId }),
    });
  }

  // --- Admin Management ---
  public async getAdminStatus(): Promise<{
    adminEmail: string;
    isConfigured: boolean;
    firebaseConfigured: boolean;
  }> {
    return this.request('/api/admin/status');
  }

  public async setupAdmin(payload: {
    email: string;
    password: string;
    username?: string;
    displayName?: string;
  }): Promise<{ message: string; token: string; user: User }> {
    return this.request('/api/admin/setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getAdminUsers(): Promise<{ users: User[] }> {
    return this.request('/api/admin/users');
  }

  public async suspendUser(
    userId: string,
    suspended: boolean
  ): Promise<{ success: boolean; user: User }> {
    return this.request(`/api/admin/users/${userId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ suspended }),
    });
  }

  public async resetUserPassword(
    userId: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  public async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  public async getAdminStats(): Promise<AdminStats> {
    return this.request<AdminStats>('/api/admin/stats');
  }

  // --- Offline Queue Handling ---
  private enqueueOfflineMessage(chatId: string, payload: any) {
    if (typeof window === 'undefined') return;
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      queue.push({ chatId, payload, timestamp: Date.now() });
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to enqueue message offline:', e);
    }
  }

  public async processOfflineQueue() {
    if (typeof window === 'undefined') return;
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      if (queue.length === 0) return;
      localStorage.removeItem(OFFLINE_QUEUE_KEY);

      for (const item of queue) {
        try {
          await this.sendMessage(item.chatId, item.payload);
        } catch (e) {
          console.error('Failed to sync queued message:', e);
        }
      }
    } catch (e) {
      console.error('Error processing offline queue:', e);
    }
  }
}

export const api = new ApiService();
