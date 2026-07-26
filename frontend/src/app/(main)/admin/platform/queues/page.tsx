'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Server, Clock, CheckCircle, XCircle, AlertTriangle,
  RefreshCcw, Play, Pause, Trash2, List,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

type QueueData = {
  summary: { pending: number; running: number; completed: number; failed: number; scheduled: number; total: number };
  byType: Array<{ type: string; count: number }>;
  deadLetterCount: number;
  averageWaitTime: string;
  averageProcessingTime: string;
  oldestJob: string | null;
};

const summaryColorMap: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Clock },
  running: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: Play },
  completed: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: CheckCircle },
  failed: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: XCircle },
  scheduled: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', icon: Clock },
  total: { bg: 'bg-ink-50 border-ink-200', text: 'text-ink-700', icon: Server },
};

function SummaryCard({
  label,
  value,
  status,
}: {
  label: string;
  value: number | string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'scheduled' | 'total';
}) {
  const colors = summaryColorMap[status];
  const Icon = colors.icon;

  return (
    <div className={cn('rounded-2xl border p-5 shadow-soft', colors.bg)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-500">{label}</p>
        <Icon className={cn('h-4 w-4', colors.text)} />
      </div>
      <p className={cn('mt-2 text-2xl font-bold', colors.text)}>
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </p>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div role="status" aria-busy="true" className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export default function QueuesPage() {
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const res = await apiClient.get<QueueData>('/admin/platform/queues');
      setData(res);
    } catch {
      setError('Failed to load queue data');
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

  if (loading && !data) return <QueueSkeleton />;

  if (error && !data) {
    return (
      <div role="alert" className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">Failed to load queue data</p>
          <p className="mt-1 text-sm text-ink-500">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchData(true)}>
            <RefreshCcw className="mr-1.5 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const summaryEntries: Array<{ key: 'pending' | 'running' | 'completed' | 'failed' | 'scheduled' | 'total'; label: string }> = [
    { key: 'pending', label: 'Pending' },
    { key: 'running', label: 'Running' },
    { key: 'completed', label: 'Completed' },
    { key: 'failed', label: 'Failed' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'total', label: 'Total' },
  ];

  const healthCards = [
    {
      label: 'Dead Letter Count',
      value: data.deadLetterCount.toLocaleString('en-IN'),
      icon: Trash2,
      variant: data.deadLetterCount > 0 ? 'red' : 'neutral' as const,
    },
    {
      label: 'Avg Wait Time',
      value: data.averageWaitTime,
      icon: Clock,
      variant: 'neutral' as const,
    },
    {
      label: 'Avg Processing Time',
      value: data.averageProcessingTime,
      icon: Play,
      variant: 'neutral' as const,
    },
    {
      label: 'Oldest Job',
      value: data.oldestJob ?? 'N/A',
      icon: AlertTriangle,
      variant: data.oldestJob ? 'amber' as const : 'neutral' as const,
    },
  ];

  const totalByType = data.byType.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Server className="h-6 w-6 text-brand-600" />
            Queue Management
          </h1>
          <p className="mt-1 text-sm text-ink-500">Monitor and manage background job queues</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCcw className={cn('mr-1.5 h-4 w-4', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div role="alert" className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData(true)}>
            <RefreshCcw className="mr-1.5 h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <List className="h-3.5 w-3.5" />
          Job Summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {summaryEntries.map(({ key, label }) => (
            <SummaryCard key={key} label={label} value={data.summary[key]} status={key} />
          ))}
        </div>
      </section>

      {/* Queue Health */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          Queue Health
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {healthCards.map((card) => (
            <div
              key={card.label}
              className={cn(
                'rounded-2xl border p-5 shadow-soft',
                card.variant === 'red' && 'border-red-200 bg-red-50/50',
                card.variant === 'amber' && 'border-amber-200 bg-amber-50/50',
                card.variant === 'neutral' && 'border-ink-100 bg-white',
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{card.label}</p>
                <card.icon
                  className={cn(
                    'h-4 w-4',
                    card.variant === 'red' && 'text-red-500',
                    card.variant === 'amber' && 'text-amber-500',
                    card.variant === 'neutral' && 'text-ink-300',
                  )}
                />
              </div>
              <p
                className={cn(
                  'mt-2 text-2xl font-bold',
                  card.variant === 'red' && 'text-red-700',
                  card.variant === 'amber' && 'text-amber-700',
                  card.variant === 'neutral' && 'text-ink-900',
                )}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Jobs by Type */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <List className="h-3.5 w-3.5" />
          Jobs by Type
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wider text-ink-400">
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Count</th>
                <th className="pb-3">Distribution</th>
              </tr>
            </thead>
            <tbody>
              {data.byType.map((item) => (
                <tr key={item.type} className="border-b border-ink-50 last:border-0">
                  <td className="py-3 pr-4 font-medium text-ink-900">{item.type}</td>
                  <td className="py-3 pr-4 tabular-nums text-ink-700">
                    {item.count.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <Progress
                        value={totalByType > 0 ? (item.count / totalByType) * 100 : 0}
                        className="h-2 w-32"
                      />
                      <span className="text-xs text-ink-400">
                        {totalByType > 0
                          ? ((item.count / totalByType) * 100).toFixed(1)
                          : '0.0'}
                        %
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {data.byType.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-sm text-ink-400">
                    No job types found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Developer Tools */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <Server className="h-3.5 w-3.5" />
          Developer Tools
        </h2>
        <p className="mb-4 text-sm text-ink-500">
          Advanced tools for debugging and managing queues.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" asChild>
            <a href="/admin/platform/queues/jobs">
              <List className="mr-1.5 h-4 w-4" />
              View All Jobs
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/admin/platform/queues/jobs?status=failed">
              <XCircle className="mr-1.5 h-4 w-4" />
              Failed Jobs
            </a>
          </Button>
        </div>
      </section>

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-ink-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
        </span>
        Auto-refreshing every 15s
      </div>
    </div>
  );
}
