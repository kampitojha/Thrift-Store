'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, Play, Pause, RefreshCcw, CheckCircle, XCircle, AlertTriangle, History, List } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type CronData = {
  jobs: Array<{
    id: string;
    name: string;
    schedule: string;
    description: string;
    enabled: boolean;
    type: string;
    lastRun: string;
    nextRun: string;
    lastDuration: string;
    lastStatus: string;
    runCount: number;
    failureCount: number;
  }>;
  total: number;
  enabled: number;
};

type ToastState = { message: string; visible: boolean; error?: boolean };

function Toast({ toast }: { toast: ToastState }) {
  if (!toast.visible) return null;
  return (
    <div role="alert" className="fixed bottom-6 right-6 z-50 animate-fade-up">
      <div className={cn(
        'flex items-center gap-2.5 rounded-2xl border px-5 py-3 shadow-lift',
        toast.error ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50',
      )}>
        {toast.error
          ? <XCircle className="h-5 w-5 text-red-600" />
          : <CheckCircle className="h-5 w-5 text-emerald-600" />
        }
        <span className={cn('text-sm font-medium', toast.error ? 'text-red-800' : 'text-emerald-800')}>
          {toast.message}
        </span>
      </div>
    </div>
  );
}

function showToast(
  setter: (t: ToastState) => void,
  message: string,
  error = false,
) {
  setter({ message, visible: true, error });
  setTimeout(() => setter({ message: '', visible: false }), 3500);
}

export default function CronPage() {
  const [data, setData] = useState<CronData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<CronData>('/admin/platform/cron');
      setData(res);
    } catch {
      setError('Failed to load cron jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunNow = async (id: string) => {
    setActionLoading(id);
    try {
      await apiClient.post(`/admin/platform/cron/${id}/run`);
      showToast(setToast, 'Job triggered successfully');
      fetchData();
    } catch {
      showToast(setToast, 'Failed to trigger job', true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    setActionLoading(id);
    try {
      await apiClient.post(`/admin/platform/cron/${id}/toggle`);
      showToast(setToast, current ? 'Job disabled' : 'Job enabled');
      fetchData();
    } catch {
      showToast(setToast, 'Failed to toggle job', true);
    } finally {
      setActionLoading(null);
    }
  };

  const lastStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-ink-400" />;
    }
  };

  const lastStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-emerald-100 text-emerald-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-ink-100 text-ink-600';
    }
  };

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
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div role="alert" className="rounded-3xl border border-dashed border-red-200 py-24 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 lg:p-8">
      <Toast toast={toast} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Clock className="h-6 w-6 text-brand-600" />
            Cron Jobs
          </h1>
          <p className="mt-1 text-sm text-ink-500">Manage scheduled tasks and automated jobs</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCcw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <List className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-500">Total Jobs</p>
              <p className="text-lg font-semibold text-ink-900">{data.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-500">Enabled</p>
              <p className="text-lg font-semibold text-ink-900">{data.enabled}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {data.jobs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
            <Clock className="mx-auto h-12 w-12 text-ink-300" />
            <p className="mt-4 text-lg font-medium text-ink-800">No cron jobs found</p>
          </div>
        ) : (
          data.jobs.map((job) => (
            <div key={job.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-display text-base font-semibold text-ink-900">{job.name}</h3>
                    <Badge variant={job.enabled ? 'success' : 'outline'}>
                      {job.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Badge variant="outline" className="font-mono">{job.type}</Badge>
                  </div>
                  {job.description && (
                    <p className="mt-1 text-sm text-ink-500">{job.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <code className="rounded-md bg-ink-50 px-2 py-0.5 text-xs font-mono text-ink-700">
                      {job.schedule}
                    </code>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunNow(job.id)}
                    disabled={actionLoading === job.id}
                  >
                    <Play className="mr-1 h-3.5 w-3.5" />
                    Run Now
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(job.id, job.enabled)}
                    disabled={actionLoading === job.id}
                  >
                    {job.enabled
                      ? <><Pause className="mr-1 h-3.5 w-3.5" />Disable</>
                      : <><Play className="mr-1 h-3.5 w-3.5" />Enable</>
                    }
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-ink-100 pt-4 sm:grid-cols-4 lg:grid-cols-6">
                <div>
                  <p className="text-xs font-medium text-ink-400">Last Run</p>
                  <p className="mt-0.5 text-sm text-ink-700" suppressHydrationWarning>
                    {job.lastRun ? new Date(job.lastRun).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    }) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-400">Next Run</p>
                  <p className="mt-0.5 text-sm text-ink-700" suppressHydrationWarning>
                    {job.nextRun ? new Date(job.nextRun).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    }) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-400">Duration</p>
                  <p className="mt-0.5 text-sm text-ink-700">{job.lastDuration || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-400">Last Status</p>
                  <p className="mt-0.5 flex items-center gap-1">
                    {lastStatusIcon(job.lastStatus)}
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', lastStatusColor(job.lastStatus))}>
                      {job.lastStatus || 'unknown'}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-400">Run Count</p>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-700">
                    <History className="h-3.5 w-3.5 text-ink-400" />
                    {job.runCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-400">Failures</p>
                  <p className={cn('mt-0.5 text-sm', job.failureCount > 0 ? 'font-medium text-red-600' : 'text-ink-700')}>
                    {job.failureCount}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
