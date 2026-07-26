'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  User,
  Shield,
  Store,
  ShoppingCart,
  CreditCard,
  Settings,
  Activity,
  Clock,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type AuditData = {
  data: Array<{
    id: string;
    userId: string | null;
    action: string;
    entityType: string | null;
    entityId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: any;
    createdAt: string;
    user: { id: string; username: string; avatarUrl: string | null } | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const ENTITY_OPTIONS = [
  { value: '', label: 'All entity types' },
  { value: 'User', label: 'User' },
  { value: 'Order', label: 'Order' },
  { value: 'Product', label: 'Product' },
  { value: 'Payment', label: 'Payment' },
  { value: 'Settings', label: 'Settings' },
];

const ACTION_BADGE: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  LOGIN: 'bg-ink-100 text-ink-800',
  LOGOUT: 'bg-ink-100 text-ink-600',
  APPROVE: 'bg-emerald-100 text-emerald-800',
  REJECT: 'bg-red-100 text-red-800',
  FLAG: 'bg-amber-100 text-amber-800',
  ARCHIVE: 'bg-ink-100 text-ink-600',
  RESTORE: 'bg-purple-100 text-purple-800',
};

const ENTITY_ICON: Record<string, React.ReactNode> = {
  User: <User className="h-3.5 w-3.5" />,
  Order: <ShoppingCart className="h-3.5 w-3.5" />,
  Product: <Store className="h-3.5 w-3.5" />,
  Payment: <CreditCard className="h-3.5 w-3.5" />,
  Settings: <Settings className="h-3.5 w-3.5" />,
};

function describeAction(action: string, entityType: string | null): string {
  const entity = entityType || 'Entry';
  switch (action) {
    case 'CREATE': return `${entity} created`;
    case 'UPDATE': return `${entity} updated`;
    case 'DELETE': return `${entity} deleted`;
    case 'LOGIN': return `User logged in`;
    case 'LOGOUT': return `User logged out`;
    case 'APPROVE': return `${entity} approved`;
    case 'REJECT': return `${entity} rejected`;
    case 'FLAG': return `${entity} flagged`;
    case 'ARCHIVE': return `${entity} archived`;
    case 'RESTORE': return `${entity} restored`;
    default: return `${action} ${entity}`;
  }
}

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase();
}

export default function AdminPlatformAuditPage() {
  const [entries, setEntries] = useState<AuditData['data']>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityType, setEntityType] = useState('');
  const [actionSearch, setActionSearch] = useState('');
  const [actionSearchInput, setActionSearchInput] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '25' });
      if (entityType) params.set('entityType', entityType);
      if (actionSearch) params.set('action', actionSearch);
      const res = await apiClient.get<AuditData>(`/admin/platform/audit-logs?${params}`);
      setEntries(res.data ?? []);
      setTotal(res.total ?? 0);
      setPage(res.page ?? 1);
      setTotalPages(res.totalPages ?? 1);
    } catch {
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [entityType, actionSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActionSearch(actionSearchInput);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <ScrollText className="h-6 w-6 text-brand-600" />
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Track all actions performed across the platform
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLogs(page)}>
          <RefreshCcw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-ink-400" />
        <select
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
          className="h-11 min-w-[160px] rounded-xl border border-input bg-white px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Filter by entity type"
        >
          {ENTITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Search action..."
              aria-label="Search audit actions"
              value={actionSearchInput}
              onChange={(e) => setActionSearchInput(e.target.value)}
              className="h-11 w-full min-w-[200px] rounded-xl border border-input bg-white pl-10 pr-4 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="h-11">
            Search
          </Button>
        </form>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-ink-100 bg-white shadow-soft" role="status" aria-busy="true">
          <div className="divide-y divide-ink-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center" role="alert">
          <ScrollText className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchLogs()}>
            Try Again
          </Button>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Activity className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No audit logs found</p>
          <p className="text-sm text-ink-500">Try adjusting your filters or search term</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl border border-ink-100 bg-white shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">IP Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {entries.map((entry) => (
                    <AuditRow
                      key={entry.id}
                      entry={entry}
                      expanded={expandedId === entry.id}
                      onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {entries.map((entry) => (
              <MobileAuditCard
                key={entry.id}
                entry={entry}
                expanded={expandedId === entry.id}
                onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => fetchLogs(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-ink-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => fetchLogs(page + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-ink-400">{total} total audit logs</p>
        </>
      )}
    </div>
  );
}

function AuditRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: AuditData['data'][number];
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasMetadata = entry.metadata && typeof entry.metadata === 'object' && Object.keys(entry.metadata).length > 0;
  const displayName = entry.user?.username || 'System';
  const avatarUrl = entry.user?.avatarUrl;

  return (
    <>
      <tr className="hover:bg-ink-50/50 transition cursor-pointer" onClick={hasMetadata ? onToggle : undefined}>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2.5">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-600">
                {entry.user ? getInitials(displayName) : <Shield className="h-3.5 w-3.5" />}
              </span>
            )}
            <span className="font-medium text-ink-900">{displayName}</span>
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-semibold',
              ACTION_BADGE[entry.action] || 'bg-ink-100 text-ink-600',
            )}
          >
            {describeAction(entry.action, entry.entityType)}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            {entry.entityType && (
              <span className="flex items-center gap-1 text-ink-500">
                {ENTITY_ICON[entry.entityType] || <Activity className="h-3.5 w-3.5" />}
                <span>{entry.entityType}</span>
              </span>
            )}
            {entry.entityId && (
              <span className="font-mono text-xs text-ink-400">#{entry.entityId.slice(0, 8)}</span>
            )}
            {!entry.entityType && <span className="text-ink-400">—</span>}
          </div>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-ink-500 whitespace-nowrap">
          {entry.ipAddress || '—'}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-ink-500 text-xs">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {relativeTime(entry.createdAt)}
          </span>
        </td>
        <td className="px-4 py-3">
          {hasMetadata ? (
            <span className="text-xs font-medium text-brand-600 hover:text-brand-700">
              {expanded ? 'Less' : 'More'}
            </span>
          ) : (
            <span className="text-xs text-ink-300">—</span>
          )}
        </td>
      </tr>
      {expanded && hasMetadata && (
        <tr>
          <td colSpan={6} className="bg-ink-50 px-4 py-4">
            <div className="space-y-3">
              {entry.userAgent && (
                <div>
                  <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">User Agent</p>
                  <p className="text-xs text-ink-600">{entry.userAgent}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">Metadata</p>
                <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 text-xs text-ink-100 max-h-[300px] overflow-y-auto">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function MobileAuditCard({
  entry,
  expanded,
  onToggle,
}: {
  entry: AuditData['data'][number];
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasMetadata = entry.metadata && typeof entry.metadata === 'object' && Object.keys(entry.metadata).length > 0;
  const displayName = entry.user?.username || 'System';
  const avatarUrl = entry.user?.avatarUrl;

  return (
    <div
      className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft cursor-pointer"
      onClick={hasMetadata ? onToggle : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-600">
                {entry.user ? getInitials(displayName) : <Shield className="h-3.5 w-3.5" />}
              </span>
            )}
            <span className="font-medium text-ink-900">{displayName}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                ACTION_BADGE[entry.action] || 'bg-ink-100 text-ink-600',
              )}
            >
              {describeAction(entry.action, entry.entityType)}
            </span>
            {entry.entityType && (
              <span className="flex items-center gap-1 text-xs text-ink-500">
                {ENTITY_ICON[entry.entityType] || <Activity className="h-3.5 w-3.5" />}
                {entry.entityType}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {relativeTime(entry.createdAt)}
            </span>
            {entry.ipAddress && <span className="font-mono">{entry.ipAddress}</span>}
            {entry.entityId && (
              <span className="font-mono">#{entry.entityId.slice(0, 8)}</span>
            )}
          </div>
        </div>
        {hasMetadata && (
          <span className="shrink-0 text-xs font-medium text-brand-600">
            {expanded ? 'Less' : 'More'}
          </span>
        )}
      </div>
      {expanded && hasMetadata && (
        <div className="mt-3 space-y-3 border-t border-ink-100 pt-3">
          {entry.userAgent && (
            <div>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">User Agent</p>
              <p className="text-xs text-ink-600 break-all">{entry.userAgent}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">Metadata</p>
            <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 text-xs text-ink-100 max-h-[200px] overflow-y-auto">
              {JSON.stringify(entry.metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
