'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Filter,
  Clock,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type AuditLog = {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  entityType: string;
  entityId: string;
  ip?: string;
  metadata?: Record<string, unknown>;
};

type AuditLogsResponse = {
  data: AuditLog[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'REJECT', label: 'Reject' },
  { value: 'FLAG', label: 'Flag' },
];

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All entity types' },
  { value: 'User', label: 'User' },
  { value: 'Product', label: 'Product' },
  { value: 'Order', label: 'Order' },
  { value: 'SellerProfile', label: 'Seller Profile' },
  { value: 'Payout', label: 'Payout' },
  { value: 'Refund', label: 'Refund' },
  { value: 'Coupon', label: 'Coupon' },
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
};

export default function AdminAuditPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entityType', entityFilter);
      const res = await apiClient.get<AuditLogsResponse>(`/admin/audit-logs?${params}`);
      setLogs(res.data);
      setMeta(res.meta);
    } catch {
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter]);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    fetchLogs();
  }, [user, router, fetchLogs]);

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Track all actions performed across the platform
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLogs(meta.page)}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-ink-400" />
        <Select
          options={ACTION_OPTIONS}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-auto min-w-[160px]"
        />
        <Select
          options={ENTITY_TYPE_OPTIONS}
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="w-auto min-w-[180px]"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
          <div className="divide-y divide-ink-100">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchLogs()}>
            Try Again
          </Button>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Clock className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No audit logs found</p>
          <p className="text-sm text-ink-500">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl border border-ink-100 bg-white shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Entity ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {logs.map((log) => (
                    <LogRow key={log.id} log={log} expanded={expandedId === log.id} onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {logs.map((log) => (
              <LogCard key={log.id} log={log} expanded={expandedId === log.id} onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)} />
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => fetchLogs(meta.page - 1)}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-ink-500">Page {meta.page} of {meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => fetchLogs(meta.page + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LogRow({ log, expanded, onToggle }: { log: AuditLog; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="hover:bg-ink-50/50 transition">
        <td className="px-4 py-3 text-ink-600 whitespace-nowrap">
          {new Date(log.timestamp).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </td>
        <td className="px-4 py-3 font-medium text-ink-900 whitespace-nowrap">{log.username}</td>
        <td className="px-4 py-3">
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', ACTION_BADGE[log.action] || 'bg-ink-100 text-ink-600')}>
            {log.action}
          </span>
        </td>
        <td className="px-4 py-3 text-ink-700 whitespace-nowrap">{log.entityType}</td>
        <td className="px-4 py-3 font-mono text-xs text-ink-500 max-w-[120px] truncate">{log.entityId}</td>
        <td className="px-4 py-3 font-mono text-xs text-ink-500 whitespace-nowrap">{log.ip || '—'}</td>
        <td className="px-4 py-3">
          {log.metadata && Object.keys(log.metadata).length > 0 ? (
            <button onClick={onToggle} className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-medium">
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Hide' : 'Show'}
            </button>
          ) : (
            <span className="text-xs text-ink-300">—</span>
          )}
        </td>
      </tr>
      {expanded && log.metadata && Object.keys(log.metadata).length > 0 && (
        <tr>
          <td colSpan={7} className="bg-ink-50 px-4 py-3">
            <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 text-xs text-ink-100">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

function LogCard({ log, expanded, onToggle }: { log: AuditLog; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', ACTION_BADGE[log.action] || 'bg-ink-100 text-ink-600')}>
              {log.action}
            </span>
            <span className="text-sm font-medium text-ink-900">{log.entityType}</span>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            by <span className="font-medium text-ink-700">{log.username}</span>
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-400">
            <span>{new Date(log.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            {log.ip && <span className="font-mono">{log.ip}</span>}
            <span className="font-mono text-ink-500">{log.entityId.slice(0, 8)}...</span>
          </div>
        </div>
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <button onClick={onToggle} className="shrink-0 text-brand-600 hover:text-brand-700">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>
      {expanded && log.metadata && Object.keys(log.metadata).length > 0 && (
        <pre className="mt-3 overflow-x-auto rounded-xl bg-ink-900 p-4 text-xs text-ink-100">
          {JSON.stringify(log.metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}
