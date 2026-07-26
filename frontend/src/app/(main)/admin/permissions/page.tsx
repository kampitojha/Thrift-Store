'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type Permission = {
  key: string;
  label: string;
  group: string;
};

const GROUP_ICONS: Record<string, string> = {
  Users: '👤', Products: '📦', Orders: '🛒', Payments: '💳',
  Refunds: '↩️', Reports: '📊', Disputes: '⚖️', Sellers: '🏪',
  Analytics: '📈', CMS: '📝', Coupons: '🏷️', Wallet: '👛',
  Support: '🎫', Settings: '⚙️', 'Feature Flags': '🚩', Audit: '📋', Fraud: '🛡️',
};

export default function AdminPermissionsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<Permission[]>('/admin/permissions');
      setPermissions(res);
    } catch {
      setError('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) { router.push('/'); return; }
    fetchPermissions();
  }, [user, router, fetchPermissions]);

  const groups = [...new Set(permissions.map((p) => p.group))].sort();

  const filtered = permissions.filter((p) => {
    if (groupFilter !== 'ALL' && p.group !== groupFilter) return false;
    if (search && !p.label.toLowerCase().includes(search.toLowerCase()) && !p.key.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const groupedFiltered = filtered.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {});

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            Permissions Catalog
          </h1>
          <p className="mt-1 text-sm text-ink-500">{permissions.length} permissions across {groups.length} groups</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPermissions}><RefreshCw className="mr-1.5 h-4 w-4" />Refresh</Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input placeholder="Search permissions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700">
          <option value="ALL">All groups</option>
          {groups.map((g) => <option key={g} value={g}>{GROUP_ICONS[g] || '📌'} {g}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-red-200 py-24 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchPermissions}>Retry</Button>
        </div>
      ) : Object.keys(groupedFiltered).length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No permissions found</p>
          <p className="text-sm text-ink-500">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFiltered).map(([group, perms]) => (
            <div key={group} className="rounded-2xl border border-ink-100 bg-white shadow-soft overflow-hidden">
              <div className="flex items-center gap-3 border-b border-ink-100 bg-ink-50 px-6 py-3">
                <span className="text-lg">{GROUP_ICONS[group] || '📌'}</span>
                <h2 className="font-display text-sm font-semibold text-ink-900">{group}</h2>
                <Badge variant="outline">{perms.length} permissions</Badge>
              </div>
              <div className="divide-y divide-ink-50">
                {perms.map((perm) => (
                  <div key={perm.key} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-900">{perm.label}</p>
                      <p className="text-xs text-ink-400 font-mono mt-0.5">{perm.key}</p>
                    </div>
                    <Badge variant="outline" className="ml-3 shrink-0">{group}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
