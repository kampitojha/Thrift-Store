'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Server,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Cpu,
  MemoryStick,
  HardDrive,
  RefreshCcw,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

type WorkerData = {
  workers: Array<{
    id: string;
    name: string;
    description: string;
    status: string;
    queueLength: number;
    concurrency: number;
    uptime: string;
    memoryUsage: string;
    cpuUsage: string;
    tasksCompleted: number;
    lastActive: string;
  }>;
  total: number;
  active: number;
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

const statusConfig: Record<string, { label: string; variant: 'success' | 'default' | 'outline'; dot: string }> = {
  idle: { label: 'Idle', variant: 'success', dot: 'bg-emerald-500' },
  busy: { label: 'Busy', variant: 'default', dot: 'bg-amber-500' },
  offline: { label: 'Offline', variant: 'outline', dot: 'bg-red-500' },
};

export default function AdminPlatformWorkersPage() {
  const [data, setData] = useState<WorkerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const res = await apiClient.get<WorkerData>('/admin/platform/workers');
      setData(res);
    } catch {
      setError('Failed to load worker data');
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Server className="h-6 w-6 text-brand-600" />
            Background Workers
          </h1>
          <p className="mt-1 text-sm text-ink-500">Monitor worker processes and queue performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCcw className={`mr-1.5 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Now
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData(true)}>
            <RefreshCcw className="mr-1.5 h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {loading && !data && (
        <div role="status" aria-busy="true" className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-24 flex-1 rounded-2xl" />
            <Skeleton className="h-24 flex-1 rounded-2xl" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Total Workers</p>
                <Server className="h-4 w-4 text-ink-300" />
              </div>
              <p className="mt-2 text-2xl font-bold text-ink-900">{data.total}</p>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Active Workers</p>
                <Activity className="h-4 w-4 text-ink-300" />
              </div>
              <p className="mt-2 text-2xl font-bold text-ink-900">{data.active}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {data.workers.map((worker) => {
              const cfg = statusConfig[worker.status] || statusConfig.offline;
              const queuePct = worker.concurrency > 0 ? Math.round((worker.queueLength / worker.concurrency) * 100) : 0;

              return (
                <div
                  key={worker.id}
                  className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft transition hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-ink-900">{worker.name}</h3>
                        <Badge variant={cfg.variant} className="capitalize">
                          <span className={`mr-1.5 h-2 w-2 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </Badge>
                      </div>
                      {worker.description && (
                        <p className="mt-1 text-sm text-ink-500">{worker.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                          <Server className="h-3.5 w-3.5" />
                          Queue
                        </span>
                        <span className="text-xs font-semibold text-ink-700">
                          {worker.queueLength} / {worker.concurrency}
                        </span>
                      </div>
                      <Progress value={queuePct} className="h-2" />
                      <p className="mt-1 text-[10px] text-ink-400">{queuePct}% utilized</p>
                    </div>

                    <div>
                      <span className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                        <Clock className="h-3.5 w-3.5" />
                        Uptime
                      </span>
                      <p className="mt-1 text-sm font-semibold text-ink-900">{worker.uptime}</p>
                    </div>

                    <div>
                      <span className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                        <Cpu className="h-3.5 w-3.5" />
                        CPU
                      </span>
                      <p className="mt-1 text-sm font-semibold text-ink-900">{worker.cpuUsage}</p>
                    </div>

                    <div>
                      <span className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                        <MemoryStick className="h-3.5 w-3.5" />
                        Memory
                      </span>
                      <p className="mt-1 text-sm font-semibold text-ink-900">{worker.memoryUsage}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-ink-100 pt-4 text-xs text-ink-500">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="font-medium text-ink-700">{worker.tasksCompleted.toLocaleString()}</span>
                      {' '}tasks completed
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-ink-400" />
                      Last active{' '}
                      <span className="font-medium text-ink-700" suppressHydrationWarning>
                        {relativeTime(worker.lastActive)}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {data.workers.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white py-16">
              <Server className="h-10 w-10 text-ink-300" />
              <p className="mt-4 text-sm font-medium text-ink-600">No workers found</p>
              <p className="mt-1 text-xs text-ink-400">Workers will appear here once they are registered.</p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Auto-refreshing every 15s
          </div>
        </>
      )}
    </div>
  );
}
