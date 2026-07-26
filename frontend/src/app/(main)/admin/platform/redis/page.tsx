'use client';

import { useEffect, useState, useCallback } from 'react';
import { HardDrive, Database, Clock, Activity, RefreshCcw, Trash2, Search, XCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type RedisData = {
  status: string;
  version: string;
  uptimeSeconds: number;
  usedMemory: string;
  totalKeys: number;
  cacheHitRate: string;
  cacheMissRate: string;
  hitCount: number;
  missCount: number;
  connectedClients: number;
  keyTypes: Record<string, number>;
  keys: Array<{ key: string; ttl: number; type: string }>;
  totalMemoryBytes: number;
  peakMemory: string;
  fragmentation: string;
};

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
};

function StatCard({ icon, label, value, sub, color }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', color || 'bg-brand-50')}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-500">{label}</p>
          <p className="text-lg font-semibold text-ink-900">{value}</p>
          {sub && <p className="text-xs text-ink-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function formatTTL(seconds: number): string {
  if (seconds < 0) return 'No expiry';
  if (seconds === 0) return 'Expired';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export default function RedisPage() {
  const [data, setData] = useState<RedisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flushDialogOpen, setFlushDialogOpen] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [flushPattern, setFlushPattern] = useState('');
  const [flushingPattern, setFlushingPattern] = useState(false);
  const [flushMessage, setFlushMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get<RedisData>('/admin/platform/redis');
      setData(res);
      setError(null);
    } catch {
      setError('Failed to load Redis data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleFlushAll = async () => {
    setFlushing(true);
    setFlushMessage(null);
    try {
      await apiClient.post('/admin/platform/redis/flush', { confirm: 'FLUSH' });
      setFlushMessage('Cache flushed successfully');
      setFlushDialogOpen(false);
      fetchData();
    } catch {
      setFlushMessage('Failed to flush cache');
    } finally {
      setFlushing(false);
    }
  };

  const handleFlushPattern = async () => {
    if (!flushPattern.trim()) return;
    setFlushingPattern(true);
    setFlushMessage(null);
    try {
      await apiClient.post('/admin/platform/redis/flush-key', { pattern: flushPattern });
      setFlushMessage(`Keys matching "${flushPattern}" flushed`);
      setFlushPattern('');
      fetchData();
    } catch {
      setFlushMessage('Failed to flush keys');
    } finally {
      setFlushingPattern(false);
    }
  };

  const statusHealthy = data?.status === 'healthy' || data?.status === 'connected';

  if (loading) {
    return (
      <div role="status" aria-busy="true" className="p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-40 rounded-2xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div role="alert" className="rounded-3xl border border-dashed border-red-200 py-24 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hitRateNum = parseFloat(data.cacheHitRate) || 0;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <HardDrive className="h-6 w-6 text-brand-600" />
            Redis
          </h1>
          <p className="mt-1 text-sm text-ink-500">Monitor and manage Redis cache</p>
        </div>
        <div className="flex items-center gap-2">
          {flushMessage && (
            <p className={cn('text-xs font-medium', flushMessage.includes('Failed') ? 'text-red-500' : 'text-emerald-600')}>
              {flushMessage}
            </p>
          )}
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCcw className="mr-1.5 h-4 w-4" />Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center gap-4">
            <div className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl',
              statusHealthy ? 'bg-emerald-50' : 'bg-red-50',
            )}>
              {statusHealthy
                ? <CheckCircle className="h-6 w-6 text-emerald-600" />
                : <XCircle className="h-6 w-6 text-red-600" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-ink-900">Connection Status</h2>
                <Badge variant={statusHealthy ? 'success' : 'default'}>
                  <span className={cn('mr-1 inline-block h-1.5 w-1.5 rounded-full', statusHealthy ? 'bg-emerald-600' : 'bg-red-500')} />
                  {data.status}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-ink-500">Redis v{data.version} &middot; Uptime: {formatUptime(data.uptimeSeconds)}</p>
            </div>
            <div className="ml-auto flex items-center gap-6 text-sm text-ink-500">
              <div className="text-center">
                <p className="text-xs font-medium text-ink-400">Peak Memory</p>
                <p className="font-semibold text-ink-700">{data.peakMemory}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-ink-400">Fragmentation</p>
                <p className="font-semibold text-ink-700">{data.fragmentation}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Database className="h-5 w-5 text-brand-600" />}
            label="Used Memory"
            value={data.usedMemory}
            sub={data.totalMemoryBytes ? `${(data.totalMemoryBytes / 1024 / 1024).toFixed(1)} MB total` : undefined}
            color="bg-brand-50"
          />
          <StatCard
            icon={<HardDrive className="h-5 w-5 text-violet-600" />}
            label="Total Keys"
            value={data.totalKeys.toLocaleString()}
            sub={`${Object.keys(data.keyTypes).length} types`}
            color="bg-violet-50"
          />
          <StatCard
            icon={<Activity className="h-5 w-5 text-emerald-600" />}
            label="Cache Hit Rate"
            value={data.cacheHitRate}
            sub={`${data.hitCount.toLocaleString()} hits`}
            color="bg-emerald-50"
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            label="Connected Clients"
            value={data.connectedClients}
            sub="Active connections"
            color="bg-amber-50"
          />
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
          <div className="border-b border-ink-100 px-5 py-4">
            <h3 className="font-display text-base font-semibold text-ink-900 flex items-center gap-2">
              <Database className="h-4 w-4 text-violet-600" />
              Key Types Distribution
            </h3>
          </div>
          <div className="flex flex-wrap gap-3 px-5 py-4">
            {Object.entries(data.keyTypes).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50/50 px-3 py-2">
                <Badge variant="brand">{type}</Badge>
                <span className="text-sm font-semibold text-ink-900">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <h3 className="font-display text-base font-semibold text-ink-900 flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-emerald-600" />
            Cache Performance
          </h3>
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-xs font-medium text-ink-500">Hit Rate</span>
                <span className="text-xs font-semibold text-ink-700">{data.cacheHitRate}</span>
              </div>
              <Progress value={hitRateNum} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3 text-center">
                <p className="text-xs font-medium text-ink-500">Cache Miss Rate</p>
                <p className="text-lg font-semibold text-ink-900">{data.cacheMissRate}</p>
              </div>
              <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3 text-center">
                <p className="text-xs font-medium text-ink-500">Misses</p>
                <p className="text-lg font-semibold text-ink-900">{data.missCount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
          <div className="border-b border-ink-100 px-5 py-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-ink-900 flex items-center gap-2">
              <Search className="h-4 w-4 text-blue-600" />
              Keys
            </h3>
            <span className="text-xs text-ink-400">{data.keys.length} keys</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-medium text-ink-500">
                  <th className="px-5 py-3">Key</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">TTL</th>
                </tr>
              </thead>
              <tbody>
                {data.keys.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-12 text-center text-sm text-ink-400">
                      No keys found
                    </td>
                  </tr>
                ) : (
                  data.keys.map((k, i) => (
                    <tr key={i} className="border-b border-ink-50 hover:bg-ink-50/50">
                      <td className="max-w-xs px-5 py-3">
                        <p className="truncate font-mono text-xs text-ink-700">{k.key}</p>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={
                          k.type === 'string' ? 'default' :
                          k.type === 'hash' ? 'brand' :
                          k.type === 'set' ? 'success' : 'outline'
                        }>
                          {k.type}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-ink-500">{formatTTL(k.ttl)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <h3 className="font-display text-base font-semibold text-ink-900 flex items-center gap-2 mb-4">
            <Trash2 className="h-4 w-4 text-red-500" />
            Flush Controls
          </h3>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="destructive" size="sm" onClick={() => setFlushDialogOpen(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" />Flush All Cache
            </Button>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Pattern (e.g. session:*)"
                value={flushPattern}
                onChange={(e) => setFlushPattern(e.target.value)}
                className="h-9 w-48 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleFlushPattern}
                disabled={!flushPattern.trim() || flushingPattern}
              >
                <Search className="mr-1.5 h-4 w-4" />
                {flushingPattern ? 'Flushing...' : 'Flush Pattern'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={flushDialogOpen} onClose={() => setFlushDialogOpen(false)}>
        <DialogHeader>Flush All Cache</DialogHeader>
        <DialogBody>
          <p className="text-sm text-ink-600">
            Are you sure you want to flush all Redis keys? This action cannot be undone.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setFlushDialogOpen(false)} disabled={flushing}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleFlushAll} disabled={flushing}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            {flushing ? 'Flushing...' : 'Flush Everything'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
