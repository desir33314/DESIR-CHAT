import { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Database, DBMessage, DBUser } from './db';

interface SSEClient {
  userId: string;
  res: ServerResponse;
}

const sseClients = new Set<SSEClient>();
const serverStartTime = Date.now();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'playboydesir@gmail.com').trim().toLowerCase();

// Active Calls Memory Map
interface CallSession {
  id: string;
  callerId: string;
  receiverId: string;
  callType: 'audio' | 'video';
  status: 'ringing' | 'connected' | 'ended';
  startedAt: number;
}
const activeCalls = new Map<string, CallSession>();

export function broadcastSSE(event: string, data: any, targetUserIds?: string[]) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    if (!targetUserIds || targetUserIds.includes(client.userId)) {
      try {
        client.res.write(payload);
      } catch (e) {
        // broken pipe
      }
    }
  }
}

// Periodic heartbeat
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.res.write(': heartbeat\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 25000);

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) {
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function parseRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, status: number, message: string) {
  sendJson(res, status, { error: message });
}

function getBearerToken(req: IncomingMessage): string | null {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.substring(7).trim();
}

function sanitizeUser(u: DBUser) {
  const isServerAdmin = u.email.toLowerCase() === ADMIN_EMAIL;
  const role: 'admin' | 'user' = isServerAdmin ? 'admin' : (u.role || 'user');
  const { passwordHash: _, salt: __, ...safe } = u;
  return {
    ...safe,
    role,
    blockedUserIds: u.blockedUserIds || [],
    privacySettings: u.privacySettings || { readReceipts: true, lastSeen: 'everyone' },
    notificationSettings: u.notificationSettings || { sound: true, inAppBanners: true },
    isSuspended: !!u.isSuspended
  };
}

function isUserAdmin(u: DBUser): boolean {
  return u.email.toLowerCase() === ADMIN_EMAIL || u.role === 'admin';
}

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain'
};

export function createApiMiddleware() {
  const db = Database.get();
  const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads');

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      });
      return res.end();
    }

    // Serve uploaded files
    if (pathname.startsWith('/api/files/')) {
      const filename = path.basename(pathname.replace('/api/files/', ''));
      const filePath = path.join(uploadsDir, filename);
      if (!fs.existsSync(filePath)) {
        return sendError(res, 404, 'File not found');
      }

      const stat = fs.statSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      const contentType = MIME_MAP[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stat.size,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // Pass through non-API requests
    if (!pathname.startsWith('/api/')) {
      return next();
    }

    try {
      // --- Status & Health ---
      if (pathname === '/api/status' && req.method === 'GET') {
        return sendJson(res, 200, {
          status: 'ok',
          service: 'DESIR-CHAT API',
          version: '2.5.0',
          adminEmailConfigured: ADMIN_EMAIL,
          uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000)
        });
      }

      // --- Admin Setup Status ---
      if (pathname === '/api/admin/setup-status' && req.method === 'GET') {
        const existingAdmin = db.getAllUsers().find(u => u.email.toLowerCase() === ADMIN_EMAIL);
        return sendJson(res, 200, {
          configuredEmail: ADMIN_EMAIL,
          adminCreated: !!existingAdmin,
          adminDisplayName: existingAdmin ? existingAdmin.displayName : null,
          adminUsername: existingAdmin ? existingAdmin.username : null
        });
      }

      // --- Admin Setup Initial Account ---
      if (pathname === '/api/admin/setup' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { password, displayName, username } = body;

        if (!password || password.length < 6) {
          return sendError(res, 400, 'Modpas dwe gen omwen 6 karaktè.');
        }

        const existingAdmin = db.findUserByEmailOrUsername(ADMIN_EMAIL);
        const { hash, salt } = (await import('./db')).hashPassword(password);

        if (existingAdmin) {
          existingAdmin.passwordHash = hash;
          existingAdmin.salt = salt;
          existingAdmin.role = 'admin';
          if (displayName) existingAdmin.displayName = displayName;
          if (username) existingAdmin.username = username.trim().toLowerCase().replace(/^@/, '');
          db.updateUser(existingAdmin.id, existingAdmin);
          const token = db.createSession(existingAdmin.id);
          return sendJson(res, 200, {
            message: 'Kont administratè a mete ajou avèk siksè!',
            token,
            user: sanitizeUser(existingAdmin)
          });
        }

        const adminId = 'usr_admin_' + crypto.randomUUID().slice(0, 8);
        const newAdmin: DBUser = {
          id: adminId,
          username: (username || 'admin').trim().toLowerCase().replace(/^@/, ''),
          displayName: displayName || 'Siprèm Administratè',
          email: ADMIN_EMAIL,
          passwordHash: hash,
          salt,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=admin&backgroundColor=1e1b4b`,
          bio: 'Ofisyèl Administratè DESIR-CHAT.',
          statusMessage: 'Sekirite & Jesyon Sistèm',
          isOnline: true,
          role: 'admin',
          isSuspended: false,
          blockedUserIds: [],
          privacySettings: { readReceipts: true, lastSeen: 'everyone' },
          notificationSettings: { sound: true, inAppBanners: true },
          lastSeen: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        db.createUser(newAdmin);
        db.ensureUserInWelcomeChat(newAdmin.id);
        const token = db.createSession(newAdmin.id);

        return sendJson(res, 201, {
          message: 'Premye kont administratè a kreye avèk siksè!',
          token,
          user: sanitizeUser(newAdmin)
        });
      }

      // --- Real-time SSE Stream ---
      if (pathname === '/api/realtime' && req.method === 'GET') {
        const token = url.searchParams.get('token') || getBearerToken(req);
        if (!token) {
          return sendError(res, 401, 'Unauthorized');
        }
        const user = db.validateSession(token);
        if (!user) {
          return sendError(res, 401, 'Invalid session');
        }
        if (user.isSuspended) {
          return sendError(res, 403, 'Kont sa a sispann');
        }

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });
        res.write('retry: 3000\n\n');
        res.write(`event: connected\ndata: ${JSON.stringify({ userId: user.id })}\n\n`);

        const client: SSEClient = { userId: user.id, res };
        sseClients.add(client);

        // Mark user as online and broadcast presence
        db.updateUser(user.id, { isOnline: true, lastSeen: new Date().toISOString() });
        broadcastSSE('presence', { userId: user.id, isOnline: true, lastSeen: new Date().toISOString() });

        // When user connects, mark any unread messages sent to them as delivered
        const userChats = db.getUserChats(user.id);
        for (const chat of userChats) {
          db.markMessagesDelivered(chat.id, user.id);
          broadcastSSE('messages_delivered', { chatId: chat.id, userId: user.id }, chat.participantIds);
        }

        req.on('close', () => {
          sseClients.delete(client);
          for (const [callId, call] of activeCalls.entries()) {
            if (call.callerId === user.id || call.receiverId === user.id) {
              const otherId = call.callerId === user.id ? call.receiverId : call.callerId;
              broadcastSSE('call_ended', { callId, reason: 'disconnected' }, [otherId]);
              activeCalls.delete(callId);
            }
          }

          const hasOtherConnections = Array.from(sseClients).some(c => c.userId === user.id);
          if (!hasOtherConnections) {
            db.updateUser(user.id, { isOnline: false, lastSeen: new Date().toISOString() });
            broadcastSSE('presence', { userId: user.id, isOnline: false, lastSeen: new Date().toISOString() });
          }
        });
        return;
      }

      // --- AUTH: Register ---
      if (pathname === '/api/auth/register' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { username, displayName, email, password } = body;

        if (!username || !displayName || !email || !password) {
          return sendError(res, 400, 'Tout chan yo obligatwa');
        }
        if (password.length < 6) {
          return sendError(res, 400, 'Modpas dwe gen omwen 6 karaktè');
        }

        const existing = db.findUserByEmailOrUsername(username) || db.findUserByEmailOrUsername(email);
        if (existing) {
          return sendError(res, 409, 'Non itilizatè oswa imèl sa a anrejistre deja');
        }

        const { hash, salt } = (await import('./db')).hashPassword(password);
        const userId = 'usr_' + crypto.randomUUID();
        const avatarSeed = encodeURIComponent(username.toLowerCase());
        const normEmail = email.trim().toLowerCase();
        const isServerAdmin = normEmail === ADMIN_EMAIL;

        const newUser: DBUser = {
          id: userId,
          username: username.trim().toLowerCase().replace(/^@/, ''),
          displayName: displayName.trim(),
          email: normEmail,
          passwordHash: hash,
          salt: salt,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}&backgroundColor=0f172a`,
          bio: 'Konekte sou DESIR-CHAT.',
          statusMessage: 'Disponib sou DESIR-CHAT',
          isOnline: true,
          role: isServerAdmin ? 'admin' : 'user',
          isSuspended: false,
          blockedUserIds: [],
          privacySettings: { readReceipts: true, lastSeen: 'everyone' },
          notificationSettings: { sound: true, inAppBanners: true },
          lastSeen: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        db.createUser(newUser);
        db.ensureUserInWelcomeChat(newUser.id);
        const token = db.createSession(newUser.id);

        return sendJson(res, 201, { token, user: sanitizeUser(newUser) });
      }

      // --- AUTH: Login ---
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { identifier, password } = body;

        if (!identifier || !password) {
          return sendError(res, 400, 'Tanpri antre imèl/idantifyan ak modpas ou');
        }

        const user = db.findUserByEmailOrUsername(identifier);
        if (!user) {
          return sendError(res, 401, 'Idantifyan oswa modpas pa kòrèk');
        }

        if (user.isSuspended) {
          return sendError(res, 403, 'Kont sa a sispann pa yon administratè. Kontakte sipò.');
        }

        const isValid = (await import('./db')).verifyPassword(password, user.passwordHash, user.salt);
        if (!isValid) {
          return sendError(res, 401, 'Idantifyan oswa modpas pa kòrèk');
        }

        if (user.email.toLowerCase() === ADMIN_EMAIL && user.role !== 'admin') {
          user.role = 'admin';
          db.updateUser(user.id, { role: 'admin' });
        }

        db.ensureUserInWelcomeChat(user.id);
        db.updateUser(user.id, { isOnline: true, lastSeen: new Date().toISOString() });
        const token = db.createSession(user.id);

        return sendJson(res, 200, { token, user: sanitizeUser(user) });
      }

      // --- AUTH: Reset Password ---
      if (pathname === '/api/auth/reset-password' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { email, newPassword } = body;
        if (!email || !newPassword) {
          return sendError(res, 400, 'Imèl ak nouvo modpas obligatwa');
        }
        const user = db.findUserByEmailOrUsername(email);
        if (!user) {
          return sendJson(res, 200, { message: 'Si yon kont egziste, modpas la mete ajou.' });
        }
        const { hash, salt } = (await import('./db')).hashPassword(newPassword);
        db.updateUser(user.id, { passwordHash: hash, salt });
        return sendJson(res, 200, { message: 'Modpas mete ajou avèk siksè.' });
      }

      // --- AUTH: Logout ---
      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        const token = getBearerToken(req);
        if (token) {
          const user = db.validateSession(token);
          if (user) {
            db.updateUser(user.id, { isOnline: false, lastSeen: new Date().toISOString() });
            broadcastSSE('presence', { userId: user.id, isOnline: false, lastSeen: new Date().toISOString() });
          }
          db.deleteSession(token);
        }
        return sendJson(res, 200, { success: true });
      }

      // --- Require Authenticated User for all routes below ---
      const token = getBearerToken(req);
      if (!token) {
        return sendError(res, 401, 'Token otantifikasyon obligatwa');
      }
      const currentUser = db.validateSession(token);
      if (!currentUser) {
        return sendError(res, 401, 'Sesyon an ekspire oswa pa valab');
      }
      if (currentUser.isSuspended) {
        return sendError(res, 403, 'Kont sa a sispann');
      }

      // --- AUTH: Me ---
      if (pathname === '/api/auth/me' && req.method === 'GET') {
        return sendJson(res, 200, { user: sanitizeUser(currentUser) });
      }

      // ==========================================
      // --- ADMIN PROTECTED ROUTES ---
      // ==========================================
      if (pathname.startsWith('/api/admin/')) {
        if (!isUserAdmin(currentUser)) {
          return sendError(res, 403, 'Aksè refize: Ou pa gen wòl administratè');
        }

        if (pathname === '/api/admin/users' && req.method === 'GET') {
          const allUsers = db.getAllUsers().map(sanitizeUser);
          return sendJson(res, 200, { users: allUsers });
        }

        if (pathname.match(/^\/api\/admin\/users\/[^/]+\/suspend$/) && req.method === 'POST') {
          const targetUserId = pathname.split('/')[4];
          const targetUser = db.findUserById(targetUserId);
          if (!targetUser) return sendError(res, 404, 'Itilizatè pa jwenn');

          if (targetUser.email.toLowerCase() === ADMIN_EMAIL) {
            return sendError(res, 400, 'Ou pa ka sispann kont prensipal administratè a.');
          }

          const body = await parseJsonBody(req);
          const suspended = !!body.suspended;
          const updated = db.suspendUser(targetUserId, suspended);
          if (suspended) {
            broadcastSSE('user_suspended', { userId: targetUserId }, [targetUserId]);
          }
          return sendJson(res, 200, { success: true, user: updated ? sanitizeUser(updated) : null });
        }

        if (pathname.match(/^\/api\/admin\/users\/[^/]+\/reset-password$/) && req.method === 'POST') {
          const targetUserId = pathname.split('/')[4];
          const body = await parseJsonBody(req);
          const { newPassword } = body;
          if (!newPassword || newPassword.length < 6) {
            return sendError(res, 400, 'Nouvo modpas la dwe gen omwen 6 karaktè.');
          }

          const { hash, salt } = (await import('./db')).hashPassword(newPassword);
          const updated = db.updateUser(targetUserId, { passwordHash: hash, salt });
          if (!updated) return sendError(res, 404, 'Itilizatè pa jwenn');
          return sendJson(res, 200, { success: true, message: 'Modpas itilizatè a reyajiste avèk siksè!' });
        }

        if (pathname.match(/^\/api\/admin\/users\/[^/]+$/) && req.method === 'DELETE') {
          const targetUserId = pathname.split('/')[4];
          const targetUser = db.findUserById(targetUserId);
          if (!targetUser) return sendError(res, 404, 'Itilizatè pa jwenn');
          if (targetUser.email.toLowerCase() === ADMIN_EMAIL) {
            return sendError(res, 400, 'Ou pa ka efase kont prensipal administratè a.');
          }
          db.deleteUser(targetUserId);
          return sendJson(res, 200, { success: true, message: 'Itilizatè efase.' });
        }

        if (pathname === '/api/admin/stats' && req.method === 'GET') {
          const stats = db.getStats();
          const hasFirebaseConfig = fs.existsSync(path.resolve(process.cwd(), 'firebase-applet-config.json'));
          return sendJson(res, 200, {
            ...stats,
            adminEmail: ADMIN_EMAIL,
            uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
            firebaseConfigured: hasFirebaseConfig
          });
        }
      }

      // ==========================================
      // --- WEBRTC REAL-TIME CALLS ---
      // ==========================================
      if (pathname === '/api/calls/initiate' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { targetUserId, callType } = body;

        if (!targetUserId || !['audio', 'video'].includes(callType)) {
          return sendError(res, 400, 'targetUserId ak callType (audio/video) obligatwa.');
        }

        const targetUser = db.findUserById(targetUserId);
        if (!targetUser) {
          return sendError(res, 404, 'Itilizatè pa jwenn');
        }

        // Check if recipient blocked caller
        if (db.isUserBlocked(currentUser.id, targetUserId)) {
          return sendError(res, 403, 'Itilizatè sa a pa disponib');
        }

        for (const [_, call] of activeCalls.entries()) {
          if (call.callerId === targetUserId || call.receiverId === targetUserId) {
            return sendJson(res, 200, { status: 'busy', message: 'Itilizatè a okipe nan yon lòt apèl.' });
          }
        }

        const callId = 'call_' + crypto.randomUUID();
        const callSession: CallSession = {
          id: callId,
          callerId: currentUser.id,
          receiverId: targetUserId,
          callType,
          status: 'ringing',
          startedAt: Date.now()
        };
        activeCalls.set(callId, callSession);

        broadcastSSE('incoming_call', {
          callId,
          caller: sanitizeUser(currentUser),
          callType
        }, [targetUserId]);

        return sendJson(res, 201, {
          callId,
          status: 'ringing',
          receiver: sanitizeUser(targetUser)
        });
      }

      if (pathname === '/api/calls/respond' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { callId, accept } = body;

        const call = activeCalls.get(callId);
        if (!call) {
          return sendError(res, 404, 'Apèl sa a fini oswa pa egziste.');
        }

        if (call.receiverId !== currentUser.id) {
          return sendError(res, 403, 'Ou pa moun ki resevwa apèl sa a.');
        }

        if (accept) {
          call.status = 'connected';
          broadcastSSE('call_accepted', { callId }, [call.callerId]);
          return sendJson(res, 200, { success: true, status: 'connected' });
        } else {
          activeCalls.delete(callId);
          broadcastSSE('call_rejected', { callId, reason: 'declined' }, [call.callerId]);
          return sendJson(res, 200, { success: true, status: 'declined' });
        }
      }

      if (pathname === '/api/calls/signal' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { callId, type, sdp, candidate } = body;

        const call = activeCalls.get(callId);
        if (!call) {
          return sendError(res, 404, 'Apèl la pa aktif');
        }

        const recipientId = call.callerId === currentUser.id ? call.receiverId : call.callerId;

        broadcastSSE('call_signal', {
          callId,
          senderId: currentUser.id,
          type,
          sdp,
          candidate
        }, [recipientId]);

        return sendJson(res, 200, { success: true });
      }

      if (pathname === '/api/calls/end' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { callId } = body;

        const call = activeCalls.get(callId);
        if (call) {
          const recipientId = call.callerId === currentUser.id ? call.receiverId : call.callerId;
          broadcastSSE('call_ended', { callId, endedBy: currentUser.id }, [recipientId]);
          activeCalls.delete(callId);
        }

        return sendJson(res, 200, { success: true });
      }

      // ==========================================
      // --- USERS, PROFILES, BLOCKING & PRIVACY ---
      // ==========================================
      if (pathname === '/api/users/search' && req.method === 'GET') {
        const q = url.searchParams.get('q') || '';
        const users = db.searchUsers(q, currentUser.id).map(sanitizeUser);
        return sendJson(res, 200, { users });
      }

      if (pathname === '/api/users/profile' && req.method === 'PUT') {
        const body = await parseJsonBody(req);
        const { displayName, bio, statusMessage, avatarUrl } = body;
        const updated = db.updateUser(currentUser.id, {
          ...(displayName && { displayName: displayName.slice(0, 60) }),
          ...(bio !== undefined && { bio: bio.slice(0, 200) }),
          ...(statusMessage !== undefined && { statusMessage: statusMessage.slice(0, 100) }),
          ...(avatarUrl && { avatarUrl })
        });
        if (!updated) return sendError(res, 404, 'User not found');
        return sendJson(res, 200, { user: sanitizeUser(updated) });
      }

      // Block / Unblock User
      if (pathname.match(/^\/api\/users\/[^/]+\/block$/) && req.method === 'POST') {
        const targetUserId = pathname.split('/')[3];
        const body = await parseJsonBody(req);
        const block = body.block !== false; // defaults to true
        const updated = db.blockUser(currentUser.id, targetUserId, block);
        if (!updated) return sendError(res, 404, 'User not found');
        return sendJson(res, 200, { success: true, blockedUserIds: updated.blockedUserIds });
      }

      // Privacy Settings
      if (pathname === '/api/users/privacy' && req.method === 'PUT') {
        const body = await parseJsonBody(req);
        const { readReceipts, lastSeen } = body;
        const currentPrivacy = currentUser.privacySettings || {};
        const updatedPrivacy = {
          ...currentPrivacy,
          ...(readReceipts !== undefined && { readReceipts: !!readReceipts }),
          ...(lastSeen && { lastSeen })
        };
        const updated = db.updateUser(currentUser.id, { privacySettings: updatedPrivacy });
        return sendJson(res, 200, { privacySettings: updated?.privacySettings });
      }

      // Notification Settings
      if (pathname === '/api/users/notifications' && req.method === 'PUT') {
        const body = await parseJsonBody(req);
        const { sound, inAppBanners } = body;
        const currentNotifs = currentUser.notificationSettings || {};
        const updatedNotifs = {
          ...currentNotifs,
          ...(sound !== undefined && { sound: !!sound }),
          ...(inAppBanners !== undefined && { inAppBanners: !!inAppBanners })
        };
        const updated = db.updateUser(currentUser.id, { notificationSettings: updatedNotifs });
        return sendJson(res, 200, { notificationSettings: updated?.notificationSettings });
      }

      // ==========================================
      // --- FRIENDS ---
      // ==========================================
      if (pathname === '/api/friends' && req.method === 'GET') {
        const friends = db.getFriends(currentUser.id).map(sanitizeUser);
        const requests = db.getFriendRequests(currentUser.id);
        const incomingWithUsers = requests.incoming.map(r => ({
          ...r,
          fromUser: db.findUserById(r.fromUserId) ? sanitizeUser(db.findUserById(r.fromUserId)!) : undefined
        }));
        const outgoingWithUsers = requests.outgoing.map(r => ({
          ...r,
          toUser: db.findUserById(r.toUserId) ? sanitizeUser(db.findUserById(r.toUserId)!) : undefined
        }));
        return sendJson(res, 200, { friends, incoming: incomingWithUsers, outgoing: outgoingWithUsers });
      }

      if (pathname === '/api/friends/request' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { toUserId } = body;
        if (!toUserId || toUserId === currentUser.id) {
          return sendError(res, 400, 'Invalid target user');
        }
        if (db.isUserBlocked(currentUser.id, toUserId)) {
          return sendError(res, 403, 'Ou pa ka voye demand bay itilizatè sa a');
        }
        const reqDoc = db.sendFriendRequest(currentUser.id, toUserId);
        broadcastSSE('friend_request', { request: reqDoc, fromUser: sanitizeUser(currentUser) }, [toUserId]);
        return sendJson(res, 201, { request: reqDoc });
      }

      if (pathname === '/api/friends/respond' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { requestId, accept } = body;
        const updated = db.respondFriendRequest(requestId, currentUser.id, !!accept);
        if (!updated) return sendError(res, 404, 'Request not found');
        broadcastSSE('friend_request_status', { request: updated }, [updated.fromUserId]);
        return sendJson(res, 200, { request: updated });
      }

      // ==========================================
      // --- CHATS & MESSAGES ---
      // ==========================================
      if (pathname === '/api/chats' && req.method === 'GET') {
        const chats = db.getUserChats(currentUser.id).map(chat => {
          const participants = chat.participantIds.map(pid => {
            const u = db.findUserById(pid);
            if (!u) return null;
            return sanitizeUser(u);
          }).filter(Boolean);

          const lastMsg = db.getLastMessage(chat.id, currentUser.id);
          const unreadCount = db.getUnreadCount(chat.id, currentUser.id);

          let chatTitle = chat.title;
          let chatAvatar = chat.avatarUrl;
          if (chat.type === 'direct') {
            const otherUser = participants.find(p => p && p.id !== currentUser.id);
            if (otherUser) {
              chatTitle = otherUser.displayName;
              chatAvatar = otherUser.avatarUrl;
            }
          }

          return {
            ...chat,
            title: chatTitle,
            avatarUrl: chatAvatar,
            participants,
            lastMessage: lastMsg ? {
              id: lastMsg.id,
              text: lastMsg.text,
              senderId: lastMsg.senderId,
              senderName: lastMsg.senderName,
              timestamp: lastMsg.createdAt,
              attachmentType: lastMsg.attachmentType
            } : undefined,
            unreadCount
          };
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return sendJson(res, 200, { chats });
      }

      if (pathname === '/api/chats' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { type, participantIds, title, description, avatarUrl } = body;

        if (type === 'group') {
          if (!title || !participantIds || participantIds.length === 0) {
            return sendError(res, 400, 'Group title and participants are required');
          }
          const chat = db.createGroupChat(currentUser.id, title, participantIds, avatarUrl, description);
          broadcastSSE('chat_created', { chat }, chat.participantIds);
          return sendJson(res, 201, { chat });
        } else {
          const targetId = participantIds && participantIds[0];
          if (!targetId) return sendError(res, 400, 'Target user is required');
          if (db.isUserBlocked(currentUser.id, targetId)) {
            return sendError(res, 403, 'Itilizatè sa a bloke w');
          }
          const chat = db.getOrCreateDirectChat(currentUser.id, targetId);
          return sendJson(res, 200, { chat });
        }
      }

      // Group Info Update: PUT /api/chats/:id
      if (pathname.match(/^\/api\/chats\/[^/]+$/) && req.method === 'PUT') {
        const chatId = pathname.split('/')[3];
        const body = await parseJsonBody(req);
        const updated = db.updateChatInfo(chatId, currentUser.id, body);
        if (!updated) {
          return sendError(res, 403, 'Pa gen otorizasyon pou modifye gwoup sa a');
        }
        broadcastSSE('chat_updated', { chat: updated }, updated.participantIds);
        return sendJson(res, 200, { chat: updated });
      }

      // Delete/Clear Chat for user: DELETE /api/chats/:id
      if (pathname.match(/^\/api\/chats\/[^/]+$/) && req.method === 'DELETE') {
        const chatId = pathname.split('/')[3];
        const success = db.deleteChatForUser(chatId, currentUser.id);
        if (!success) return sendError(res, 404, 'Chat not found');
        return sendJson(res, 200, { success: true });
      }

      // Add Member to Group: POST /api/chats/:id/members
      if (pathname.match(/^\/api\/chats\/[^/]+\/members$/) && req.method === 'POST') {
        const chatId = pathname.split('/')[3];
        const body = await parseJsonBody(req);
        const { userId } = body;
        if (!userId) return sendError(res, 400, 'userId required');
        const updated = db.addGroupMember(chatId, currentUser.id, userId);
        if (!updated) {
          return sendError(res, 403, 'Ou pa ka ajoute manm nan gwoup sa a');
        }
        broadcastSSE('chat_updated', { chat: updated }, updated.participantIds);
        return sendJson(res, 200, { chat: updated });
      }

      // Remove Member from Group / Leave: DELETE /api/chats/:id/members/:userId
      if (pathname.match(/^\/api\/chats\/[^/]+\/members\/[^/]+$/) && req.method === 'DELETE') {
        const parts = pathname.split('/');
        const chatId = parts[3];
        const targetUserId = parts[5];
        const updated = db.removeGroupMember(chatId, currentUser.id, targetUserId);
        if (!updated) {
          return sendError(res, 403, 'Ou pa gen otorizasyon pou retire manm sa a');
        }
        broadcastSSE('chat_updated', { chat: updated }, [...updated.participantIds, targetUserId]);
        return sendJson(res, 200, { chat: updated });
      }

      // Get Chat Messages: GET /api/chats/:id/messages
      if (pathname.match(/^\/api\/chats\/[^/]+\/messages$/) && req.method === 'GET') {
        const chatId = pathname.split('/')[3];
        const chat = db.getChatById(chatId);
        if (!chat || !chat.participantIds.includes(currentUser.id)) {
          return sendError(res, 403, 'Forbidden');
        }
        const messages = db.getChatMessages(chatId, currentUser.id);
        db.markMessagesRead(chatId, currentUser.id);
        broadcastSSE('messages_read', { chatId, userId: currentUser.id }, chat.participantIds);
        return sendJson(res, 200, { messages });
      }

      // Post Chat Message: POST /api/chats/:id/messages
      if (pathname.match(/^\/api\/chats\/[^/]+\/messages$/) && req.method === 'POST') {
        const chatId = pathname.split('/')[3];
        const chat = db.getChatById(chatId);
        if (!chat || !chat.participantIds.includes(currentUser.id)) {
          return sendError(res, 403, 'Forbidden');
        }

        // Check if recipient in direct chat has blocked current user
        if (chat.type === 'direct') {
          const otherUserId = chat.participantIds.find(id => id !== currentUser.id);
          if (otherUserId && db.isUserBlocked(currentUser.id, otherUserId)) {
            return sendError(res, 403, 'Itilizatè sa a bloke w. Ou pa ka voye mesaj.');
          }
        }

        const body = await parseJsonBody(req);
        const {
          text,
          attachmentType,
          attachmentUrl,
          attachmentName,
          attachmentSize,
          audioDuration,
          replyTo,
          isForwarded
        } = body;

        if (!text && (!attachmentType || attachmentType === 'none')) {
          return sendError(res, 400, 'Message cannot be empty');
        }

        // Check online status of other participants to set initial status (sent vs delivered)
        const otherParticipantIds = chat.participantIds.filter(id => id !== currentUser.id);
        const anyOtherOnline = Array.from(sseClients).some(c => otherParticipantIds.includes(c.userId));

        const msg: DBMessage = {
          id: 'msg_' + crypto.randomUUID(),
          chatId,
          senderId: currentUser.id,
          senderName: currentUser.displayName,
          senderAvatar: currentUser.avatarUrl,
          text: (text || '').slice(0, 4000),
          attachmentType: attachmentType || 'none',
          attachmentUrl,
          attachmentName,
          attachmentSize,
          audioDuration,
          status: anyOtherOnline ? 'delivered' : 'sent',
          readBy: [currentUser.id],
          replyTo: replyTo ? {
            id: replyTo.id,
            senderName: replyTo.senderName,
            text: replyTo.text,
            attachmentType: replyTo.attachmentType
          } : undefined,
          isForwarded: !!isForwarded,
          deletedForEveryone: false,
          deletedForUserIds: [],
          createdAt: new Date().toISOString()
        };

        const createdMsg = db.createMessage(msg);
        broadcastSSE('new_message', { message: createdMsg, chatId }, chat.participantIds);
        return sendJson(res, 201, { message: createdMsg });
      }

      // Delete Message: POST /api/messages/:id/delete
      if (pathname.match(/^\/api\/messages\/[^/]+\/delete$/) && req.method === 'POST') {
        const messageId = pathname.split('/')[3];
        const body = await parseJsonBody(req);
        const forEveryone = !!body.forEveryone;

        const updated = db.deleteMessage(messageId, currentUser.id, forEveryone);
        if (!updated) {
          return sendError(res, 404, 'Message not found or not permitted');
        }

        const chat = db.getChatById(updated.chatId);
        if (forEveryone && chat) {
          broadcastSSE('message_deleted_everyone', { messageId, chatId: chat.id }, chat.participantIds);
        }

        return sendJson(res, 200, { success: true, message: updated });
      }

      // Mark Read: PUT /api/chats/:id/read
      if (pathname.match(/^\/api\/chats\/[^/]+\/read$/) && req.method === 'PUT') {
        const chatId = pathname.split('/')[3];
        const chat = db.getChatById(chatId);
        if (chat && chat.participantIds.includes(currentUser.id)) {
          db.markMessagesRead(chatId, currentUser.id);
          broadcastSSE('messages_read', { chatId, userId: currentUser.id }, chat.participantIds);
        }
        return sendJson(res, 200, { success: true });
      }

      // Typing Indicator: POST /api/chats/:id/typing
      if (pathname.match(/^\/api\/chats\/[^/]+\/typing$/) && req.method === 'POST') {
        const chatId = pathname.split('/')[3];
        const chat = db.getChatById(chatId);
        if (chat && chat.participantIds.includes(currentUser.id)) {
          const body = await parseJsonBody(req);
          broadcastSSE('typing', {
            chatId,
            userId: currentUser.id,
            userName: currentUser.displayName,
            isTyping: !!body.isTyping
          }, chat.participantIds.filter(id => id !== currentUser.id));
        }
        return sendJson(res, 200, { success: true });
      }

      // ==========================================
      // --- UPLOAD: Photos, Audio, Video, Files ---
      // ==========================================
      if (pathname === '/api/upload' && req.method === 'POST') {
        const contentType = req.headers['content-type'] || '';

        if (contentType.includes('application/json')) {
          const body = await parseJsonBody(req);
          const { dataUrl, filename, mimeType, duration } = body;
          if (!dataUrl) {
            return sendError(res, 400, 'Missing dataUrl');
          }

          const matches = dataUrl.match(/^data:([A-Za-z-+\/0-9]+);base64,(.+)$/);
          if (!matches || matches.length !== 3) {
            return sendError(res, 400, 'Invalid data URL format');
          }

          const fileMime = mimeType || matches[1];
          const buffer = Buffer.from(matches[2], 'base64');

          let extension = '.bin';
          for (const [ext, mime] of Object.entries(MIME_MAP)) {
            if (mime === fileMime) {
              extension = ext;
              break;
            }
          }
          if (fileMime.includes('webm')) extension = '.webm';
          if (fileMime.includes('ogg')) extension = '.ogg';
          if (fileMime.includes('wav')) extension = '.wav';
          if (fileMime.includes('mp4')) extension = '.mp4';
          if (fileMime.includes('jpeg') || fileMime.includes('jpg')) extension = '.jpg';
          if (fileMime.includes('png')) extension = '.png';

          const safeId = crypto.randomUUID();
          const targetFilename = `${safeId}${extension}`;
          const targetPath = path.join(uploadsDir, targetFilename);

          fs.writeFileSync(targetPath, buffer);

          return sendJson(res, 201, {
            url: `/api/files/${targetFilename}`,
            filename: targetFilename,
            originalName: filename || targetFilename,
            size: buffer.length,
            mimeType: fileMime,
            duration: duration || undefined
          });
        }

        const rawBuffer = await parseRawBody(req);
        if (rawBuffer.length === 0) {
          return sendError(res, 400, 'Empty upload');
        }

        const ext = pathname.split('.').pop() || 'bin';
        const safeId = crypto.randomUUID();
        const targetFilename = `${safeId}.${ext}`;
        const targetPath = path.join(uploadsDir, targetFilename);

        fs.writeFileSync(targetPath, rawBuffer);

        return sendJson(res, 201, {
          url: `/api/files/${targetFilename}`,
          filename: targetFilename,
          size: rawBuffer.length,
          mimeType: contentType
        });
      }

      return sendError(res, 404, 'Endpoint not found');
    } catch (err: any) {
      console.error('API Error:', err);
      return sendError(res, 500, err.message || 'Internal Server Error');
    }
  };
}
