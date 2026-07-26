'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Terminal,
  Server,
  Search,
  RotateCcw,
  XCircle,
  CheckCircle,
  Clock,
  Database,
  Activity,
  Code,
  Send,
  Eye,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

// ─── Types ───────────────────────────────────────────────────────────────────

type DevQueueData = {
  recentJobs: Array<{
    id: string;
    type: string;
    status: string;
    priority: number;
    progress: number;
    attempts: number;
    errorMessage: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  stats: Array<{
    type: string;
    status: string;
    _count: { id: number };
  }>;
};

type DevCacheData = {
  totalKeys: number;
  keys: Array<{
    key: string;
    type: string;
    ttl: number;
    size: number;
    encoding: string;
  }>;
};

// ─── Status helpers ──────────────────────────────────────────────────────────

const statusIcon: Record<string, React.ElementType> = {
  completed: CheckCircle,
  failed: XCircle,
  running: Activity,
  pending: Clock,
  cancelled: XCircle,
};

const statusColor: Record<string, string> = {
  completed: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  failed: 'text-red-600 bg-red-50 border-red-200',
  running: 'text-blue-600 bg-blue-50 border-blue-200',
  pending: 'text-amber-600 bg-amber-50 border-amber-200',
  cancelled: 'text-ink-500 bg-ink-50 border-ink-200',
};

const statusBadgeVariant: Record<string, 'success' | 'outline' | 'default'> = {
  completed: 'success',
  failed: 'default',
  running: 'outline',
  pending: 'outline',
  cancelled: 'outline',
};

function formatTTL(seconds: number): string {
  if (seconds <= 0) return 'No expiry';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function QueueSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <Skeleton className="h-5 w-48" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function CacheSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-10 w-40 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

// ─── Queue Inspector ──────────────────────────────────────────────────────────

function QueueInspector() {
  const [data, setData] = useState<DevQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<DevQueueData>('/admin/platform/developer/queues');
      setData(res);
    } catch {
      setError('Failed to load queue data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (jobId: string, action: 'retry' | 'cancel') => {
    try {
      await apiClient.post(`/admin/platform/jobs/${jobId}/action`, { action });
      fetchData();
    } catch {
      // ignore
    }
  };

  if (loading && !data) return <QueueSkeleton />;

  if (error && !data) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center py-16 text-center">
        <XCircle className="h-10 w-10 text-red-400" />
        <p className="mt-3 text-sm font-medium text-ink-800">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>
          <RotateCcw className="mr-1.5 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const groupByKey = (stat: DevQueueData['stats'][number]) => `${stat.type}/${stat.status}`;
  const statMap = new Map(data.stats.map((s) => [groupByKey(s), s._count.id]));
  const types = [...new Set(data.stats.map((s) => s.type))];
  const statuses = [...new Set(data.stats.map((s) => s.status))];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <Server className="h-3.5 w-3.5" />
          Queue Stats
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wider text-ink-400">
                <th className="px-4 py-3">Type</th>
                {statuses.map((s) => (
                  <th key={s} className="px-4 py-3">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.map((type) => (
                <tr key={type} className="border-b border-ink-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink-900">{type}</td>
                  {statuses.map((s) => {
                    const count = statMap.get(groupByKey({ type, status: s, _count: { id: 0 } })) ?? 0;
                    return (
                      <td key={s} className="px-4 py-3 tabular-nums text-ink-700">
                        {count.toLocaleString('en-IN')}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {types.length === 0 && (
                <tr>
                  <td colSpan={statuses.length + 1} className="px-4 py-8 text-center text-sm text-ink-400">
                    No stats available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Jobs */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <Activity className="h-3.5 w-3.5" />
          Recent Jobs
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wider text-ink-400">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.recentJobs.map((job) => {
                const StatusIcon = statusIcon[job.status] ?? Clock;
                return (
                  <tr key={job.id} className="border-b border-ink-50 last:border-0">
                    <td className="max-w-[120px] truncate px-4 py-3 font-mono text-xs text-ink-700">
                      {job.id}
                    </td>
                    <td className="px-4 py-3 text-ink-900">{job.type}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant[job.status] ?? 'outline'}>
                        <StatusIcon className="mr-1 inline h-3 w-3" />
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink-700">{job.priority}</td>
                    <td className="px-4 py-3 tabular-nums text-ink-700">{job.progress}%</td>
                    <td className="px-4 py-3 tabular-nums text-ink-700">{job.attempts}</td>
                    <td className="px-4 py-3 text-xs text-ink-500">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {job.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(job.id, 'retry')}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Retry
                          </Button>
                        )}
                        {(job.status === 'pending' || job.status === 'running') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(job.id, 'cancel')}
                          >
                            <XCircle className="mr-1 h-3 w-3" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data.recentJobs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-ink-400">
                    No recent jobs
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Error detail */}
      {data.recentJobs.some((j) => j.errorMessage) && (
        <section className="rounded-2xl border border-red-100 bg-red-50/50 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-600">
            <XCircle className="h-3.5 w-3.5" />
            Errors
          </h3>
          <div className="space-y-2">
            {data.recentJobs
              .filter((j) => j.errorMessage)
              .map((j) => (
                <div key={j.id} className="rounded-xl border border-red-200 bg-white px-4 py-3">
                  <p className="mb-0.5 font-mono text-xs text-ink-500">{j.id}</p>
                  <p className="text-sm text-red-700">{j.errorMessage}</p>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Cache Inspector ──────────────────────────────────────────────────────────

function CacheInspector() {
  const [data, setData] = useState<DevCacheData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<DevCacheData>('/admin/platform/developer/cache');
      setData(res);
    } catch {
      setError('Failed to load cache data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) return <CacheSkeleton />;

  if (error && !data) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center py-16 text-center">
        <XCircle className="h-10 w-10 text-red-400" />
        <p className="mt-3 text-sm font-medium text-ink-800">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>
          <RotateCcw className="mr-1.5 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const filteredKeys = search
    ? data.keys.filter((k) => k.key.toLowerCase().includes(search.toLowerCase()))
    : data.keys;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Total Keys</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">
            {data.totalKeys.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <Input
          placeholder="Search cache keys..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Keys table */}
      <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white shadow-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wider text-ink-400">
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">TTL</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Encoding</th>
            </tr>
          </thead>
          <tbody>
            {filteredKeys.map((entry) => (
              <tr key={entry.key} className="border-b border-ink-50 last:border-0">
                <td className="max-w-[300px] truncate px-4 py-3 font-mono text-xs text-ink-900">
                  {entry.key}
                </td>
                <td className="px-4 py-3 text-ink-700">{entry.type}</td>
                <td className="px-4 py-3 tabular-nums text-ink-700">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-ink-400" />
                    {formatTTL(entry.ttl)}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-ink-700">{formatSize(entry.size)}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{entry.encoding}</Badge>
                </td>
              </tr>
            ))}
            {filteredKeys.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-400">
                  {search ? 'No keys match your search' : 'No cache keys found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer meta */}
      <div className="flex items-center justify-between text-xs text-ink-400">
        <span>
          Showing {filteredKeys.length} of {data.keys.length} keys
        </span>
        <Button variant="ghost" size="sm" onClick={fetchData}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
    </div>
  );
}

// ─── API Explorer ─────────────────────────────────────────────────────────────

const HTTP_METHODS = ['GET', 'POST', 'PATCH', 'DELETE'] as const;

function ApiExplorer() {
  const [method, setMethod] = useState<string>('GET');
  const [path, setPath] = useState('');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<{ status: number; data: unknown } | null>(null);
  const [sending, setSending] = useState(false);
  const [explorerError, setExplorerError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!path.trim()) return;
    setSending(true);
    setExplorerError(null);
    setResponse(null);
    try {
      const hasBody = method === 'POST' || method === 'PATCH';
      const parsedBody = hasBody && body.trim() ? JSON.parse(body) : undefined;
      const apiPath = path.startsWith('/') ? path : `/${path}`;
      let res: unknown;
      if (method === 'GET') res = await apiClient.get(apiPath, { skipRefresh: true });
      else if (method === 'POST') res = await apiClient.post(apiPath, parsedBody, { skipRefresh: true });
      else if (method === 'PATCH') res = await apiClient.patch(apiPath, parsedBody, { skipRefresh: true });
      else if (method === 'DELETE') res = await apiClient.delete(apiPath, { skipRefresh: true });
      setResponse({ status: 200, data: res });
    } catch (err: unknown) {
      if (err instanceof Error && 'statusCode' in err) {
        const apiErr = err as { statusCode: number; message: string; details?: unknown };
        setResponse({ status: apiErr.statusCode, data: apiErr.details ?? apiErr.message });
      } else {
        setExplorerError(err instanceof Error ? err.message : 'Request failed');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Request builder */}
      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
        <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <Code className="h-3.5 w-3.5" />
          Request
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-28 shrink-0">
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              options={HTTP_METHODS.map((m) => ({ value: m, label: m }))}
            />
          </div>
          <div className="min-w-0 flex-1">
            <Input
              placeholder="/api/v1/admin/platform/..."
              value={path}
              onChange={(e) => setPath(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            />
          </div>
          <Button onClick={handleSend} disabled={sending || !path.trim()}>
            <Send className="mr-1.5 h-4 w-4" />
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>

        {(method === 'POST' || method === 'PATCH') && (
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Request Body (JSON)</label>
            <Textarea
              placeholder='{ "key": "value" }'
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[100px] font-mono text-xs"
            />
          </div>
        )}
      </div>

      {/* Response */}
      {explorerError && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <XCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm font-medium text-red-800">{explorerError}</p>
        </div>
      )}

      {response && (
        <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
            <div className="flex items-center gap-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                <Eye className="h-3.5 w-3.5" />
                Response
              </h3>
              <Badge
                variant={response.status >= 200 && response.status < 300 ? 'success' : 'default'}
              >
                {response.status}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setResponse(null); setExplorerError(null); }}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-xs text-ink-800">
            {JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DeveloperPage() {
  const [tab, setTab] = useState('queue');

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
          <Terminal className="h-6 w-6 text-brand-600" />
          Developer Tools
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Advanced debugging and introspection tools
        </p>
      </div>

      <Tabs value={tab} onChange={setTab}>
        <TabList>
          <Tab value="queue">
            <Server className="mr-2 h-4 w-4" />
            Queue Inspector
          </Tab>
          <Tab value="cache">
            <Database className="mr-2 h-4 w-4" />
            Cache Inspector
          </Tab>
          <Tab value="api">
            <Code className="mr-2 h-4 w-4" />
            API Explorer
          </Tab>
        </TabList>

        <TabPanel value="queue">
          <QueueInspector />
        </TabPanel>
        <TabPanel value="cache">
          <CacheInspector />
        </TabPanel>
        <TabPanel value="api">
          <ApiExplorer />
        </TabPanel>
      </Tabs>
    </div>
  );
}
