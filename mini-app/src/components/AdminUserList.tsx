import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/api/adminClient';
import { AdminUserSearch } from './AdminUserSearch';
import { AdminUserRow } from './AdminUserRow';
import { AdminPagination } from './AdminPagination';
import { AdminUserDetail, type UserDetail } from './AdminUserDetail';

interface UserSummary {
  id: number;
  telegram_id: number;
  display_name: string;
  xp: number;
  level: number;
  active_modes: string[];
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

  if (selectedUser) {
    return <AdminUserDetail user={selectedUser} onBack={() => setSelectedUser(null)} />;
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-xl p-4 h-16 skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AdminUserSearch value={searchQuery} onChange={setSearchQuery} />

      <div className="space-y-1.5">
        {filteredUsers.map((user) => (
          <AdminUserRow key={user.id} user={user} onClick={() => fetchUserDetail(user.id)} />
        ))}
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-telegram-hint text-sm">
            {searchQuery ? 'No users found' : 'No users yet'}
          </div>
        )}
      </div>

      {totalPages > 1 && !searchQuery && (
        <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {detailLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="w-8 h-8 border-2 border-telegram-button/30 border-t-telegram-button rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
