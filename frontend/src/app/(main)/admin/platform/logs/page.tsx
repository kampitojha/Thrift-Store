'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ScrollText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Download,
  Clock,
  AlertTriangle,
  Info,
  Bug,
  Trash2,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';

type LogEntry = {
  id: string;
  level: string;
  message: string;
  context: string | null;
  service: string;
  metadata: any;
  ipAddress: string | null;
  userId: string | null;
  timestamp: string;
};

type LogsData = {
  data: LogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  levels: Array<{ level: string; _count: { id: number } }>;
  services: Array<{ service: string; _count: { id: number } }>;
};

const LEVEL_OPTIONS = [
  { value: '', label: 'All levels' },
  { value: 'INFO', label: 'Info' },
  { value: 'WARN', label: 'Warn' },
  { value: 'ERROR', label: 'Error' },
  { value: 'CRITICAL', label: 'Critical' },
];

const LEVEL_BADGE: Record<string, string> = {
  INFO: 'bg-sky-100 text-sky-800',
  WARN: 'bg-amber-100 text-amber-800',
  ERROR: 'bg-red-100 text-red-800',
  CRITICAL: 'bg-rose-100 text-rose-900',
  DEBUG: 'bg-ink-100 text-ink-600',
};

const LEVEL_ICON: Record<string, React.ReactNode> = {
  INFO: <Info className="h-3.5 w-3.5" />,
  WARN: <AlertTriangle className="h-3.5 w-3.5" />,
  ERROR: <AlertTriangle className="h-3.5 w-3.5" />,
  CRITICAL: <AlertTriangle className="h-3.5 w-3.5" />,
  DEBUG: <Bug className="h-3.5 w-3.5" />,
};

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

export default function AdminPlatformLogsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [levels, setLevels] = useState<Array<{ level: string; _count: { id: number } }>>([]);
  const [services, setServices] = useState<Array<{ service: string; _count: { id: number } }>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '25' });
      if (levelFilter) params.set('level', levelFilter);
      if (serviceFilter) params.set('service', serviceFilter);
      if (search) params.set('search', search);
      const res = await apiClient.get<LogsData>(`/admin/platform/logs?${params}`);
      setLogs(res.data ?? []);
      setTotal(res.total ?? 0);
      setPage(res.page ?? 1);
      setTotalPages(res.totalPages ?? 1);
      setLevels(res.levels ?? []);
      setServices(res.services ?? []);
    } catch {
      setError('Failed to load platform logs');
    } finally {
      setLoading(false);
    }
  }, [levelFilter, serviceFilter, search]);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    fetchLogs();
  }, [user, router, fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <ScrollText className="h-6 w-6 text-brand-600" />
            Platform Logs
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            System and application logs across all services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchLogs(page)}>
            <RefreshCcw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Log Level Distribution */}
      {!loading && !error && levels.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {levels.map((lv) => (
            <Badge
              key={lv.level}
              variant="outline"
              className={cn(
                'flex items-center gap-1.5 px-3 py-1',
                lv.level === levelFilter && 'ring-2 ring-brand-500',
              )}
            >
              {LEVEL_ICON[lv.level] || <Info className="h-3.5 w-3.5" />}
              <span className="capitalize">{lv.level.toLowerCase()}</span>
              <span className="font-semibold">{lv._count.id}</span>
            </Badge>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-ink-400" />
        <Select
          options={LEVEL_OPTIONS}
          value={levelFilter}
          onChange={(e) => {
            setLevelFilter(e.target.value);
            setPage(1);
          }}
          className="w-auto min-w-[150px]"
          aria-label="Filter by log level"
        />
        <Select
          options={[
            { value: '', label: 'All services' },
            ...services.map((s) => ({ value: s.service, label: s.service })),
          ]}
          value={serviceFilter}
          onChange={(e) => {
            setServiceFilter(e.target.value);
            setPage(1);
          }}
          className="w-auto min-w-[180px]"
          aria-label="Filter by service"
        />
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Search logs..."
              aria-label="Search logs"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-white pl-10 pr-4 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-w-[240px]"
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
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
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
      ) : logs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <ScrollText className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No logs found</p>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Level</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Message</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Context</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {logs.map((log) => (
                    <LogRow
                      key={log.id}
                      log={log}
                      expanded={expandedId === log.id}
                      onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {logs.map((log) => (
              <MobileLogCard
                key={log.id}
                log={log}
                expanded={expandedId === log.id}
                onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
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

          <p className="mt-4 text-center text-xs text-ink-400">{total} total logs</p>
        </>
      )}
    </div>
  );
}

function LogRow({
  log,
  expanded,
  onToggle,
}: {
  log: LogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="hover:bg-ink-50/50 transition cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-3 whitespace-nowrap">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
              LEVEL_BADGE[log.level] || 'bg-ink-100 text-ink-600',
            )}
          >
            {LEVEL_ICON[log.level] || null}
            {log.level}
          </span>
        </td>
        <td className="px-4 py-3 text-ink-800 max-w-[280px] truncate">
          {log.message}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-ink-600">
          {log.service}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-ink-500 max-w-[120px] truncate">
          {log.context || '—'}
        </td>
        <td className="px-4 py-3 font-mono text-xs text-ink-500 whitespace-nowrap">
          {log.ipAddress || '—'}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-ink-500 text-xs">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {relativeTime(log.timestamp)}
          </span>
        </td>
        <td className="px-4 py-3">
          {(log.metadata || log.userId) && (
            <span
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              {expanded ? 'Less' : 'More'}
            </span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="bg-ink-50 px-4 py-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">Full Message</p>
                <p className="text-sm text-ink-800">{log.message}</p>
              </div>
              {log.userId && (
                <div>
                  <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">User ID</p>
                  <p className="font-mono text-xs text-ink-600">{log.userId}</p>
                </div>
              )}
              {log.ipAddress && (
                <div>
                  <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">IP Address</p>
                  <p className="font-mono text-xs text-ink-600">{log.ipAddress}</p>
                </div>
              )}
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">Metadata</p>
                  <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 text-xs text-ink-100 max-h-[300px] overflow-y-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function MobileLogCard({
  log,
  expanded,
  onToggle,
}: {
  log: LogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                LEVEL_BADGE[log.level] || 'bg-ink-100 text-ink-600',
              )}
            >
              {LEVEL_ICON[log.level] || null}
              {log.level}
            </span>
            <span className="text-xs text-ink-400 bg-ink-50 rounded-md px-2 py-0.5">
              {log.service}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-ink-800 line-clamp-2">{log.message}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {relativeTime(log.timestamp)}
            </span>
            {log.context && <span>context: {log.context}</span>}
            {log.ipAddress && <span className="font-mono">{log.ipAddress}</span>}
          </div>
        </div>
        {(log.metadata || log.userId) && (
          <span className="shrink-0 text-xs font-medium text-brand-600">
            {expanded ? 'Less' : 'More'}
          </span>
        )}
      </div>
      {expanded && (
        <div className="mt-3 space-y-3 border-t border-ink-100 pt-3">
          {log.userId && (
            <div>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">User ID</p>
              <p className="font-mono text-xs text-ink-600">{log.userId}</p>
            </div>
          )}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">Metadata</p>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 text-xs text-ink-100 max-h-[200px] overflow-y-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
