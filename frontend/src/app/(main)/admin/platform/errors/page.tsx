'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Bug,
  AlertTriangle,
  XCircle,
  RefreshCcw,
  Clock,
  Server,
  Shield,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Eye,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';

type ErrorData = {
  data: Array<{
    id: string;
    level: string;
    message: string;
    context: string | null;
    service: string;
    metadata: any;
    ipAddress: string | null;
    userId: string | null;
    timestamp: string;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  errorsLastHour: number;
  errorsLastDay: number;
  byLevel: Array<{ level: string; _count: { id: number } }>;
  byService: Array<{ service: string; _count: { id: number } }>;
};

const LEVEL_ICONS: Record<string, React.ReactNode> = {
  critical: <XCircle className="h-4 w-4 text-red-600" />,
  error: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-500" />,
};

const LEVEL_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  error: 'bg-orange-100 text-orange-800',
  warn: 'bg-amber-100 text-amber-800',
  info: 'bg-blue-100 text-blue-800',
  debug: 'bg-ink-100 text-ink-600',
};

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function SummaryCard({
  icon,
  label,
  value,
  variant = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  variant?: 'neutral' | 'amber' | 'red';
}) {
  const border = {
    neutral: 'border-ink-100 bg-white',
    amber: 'border-amber-200 bg-amber-50/50',
    red: 'border-red-200 bg-red-50/50',
  };
  const iconColor = {
    neutral: 'text-ink-500',
    amber: 'text-amber-600',
    red: 'text-red-600',
  };
  const valueColor = {
    neutral: 'text-ink-900',
    amber: 'text-amber-900',
    red: 'text-red-900',
  };

  return (
    <div className={cn('flex items-center gap-4 rounded-2xl border p-5 shadow-soft transition hover:shadow-md', border[variant])}>
      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm', iconColor[variant])}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">{label}</p>
        <p className={cn('mt-0.5 text-2xl font-semibold tabular-nums', valueColor[variant])}>{value}</p>
      </div>
    </div>
  );
}

export default function AdminPlatformErrorsPage() {
  const [data, setData] = useState<ErrorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [levelFilter, setLevelFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const limit = 20;

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (levelFilter) params.set('level', levelFilter);
      if (serviceFilter) params.set('service', serviceFilter);
      const res = await apiClient.get<ErrorData>(`/admin/platform/errors?${params.toString()}`);
      setData(res);
    } catch {
      setError('Failed to load error data');
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, [page, levelFilter, serviceFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const groupedErrors = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { count: number; level: string; latest: string }>();
    for (const err of data.data) {
      const key = err.message;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        if (new Date(err.timestamp) > new Date(existing.latest)) {
          existing.latest = err.timestamp;
          existing.level = err.level;
        }
      } else {
        map.set(key, { count: 1, level: err.level, latest: err.timestamp });
      }
    }
    return Array.from(map.entries())
      .map(([message, info]) => ({ message, ...info }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [data]);

  const levelOptions = [
    { value: '', label: 'All Levels' },
    ...(data?.byLevel.map((l) => ({ value: l.level, label: l.level.charAt(0).toUpperCase() + l.level.slice(1) })) ?? []),
  ];

  const serviceOptions = [
    { value: '', label: 'All Services' },
    ...(data?.byService.map((s) => ({ value: s.service, label: s.service })) ?? []),
  ];

  const handleReset = () => {
    setLevelFilter('');
    setServiceFilter('');
    setSearchQuery('');
    setPage(1);
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchQuery) return data.data;
    const q = searchQuery.toLowerCase();
    return data.data.filter(
      (e) =>
        e.message.toLowerCase().includes(q) ||
        e.service.toLowerCase().includes(q) ||
        (e.context && e.context.toLowerCase().includes(q)),
    );
  }, [data, searchQuery]);

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div role="alert" className="rounded-3xl border border-dashed border-red-200 py-24 text-center">
          <Bug className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchData(true)}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Bug className="h-6 w-6 text-brand-600" />
            Error Center
          </h1>
          <p className="mt-1 text-sm text-ink-500">Monitor and debug platform errors</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCcw className={cn('mr-1.5 h-4 w-4', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {data && data.errorsLastHour > 0 && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <XCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-800">
            <span className="font-bold">{data.errorsLastHour}</span> error{data.errorsLastHour !== 1 ? 's' : ''} in the last hour — review immediately
          </p>
        </div>
      )}

      {loading && !data && (
        <div role="status" aria-busy="true" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-12 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              icon={<AlertTriangle className="h-6 w-6" />}
              label="Errors Last Hour"
              value={data.errorsLastHour}
              variant={data.errorsLastHour > 0 ? 'red' : 'neutral'}
            />
            <SummaryCard
              icon={<Clock className="h-6 w-6" />}
              label="Errors Last 24h"
              value={data.errorsLastDay}
              variant={data.errorsLastDay > 50 ? 'amber' : 'neutral'}
            />
            <SummaryCard
              icon={<Bug className="h-6 w-6" />}
              label="Total Unresolved"
              value={data.total}
              variant={data.total > 0 ? 'amber' : 'neutral'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <h3 className="font-display text-sm font-semibold text-ink-700 mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-ink-400" />
                Level Distribution
              </h3>
              {data.byLevel.length === 0 ? (
                <p className="text-sm text-ink-400">No data</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.byLevel.map((l) => (
                    <Badge key={l.level} className={cn('gap-1.5', LEVEL_COLORS[l.level] || 'bg-ink-100 text-ink-700')}>
                      {LEVEL_ICONS[l.level]}
                      <span className="capitalize">{l.level}</span>
                      <span className="font-bold">{l._count.id}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <h3 className="font-display text-sm font-semibold text-ink-700 mb-3 flex items-center gap-2">
                <Server className="h-4 w-4 text-ink-400" />
                Service Distribution
              </h3>
              {data.byService.length === 0 ? (
                <p className="text-sm text-ink-400">No data</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.byService.map((s) => (
                    <Badge key={s.service} variant="outline" className="gap-1.5">
                      <Server className="h-3.5 w-3.5 text-ink-400" />
                      {s.service}
                      <span className="font-bold">{s._count.id}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-ink-400" />
              <span className="text-sm font-medium text-ink-500">Filters:</span>
            </div>
            <Select
              options={levelOptions}
              value={levelFilter}
              onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
              className="w-36"
            />
            <Select
              options={serviceOptions}
              value={serviceFilter}
              onChange={(e) => { setServiceFilter(e.target.value); setPage(1); }}
              className="w-36"
            />
            <input
              type="text"
              placeholder="Search errors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-11 w-48 rounded-xl border border-input bg-white px-4 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {(levelFilter || serviceFilter || searchQuery) && (
              <Button variant="ghost" size="sm" onClick={handleReset}>Clear</Button>
            )}
          </div>

          {filteredData.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
              <Bug className="mx-auto h-12 w-12 text-ink-300" />
              <p className="mt-4 text-lg font-medium text-ink-800">No errors found</p>
              <p className="mt-1 text-sm text-ink-500">
                {searchQuery || levelFilter || serviceFilter ? 'Try adjusting your filters' : 'Everything looks clean'}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-ink-100 bg-white shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider w-10" />
                      <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">Level</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">Message</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">Service</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">Context</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-50">
                    {filteredData.map((err) => (
                      <tr key={err.id} className="group">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleRow(err.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-ink-300 hover:text-ink-600 hover:bg-ink-100 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5">
                            {LEVEL_ICONS[err.level] || <AlertTriangle className="h-4 w-4 text-ink-400" />}
                            <span className="capitalize text-xs font-medium text-ink-600">{err.level}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink-900 font-medium max-w-xs truncate">
                          {err.message}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-md bg-ink-50 px-2 py-0.5 text-xs font-medium text-ink-700">
                            <Server className="h-3 w-3 text-ink-400" />
                            {err.service}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink-500 max-w-[200px] truncate">
                          {err.context || '—'}
                        </td>
                        <td className="px-4 py-3 text-ink-500 text-xs whitespace-nowrap" suppressHydrationWarning>
                          {relativeTime(err.timestamp)}
                        </td>
                      </tr>
                    ))}
                    {expandedRows.size > 0 && (
                      <>
                        {filteredData
                          .filter((err) => expandedRows.has(err.id))
                          .map((err) => (
                            <tr key={`${err.id}-detail`} className="bg-ink-50/30">
                              <td colSpan={6} className="px-6 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <p className="text-xs font-semibold text-ink-500 uppercase mb-1">Metadata</p>
                                    <pre className="rounded-lg bg-ink-900 p-3 text-xs text-green-400 overflow-auto max-h-48 font-mono whitespace-pre-wrap">
                                      {err.metadata ? JSON.stringify(err.metadata, null, 2) : '—'}
                                    </pre>
                                  </div>
                                  <div className="space-y-3">
                                    <div>
                                      <p className="text-xs font-semibold text-ink-500 uppercase mb-1">User ID</p>
                                      <p className="text-ink-700 font-mono text-xs">{err.userId || '—'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-ink-500 uppercase mb-1">IP Address</p>
                                      <p className="text-ink-700 font-mono text-xs">{err.ipAddress || '—'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-ink-500 uppercase mb-1">Full Timestamp</p>
                                      <p className="text-ink-700 text-xs" suppressHydrationWarning>
                                        {formatTimestamp(err.timestamp)}
                                      </p>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-ink-500 uppercase mb-1">Context Details</p>
                                    <pre className="rounded-lg bg-ink-900 p-3 text-xs text-green-400 overflow-auto max-h-48 font-mono whitespace-pre-wrap">
                                      {err.context || '—'}
                                    </pre>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-500">
                Page {data.page} of {data.totalPages} ({data.total} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                  const start = Math.max(1, data.page - 2);
                  const p = start + i;
                  if (p > data.totalPages) return null;
                  return (
                    <Button
                      key={p}
                      variant={p === data.page ? 'default' : 'outline'}
                      size="sm"
                      className="min-w-[2rem]"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {groupedErrors.length > 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <h3 className="font-display text-sm font-semibold text-ink-700 mb-4 flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-ink-400" />
                Grouped Errors (Top 10)
              </h3>
              <div className="space-y-2">
                {groupedErrors.map((g) => (
                  <div
                    key={g.message}
                    className="flex items-center justify-between gap-4 rounded-xl bg-ink-50/50 px-4 py-2.5"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      {LEVEL_ICONS[g.level] || <AlertTriangle className="h-4 w-4 text-ink-400" />}
                      <span className="text-sm text-ink-900 truncate">{g.message}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge className={LEVEL_COLORS[g.level] || 'bg-ink-100 text-ink-600'}>
                        {g.level}
                      </Badge>
                      <span className="text-sm font-semibold text-ink-900 tabular-nums min-w-[2rem] text-right">
                        {g.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-ink-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            Auto-refreshing every 30s
          </div>
        </>
      )}
    </div>
  );
}
