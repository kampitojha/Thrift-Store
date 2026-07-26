'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Sunrise,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCcw,
  Activity,
  Database,
  HardDrive,
  Server,
  Webhook,
  Mail,
  CreditCard,
  Search,
  Clock,
  Shield,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type HealthData = {
  status: string;
  checks: Record<string, { status: string; latency?: string; error?: string }>;
  timestamp: string;
  summary: { total: number; healthy: number; degraded: number; unhealthy: number };
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  api: Server,
  database: Database,
  redis: Database,
  storage: HardDrive,
  webhooks: Webhook,
  mail: Mail,
  payments: CreditCard,
  search: Search,
  auth: Shield,
  queue: Activity,
};

function getServiceIcon(key: string) {
  const Icon = iconMap[key] || Activity;
  return <Icon className="h-5 w-5" />;
}

function statusColor(status: string) {
  switch (status) {
    case 'healthy':
      return 'text-emerald-500';
    case 'degraded':
      return 'text-amber-500';
    case 'unhealthy':
      return 'text-red-500';
    default:
      return 'text-ink-300';
  }
}

function statusBg(status: string) {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-50 border-emerald-200';
    case 'degraded':
      return 'bg-amber-50 border-amber-200';
    case 'unhealthy':
      return 'bg-red-50 border-red-200';
    default:
      return 'bg-ink-50 border-ink-200';
  }
}

function bannerColor(status: string) {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-600';
    case 'degraded':
      return 'bg-amber-500';
    case 'unhealthy':
      return 'bg-red-600';
    default:
      return 'bg-ink-600';
  }
}

function bannerMessage(status: string) {
  switch (status) {
    case 'healthy':
      return 'All Systems Operational';
    case 'degraded':
      return 'Degraded Performance';
    case 'unhealthy':
      return 'System Issue Detected';
    default:
      return 'Unknown Status';
  }
}

function HealthSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-8" role="status" aria-busy="true">
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await apiClient.get<HealthData>('/admin/platform/health');
      setData(res);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(() => fetchHealth(true), 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading) return <HealthSkeleton />;

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6" role="alert">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">Failed to load health data</p>
          <p className="mt-1 text-sm text-ink-500">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => { setLoading(true); fetchHealth(); }}>
            <RefreshCcw className="mr-1 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const summaryCards = [
    { label: 'Total Checks', value: data.summary.total, icon: Activity, color: 'text-ink-900', bg: 'bg-ink-50' },
    { label: 'Healthy', value: data.summary.healthy, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Degraded', value: data.summary.degraded, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Unhealthy', value: data.summary.unhealthy, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">
            <Sunrise className="mr-2 inline-block h-6 w-6" />
            Health Checks
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Monitor platform service status and latency
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
          >
            <RefreshCcw className={cn('mr-1 h-4 w-4', refreshing && 'animate-spin')} />
            {refreshing ? 'Running...' : 'Run Health Checks'}
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={cn(
          'rounded-2xl px-6 py-5 text-white shadow-soft',
          bannerColor(data.status),
        )}
      >
        <div className="flex items-center gap-3">
          {data.status === 'healthy' ? (
            <CheckCircle className="h-8 w-8" />
          ) : data.status === 'degraded' ? (
            <AlertTriangle className="h-8 w-8" />
          ) : (
            <XCircle className="h-8 w-8" />
          )}
          <div>
            <p className="text-xl font-semibold">{bannerMessage(data.status)}</p>
            <p className="mt-1 text-sm opacity-90">
              {data.summary.healthy} of {data.summary.total} services healthy
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
                {card.label}
              </p>
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', card.bg)}>
                <card.icon className={cn('h-4 w-4', card.color)} />
              </div>
            </div>
            <p className={cn('mt-2 text-2xl font-bold', card.color)}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Health Check Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(data.checks).map(([key, check]) => (
          <div
            key={key}
            className={cn(
              'rounded-2xl border bg-white p-5 shadow-soft transition hover:shadow-lift',
              statusBg(check.status),
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', check.status === 'healthy' ? 'bg-emerald-100' : check.status === 'degraded' ? 'bg-amber-100' : check.status === 'unhealthy' ? 'bg-red-100' : 'bg-ink-100')}>
                  {getServiceIcon(key)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-900 capitalize">
                    {key.replace(/-/g, ' ')}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className={cn('inline-block h-2 w-2 rounded-full', statusColor(check.status))} />
                    <Badge
                      variant={
                        check.status === 'healthy'
                          ? 'success'
                          : check.status === 'degraded'
                            ? 'outline'
                            : 'default'
                      }
                    >
                      {check.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {check.latency && (
                <div className="flex items-center gap-1.5 text-xs text-ink-400">
                  <Clock className="h-3 w-3" />
                  <span>{check.latency}</span>
                </div>
              )}
              {check.error && (
                <div className="flex items-start gap-1.5 text-xs text-red-600">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{check.error}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Last checked */}
      <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white px-5 py-3 shadow-soft">
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <Clock className="h-4 w-4" />
          Last checked:{' '}
          <span className="font-medium text-ink-600">
            {new Date(data.timestamp).toLocaleString()}
          </span>
        </div>
        <Badge variant={data.status === 'healthy' ? 'success' : 'outline'}>
          Auto-refresh every 30s
        </Badge>
      </div>
    </div>
  );
}
