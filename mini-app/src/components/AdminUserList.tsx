import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, User, ArrowLeft, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface UserSummary {
  id: number;
  telegram_id: number;
  display_name: string;
  xp: number;
  level: number;
  active_modes: string[];
  last_active: string;
}

interface UserDetail {
  id: number;
  telegram_id: number;
  display_name: string;
  username: string | null;
  xp: number;
  level: number;
  streak_days: number;
  active_modes: string[];
  quests_completed: number;
  achievements_unlocked: number;
  created_at: string;
  last_active: string;
}

interface AdminUserListProps {
  credentials: string;
}

export function AdminUserList({ credentials }: AdminUserListProps) {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 20;

  const fetchUsers = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/admin/users?page=${p}&limit=${limit}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Basic ${credentials}` },
      });
      if (res.ok) {
        const data = await res.json();
        const userList = data.data?.users || data.users || [];
        const total = data.data?.total || data.total || userList.length;
        setUsers(userList);
        setTotalPages(Math.max(1, Math.ceil(total / limit)));
      }
    } catch {
      // Network error
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  useEffect(() => {
    fetchUsers(page);
  }, [page, fetchUsers]);

  const fetchUserDetail = useCallback(async (userId: number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        headers: { 'Authorization': `Basic ${credentials}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data.data || data);
      }
    } catch {
      // Network error
    } finally {
      setDetailLoading(false);
    }
  }, [credentials]);

  const filteredUsers = searchQuery.trim()
    ? users.filter((u) =>
        u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(u.telegram_id).includes(searchQuery)
      )
    : users;

  // User detail view
  if (selectedUser) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        <button
          onClick={() => setSelectedUser(null)}
          className="flex items-center gap-1 text-sm text-telegram-link"
        >
          <ArrowLeft size={16} />
          Back to list
        </button>

        <div className="bg-telegram-secondaryBg rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-telegram-button/10 rounded-full flex items-center justify-center">
              <User size={24} className="text-telegram-button" />
            </div>
            <div>
              <div className="font-bold text-telegram-text">{selectedUser.display_name}</div>
              <div className="text-sm text-telegram-hint">
                {selectedUser.username ? `@${selectedUser.username}` : `ID: ${selectedUser.telegram_id}`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Level', value: selectedUser.level },
              { label: 'XP', value: selectedUser.xp.toLocaleString() },
              { label: 'Streak', value: `${selectedUser.streak_days}d` },
              { label: 'Quests Done', value: selectedUser.quests_completed },
              { label: 'Achievements', value: selectedUser.achievements_unlocked },
              { label: 'Telegram ID', value: selectedUser.telegram_id },
            ].map((item) => (
              <div key={item.label} className="bg-telegram-bg rounded-lg p-3">
                <div className="text-xs text-telegram-hint">{item.label}</div>
                <div className="font-semibold text-telegram-text">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="text-xs text-telegram-hint">Active Modes</div>
            <div className="flex flex-wrap gap-1.5">
              {selectedUser.active_modes.length > 0 ? (
                selectedUser.active_modes.map((mode) => (
                  <span key={mode} className="px-2 py-1 bg-telegram-button/10 text-telegram-button text-xs rounded-lg">
                    {mode}
                  </span>
                ))
              ) : (
                <span className="text-sm text-telegram-hint">No active modes</span>
              )}
            </div>
          </div>

          <div className="flex justify-between text-xs text-telegram-hint pt-2 border-t border-telegram-hint/10">
            <span>Joined: {new Date(selectedUser.created_at).toLocaleDateString()}</span>
            <span>Last active: {new Date(selectedUser.last_active).toLocaleDateString()}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-xl p-4 h-16 skeleton" />
        ))}
      </div>
    );
  }

  // User list
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-telegram-hint" />
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-telegram-secondaryBg rounded-xl text-sm text-telegram-text placeholder-telegram-hint border border-telegram-hint/10 focus:border-telegram-button focus:outline-none transition-colors"
        />
      </div>

      {/* User rows */}
      <div className="space-y-1.5">
        {filteredUsers.map((user) => (
          <motion.button
            key={user.id}
            onClick={() => fetchUserDetail(user.id)}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-telegram-secondaryBg rounded-xl p-3 flex items-center gap-3 text-left"
          >
            <div className="w-9 h-9 bg-telegram-button/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-telegram-button" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-telegram-text truncate">{user.display_name}</div>
              <div className="text-xs text-telegram-hint">
                Lv.{user.level} · {user.xp.toLocaleString()} XP
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-telegram-hint">
                {new Date(user.last_active).toLocaleDateString()}
              </div>
              <div className="flex gap-1 mt-0.5 justify-end">
                {user.active_modes.slice(0, 2).map((mode) => (
                  <span key={mode} className="px-1.5 py-0.5 bg-telegram-button/10 text-telegram-button text-[10px] rounded">
                    {mode}
                  </span>
                ))}
              </div>
            </div>
          </motion.button>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-telegram-hint text-sm">
            {searchQuery ? 'No users found' : 'No users yet'}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && !searchQuery && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-9 h-9 rounded-lg bg-telegram-secondaryBg flex items-center justify-center disabled:opacity-30 text-telegram-text"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-telegram-hint">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-9 h-9 rounded-lg bg-telegram-secondaryBg flex items-center justify-center disabled:opacity-30 text-telegram-text"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {detailLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40">
          <div className="w-8 h-8 border-2 border-telegram-button/30 border-t-telegram-button rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
