import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  MessageSquare,
  Activity,
  UserCheck,
  UserX,
  KeyRound,
  Trash2,
  RefreshCw,
  Search,
  Server,
  Cloud,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AdminStats, User } from '../../types';
import { Avatar } from '../common/Avatar';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  const loadData = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminStats(),
      ]);
      setUsers(usersRes.users);
      setStats(statsRes);
    } catch (err: any) {
      setActionMessage(err.message || 'Erè nan chaje done admin yo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#0B0F19] text-white">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-base font-bold">Aksè Refize</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Paj sa a rezève sèlman pou administratè sistèm nan ({user?.email}).
        </p>
      </div>
    );
  }

  const handleToggleSuspend = async (targetUser: User) => {
    try {
      const nextState = !targetUser.isSuspended;
      await api.suspendUser(targetUser.id, nextState);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isSuspended: nextState } : u))
      );
      setActionMessage(
        nextState
          ? `Itilizatè @${targetUser.username} sispann avèk siksè.`
          : `Kont @${targetUser.username} re-aktive.`
      );
    } catch (err: any) {
      setActionMessage(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPassword.trim()) return;

    try {
      await api.resetUserPassword(resetModalUser.id, newPassword.trim());
      setActionMessage(`Modpas @${resetModalUser.username} reyajiste avèk siksè!`);
      setResetModalUser(null);
      setNewPassword('');
    } catch (err: any) {
      setActionMessage(err.message);
    }
  };

  const handleDeleteUser = async (targetUserId: string, username: string) => {
    if (!window.confirm(`Èske w sèten ou vle efase kont @${username}?`)) return;

    try {
      await api.deleteUser(targetUserId);
      setUsers((prev) => prev.filter((u) => u.id !== targetUserId));
      setActionMessage(`Kont @${username} efase.`);
    } catch (err: any) {
      setActionMessage(err.message);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F19] overflow-y-auto pb-24 text-slate-100 select-none">
      {/* Admin Top Header */}
      <div className="p-4 bg-[#131D36] border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-extrabold text-white tracking-tight">
              Panèl Administratè
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
              ADMIN
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Konekte kòm: <span className="text-cyan-400 font-mono">{user.email}</span>
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95"
          title="Rafrechi"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {actionMessage && (
        <div className="mx-4 mt-3 p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-cyan-300 text-xs text-center animate-in fade-in">
          {actionMessage}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-2.5 p-4">
        <div className="p-3 rounded-2xl bg-[#131D36]/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Itilizatè Total</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-black text-white">{stats?.totalUsers ?? '...'}</p>
        </div>

        <div className="p-3 rounded-2xl bg-[#131D36]/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Mesaj Voye</span>
            <MessageSquare className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-xl font-black text-white">{stats?.totalMessages ?? '...'}</p>
        </div>

        <div className="p-3 rounded-2xl bg-[#131D36]/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Gwoup & Diskisyon</span>
            <Server className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-black text-white">{stats?.totalChats ?? '...'}</p>
        </div>

        <div className="p-3 rounded-2xl bg-[#131D36]/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Sesyon Aktif</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-white">{stats?.activeSessions ?? '...'}</p>
        </div>
      </div>

      {/* Firebase Status Banner */}
      <div className="mx-4 mb-4 p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30">
        <div className="flex items-center space-x-2 mb-1.5">
          <Cloud className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-white">Estati Firebase & Cloud Firestore</h4>
        </div>
        <div className="flex items-center space-x-2 text-[11px] text-slate-300">
          {stats?.firebaseConfigured ? (
            <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Firebase Konfigire & Aktif</span>
            </span>
          ) : (
            <div className="space-y-1">
              <span className="flex items-center space-x-1 text-amber-400 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Baz done lokal aktif (Backup sekirize nan /data)</span>
              </span>
              <p className="text-[10px] text-slate-400">
                Pou konekte Firebase Auth ak Admin SDK: Telechaje kle sèvis la nan Firebase Console (Project Settings → Service Accounts) epi mete l nan anviwònman sèvè a.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* User Management Section */}
      <div className="px-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Jesyon Kont Itilizatè yo ({filteredUsers.length})
          </h3>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Chèche pa imèl, non oswa @username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#131D36] border border-slate-700/80 rounded-2xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Users List */}
        <div className="space-y-2">
          {filteredUsers.map((u) => {
            const isTargetAdmin = u.role === 'admin';

            return (
              <div
                key={u.id}
                className={`p-3 rounded-2xl border transition ${
                  u.isSuspended
                    ? 'bg-rose-950/20 border-rose-900/40'
                    : 'bg-[#131D36]/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2.5">
                    <Avatar src={u.avatarUrl} name={u.displayName} size="sm" isOnline={u.isOnline} />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-white">{u.displayName}</span>
                        {isTargetAdmin && (
                          <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold rounded">
                            ADMIN
                          </span>
                        )}
                        {u.isSuspended && (
                          <span className="px-1.5 py-0.2 bg-rose-900 text-rose-200 text-[9px] font-bold rounded">
                            SISPANNN
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        @{u.username} • {u.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-end space-x-2 border-t border-slate-800/80 pt-2 text-xs">
                  {/* Suspend / Reactivate */}
                  {!isTargetAdmin && (
                    <button
                      onClick={() => handleToggleSuspend(u)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center space-x-1 transition active:scale-95 ${
                        u.isSuspended
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {u.isSuspended ? (
                        <>
                          <UserCheck className="w-3 h-3" />
                          <span>Re-aktive</span>
                        </>
                      ) : (
                        <>
                          <UserX className="w-3 h-3" />
                          <span>Sispann</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Reset Password */}
                  <button
                    onClick={() => {
                      setResetModalUser(u);
                      setNewPassword('');
                    }}
                    className="px-2.5 py-1 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-cyan-300 border border-blue-500/30 text-[11px] font-semibold flex items-center space-x-1 transition active:scale-95"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Modpas</span>
                  </button>

                  {/* Delete */}
                  {!isTargetAdmin && (
                    <button
                      onClick={() => handleDeleteUser(u.id, u.username)}
                      className="p-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                      title="Efase Kont"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xs bg-[#0F172A] border border-slate-700 rounded-3xl p-5 shadow-2xl">
            <h3 className="text-xs font-bold text-white mb-1">
              Reyajiste Modpas pou @{resetModalUser.username}
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">{resetModalUser.email}</p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="password"
                required
                placeholder="Nouvo modpas (min. 6 karaktè)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#151F38] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="flex-1 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Anile
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                >
                  Konfime
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
