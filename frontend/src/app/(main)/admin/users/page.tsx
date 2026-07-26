'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  MoreHorizontal,
  CheckSquare,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';

type AdminUser = {
  id: string;
  email: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  role: string;
  status: string;
  createdAt: string;
  _count?: {
    orders?: number;
    products?: number;
  };
};

type UsersResponse = {
  data: AdminUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'BUYER', label: 'Buyer' },
  { value: 'SELLER', label: 'Seller' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MODERATOR', label: 'Moderator' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DELETED', label: 'Deleted' },
];

const ROLE_BADGE: Record<string, 'default' | 'brand' | 'outline' | 'success'> = {
  BUYER: 'default',
  SELLER: 'brand',
  ADMIN: 'success',
  MODERATOR: 'outline',
  SUPER_ADMIN: 'success',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PENDING_VERIFICATION: 'bg-amber-100 text-amber-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  DELETED: 'bg-ink-100 text-ink-600',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkConfirmDialog, setShowBulkConfirmDialog] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchUsers = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (search) params.set('search', search);
        if (roleFilter) params.set('role', roleFilter);
        if (statusFilter) params.set('status', statusFilter);
        const res = await apiClient.get<UsersResponse>(`/admin/users?${params}`);
        setUsers(res.data ?? []);
        setMeta(res.meta);
      } catch {
        setError('Failed to load users. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [search, roleFilter, statusFilter],
  );

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    fetchUsers();
  }, [user, router, fetchUsers]);

  const handleSearch = () => {
    setSelected(new Set());
    setSearch(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u) => u.id)));
    }
  };

  const executeBulkAction = async () => {
    if (!bulkAction) return;
    setBulkLoading(true);
    try {
      await apiClient.post('/admin/users/bulk', {
        userIds: Array.from(selected),
        action: bulkAction,
      });
      setSelected(new Set());
      setBulkAction('');
      setShowBulkConfirmDialog(false);
      await fetchUsers(meta.page);
    } catch { /* ignore */ } finally { setBulkLoading(false); }
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">User Management</h1>
          <p className="mt-1 text-sm text-ink-500">
            {meta.total} total users on the platform
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            placeholder="Search by name, email, or username..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          Search
        </Button>
        <Select
          options={ROLE_OPTIONS}
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setSelected(new Set()); }}
          className="w-auto min-w-[140px]"
        />
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setSelected(new Set()); }}
          className="w-auto min-w-[160px]"
        />
        <Button variant="outline" size="sm" onClick={() => fetchUsers(meta.page)}>
          Refresh
        </Button>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
          <CheckSquare className="h-4 w-4 text-brand-600" />
          <span className="text-sm font-medium text-brand-700">
            {selected.size} user{selected.size > 1 ? 's' : ''} selected
          </span>
          <Select
            options={[
              { value: 'activate', label: 'Activate' },
              { value: 'suspend', label: 'Suspend' },
              { value: 'delete', label: 'Delete' },
            ]}
            placeholder="Bulk Actions"
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="w-auto min-w-[150px]"
          />
          <Button
            variant="brand"
            size="sm"
            disabled={!bulkAction || bulkLoading}
            onClick={() => {
              if (bulkAction === 'delete') {
                setShowBulkConfirmDialog(true);
              } else {
                executeBulkAction();
              }
            }}
          >
            {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Apply
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-ink-100 animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Users className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No users found</p>
          <p className="mt-1 text-sm text-ink-400">Try adjusting your filters or search terms</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/50">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === users.length && users.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-ink-300 accent-brand-600"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-ink-600">User</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Email</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Role</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Status</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Joined</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className={cn(
                      'border-b border-ink-50 transition hover:bg-ink-50/50 cursor-pointer',
                      selected.has(u.id) && 'bg-brand-50/30',
                    )}
                    onClick={() => router.push(`/admin/users/${u.id}`)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        className="h-4 w-4 rounded border-ink-300 accent-brand-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-ink-100">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-ink-500">
                              {(u.displayName || u.username).charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-ink-900 truncate">
                            {u.displayName || u.username}
                          </p>
                          <p className="text-xs text-ink-400 truncate">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_BADGE[u.role] || 'default'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_BADGE[u.status] || 'bg-ink-100 text-ink-600')}>
                        {u.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-500">
                      {new Date(u.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/admin/users/${u.id}`}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {users.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="block rounded-2xl border border-ink-100 bg-white p-4 shadow-soft transition hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-ink-100">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-ink-500">
                        {(u.displayName || u.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink-900 truncate">
                      {u.displayName || u.username}
                    </p>
                    <p className="text-xs text-ink-400 truncate">{u.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={ROLE_BADGE[u.role] || 'default'}>{u.role}</Badge>
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_BADGE[u.status] || 'bg-ink-100 text-ink-600')}>
                      {u.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-ink-400">
                  Joined {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => fetchUsers(meta.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-ink-500">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page >= meta.totalPages}
            onClick={() => fetchUsers(meta.page + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Bulk Confirm Dialog */}
      <Dialog open={showBulkConfirmDialog} onClose={() => setShowBulkConfirmDialog(false)}>
        <DialogHeader>Confirm Bulk Action</DialogHeader>
        <DialogBody>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  This action cannot be undone
                </p>
                <p className="mt-1 text-sm text-red-700">
                  Are you sure you want to delete {selected.size} user{selected.size > 1 ? 's' : ''}?
                </p>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowBulkConfirmDialog(false)}>Cancel</Button>
          <Button variant="destructive" onClick={executeBulkAction} disabled={bulkLoading}>
            {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Delete {selected.size} user{selected.size > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
