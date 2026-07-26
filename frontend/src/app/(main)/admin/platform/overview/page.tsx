'use client';

import { useEffect, useState } from 'react';
import {
  Monitor, Wifi, ActivitySquare, Database, HardDrive, Server, Webhook,
  Sunrise, Cloud, Shield, Stethoscope, Clock, AlertTriangle,
  CheckCircle, XCircle, RefreshCcw, Users, Store, ShoppingCart, Bug,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn, formatINR } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type OverviewData = {
  platform: { name: string; version: string; environment: string; uptime: number; timezone: string };
  health: { status: string; checks: Record<string, { status: string; latency?: string }>; summary: { total: number; healthy: number; degraded: number; unhealthy: number } };
  monitoring: { onlineUsers: number; activeSellers: number; activeBuyers: number; activeOrders: number; todayOrders: number; todayPayments: number; todayMessages: number; todayNotifications: number; pendingQueueJobs: number; recentErrors: number; requestsLast5Min: number; timestamp: string };
  stats: { totalUsers: number; totalOrders: number; totalRevenue: number; pendingJobs: number; failedJobs: number; totalJobs: number; pendingRefunds: number; storage: { totalFiles: number; totalSizeFormatted: string; activeFiles: number } };
};

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

const healthBadgeStyles: Record<string, string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  degraded: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
};

function OverviewSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-8" role="status" aria-busy="true">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  );
}

export default function PlatformOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = () => {
    if (!isHydrated) return;
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return;

    apiClient
      .get<OverviewData>('/admin/platform/overview')
      .then((res) => {
        setData(res);
        setError('');
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load platform overview');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [user, isHydrated]);

  if (loading || !isHydrated) return <OverviewSkeleton />;

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6" role="alert">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">Failed to load platform overview</p>
          <p className="mt-1 text-sm text-ink-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const keyMetrics = [
    { label: 'Total Users', value: data.stats.totalUsers.toLocaleString('en-IN'), icon: Users },
    { label: 'Total Orders', value: data.stats.totalOrders.toLocaleString('en-IN'), icon: ShoppingCart },
    { label: 'Total Revenue', value: formatINR(data.stats.totalRevenue), icon: ActivitySquare },
    { label: 'Active Orders', value: data.monitoring.activeOrders.toLocaleString('en-IN'), icon: Wifi },
    { label: 'Online Users', value: data.monitoring.onlineUsers.toLocaleString('en-IN'), icon: Monitor },
    { label: 'Active Sellers', value: data.monitoring.activeSellers.toLocaleString('en-IN'), icon: Store },
    { label: 'Pending Queue Jobs', value: data.monitoring.pendingQueueJobs.toLocaleString('en-IN'), icon: Server },
    { label: 'Recent Errors', value: data.monitoring.recentErrors.toLocaleString('en-IN'), icon: Bug, danger: data.monitoring.recentErrors > 0 },
  ];

  const monitoringCards = [
    { label: 'Online Users', value: data.monitoring.onlineUsers.toLocaleString('en-IN'), icon: Monitor },
    { label: 'Active Sellers', value: data.monitoring.activeSellers.toLocaleString('en-IN'), icon: Store },
    { label: 'Active Buyers', value: data.monitoring.activeBuyers.toLocaleString('en-IN'), icon: Users },
    { label: 'Active Orders', value: data.monitoring.activeOrders.toLocaleString('en-IN'), icon: ShoppingCart },
    { label: "Today's Orders", value: data.monitoring.todayOrders.toLocaleString('en-IN'), icon: ShoppingCart },
    { label: "Today's Payments", value: data.monitoring.todayPayments.toLocaleString('en-IN'), icon: ActivitySquare },
    { label: "Today's Messages", value: data.monitoring.todayMessages.toLocaleString('en-IN'), icon: Webhook },
    { label: "Today's Notifications", value: data.monitoring.todayNotifications.toLocaleString('en-IN'), icon: Sunrise },
    { label: 'Pending Queue Jobs', value: data.monitoring.pendingQueueJobs.toLocaleString('en-IN'), icon: Server },
    { label: 'Recent Errors', value: data.monitoring.recentErrors.toLocaleString('en-IN'), icon: Bug, danger: data.monitoring.recentErrors > 0 },
    { label: 'Requests (5 min)', value: data.monitoring.requestsLast5Min.toLocaleString('en-IN'), icon: ActivitySquare },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">
            Platform Overview
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Real-time platform operations dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCcw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Platform Info */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <Monitor className="h-3.5 w-3.5" />
          Platform
        </h2>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-ink-400">Name:</span>
            <span className="text-sm font-semibold text-ink-900">{data.platform.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-ink-400">Version:</span>
            <span className="text-sm font-semibold text-ink-900">v{data.platform.version}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-ink-400">Environment:</span>
            <Badge variant={data.platform.environment === 'production' ? 'brand' : 'outline'}>
              {data.platform.environment}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-ink-400" />
            <span className="text-xs font-medium text-ink-400">Uptime:</span>
            <span className="text-sm font-semibold text-ink-900">{formatUptime(data.platform.uptime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-ink-400">Timezone:</span>
            <span className="text-sm font-semibold text-ink-900">{data.platform.timezone}</span>
          </div>
        </div>
      </section>

      {/* Health Checks */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <Sunrise className="h-3.5 w-3.5" />
          Health Checks
          <Badge
            variant="outline"
            className={cn(
              'ml-1 capitalize',
              data.health.status === 'healthy' && 'border-emerald-200 text-emerald-700',
              data.health.status === 'degraded' && 'border-amber-200 text-amber-700',
              data.health.status === 'unhealthy' && 'border-red-200 text-red-700',
            )}
          >
            {data.health.status}
          </Badge>
        </h2>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(data.health.checks).map(([name, check]) => (
              <Badge
                key={name}
                className={cn(
                  'capitalize',
                  healthBadgeStyles[check.status] || 'bg-ink-100 text-ink-800',
                )}
              >
                {name.replace(/_/g, ' ')}: {check.status}
                {check.latency && (
                  <span className="ml-1 text-[10px] opacity-70">({check.latency})</span>
                )}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-ink-100">
            <div className="flex items-center gap-1.5 text-xs text-ink-500">
              <span className="font-medium text-ink-700">Total:</span>
              <span>{data.health.summary.total}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium text-emerald-700">{data.health.summary.healthy}</span>
              <span className="text-ink-400">healthy</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-medium text-amber-700">{data.health.summary.degraded}</span>
              <span className="text-ink-400">degraded</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              <span className="font-medium text-red-700">{data.health.summary.unhealthy}</span>
              <span className="text-ink-400">unhealthy</span>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <ActivitySquare className="h-3.5 w-3.5" />
          Key Metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {keyMetrics.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition hover:shadow-lift"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
                  {card.label}
                </p>
                <card.icon className={cn('h-4 w-4', card.danger ? 'text-red-400' : 'text-ink-300')} />
              </div>
              <p className={cn('mt-2 text-2xl font-bold', card.danger ? 'text-red-600' : 'text-ink-900')}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Real-time Monitoring */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
            <Wifi className="h-3.5 w-3.5" />
            Real-time Monitoring
          </h2>
          <span className="text-[10px] text-ink-400">
            Last updated: {new Date(data.monitoring.timestamp).toLocaleTimeString('en-IN')}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {monitoringCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
                  {card.label}
                </p>
                <card.icon className={cn('h-4 w-4', card.danger ? 'text-red-400' : 'text-ink-300')} />
              </div>
              <p className={cn('mt-2 text-2xl font-bold', card.danger ? 'text-red-600' : 'text-ink-900')}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Storage */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <HardDrive className="h-3.5 w-3.5" />
          Storage
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Total Files</p>
            <p className="mt-1 text-2xl font-bold text-ink-900">
              {data.stats.storage.totalFiles.toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Total Size</p>
            <p className="mt-1 text-2xl font-bold text-ink-900">
              {data.stats.storage.totalSizeFormatted}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Active Files</p>
            <p className="mt-1 text-2xl font-bold text-ink-900">
              {data.stats.storage.activeFiles.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
