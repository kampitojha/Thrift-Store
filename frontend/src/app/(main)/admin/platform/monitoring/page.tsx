'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Wifi,
  Users,
  Store,
  ShoppingCart,
  Bell,
  MessageSquare,
  CreditCard,
  Server,
  Bug,
  Clock,
  RefreshCcw,
  Activity,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type MonitoringData = {
  onlineUsers: number;
  activeSellers: number;
  activeBuyers: number;
  activeOrders: number;
  todayOrders: number;
  todayPayments: number;
  todayMessages: number;
  todayNotifications: number;
  pendingQueueJobs: number;
  recentErrors: number;
  requestsLast5Min: number;
  timestamp: string;
};

type Variant = 'neutral' | 'amber' | 'red';

function MetricCard({
  icon,
  label,
  value,
  variant = 'neutral',
  dot,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  variant?: Variant;
  dot?: string;
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
    <div
      className={`flex items-center gap-4 rounded-2xl border p-5 shadow-soft transition hover:shadow-md ${border[variant]}`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ${iconColor[variant]}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">{label}</p>
        <p className={`mt-0.5 flex items-center gap-2 text-2xl font-semibold tabular-nums ${valueColor[variant]}`}>
          {dot && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dot}`} />
            </span>
          )}
          {value}
        </p>
      </div>
    </div>
  );
}

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

export default function AdminPlatformMonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const res = await apiClient.get<MonitoringData>('/admin/platform/monitoring');
      setData(res);
    } catch {
      setError('Failed to load monitoring data');
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Activity className="h-6 w-6 text-brand-600" />
            Platform Monitoring
          </h1>
          <p className="mt-1 text-sm text-ink-500">Real-time metrics and system health</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-700">Live</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCcw className={`mr-1.5 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Now
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <Bug className="h-5 w-5 text-red-600" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData(true)}>
            <RefreshCcw className="mr-1.5 h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {loading && !data && (
        <div role="status" aria-busy="true" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<Wifi className="h-6 w-6" />}
              label="Online Users"
              value={data.onlineUsers}
              dot="bg-emerald-500"
            />
            <MetricCard icon={<Store className="h-6 w-6" />} label="Active Sellers" value={data.activeSellers} />
            <MetricCard icon={<Users className="h-6 w-6" />} label="Active Buyers" value={data.activeBuyers} />
            <MetricCard icon={<ShoppingCart className="h-6 w-6" />} label="Active Orders" value={data.activeOrders} />
            <MetricCard icon={<ShoppingCart className="h-6 w-6" />} label="Orders Today" value={data.todayOrders} />
            <MetricCard icon={<CreditCard className="h-6 w-6" />} label="Payments Today" value={data.todayPayments} />
            <MetricCard icon={<MessageSquare className="h-6 w-6" />} label="Messages Today" value={data.todayMessages} />
            <MetricCard icon={<Bell className="h-6 w-6" />} label="Notifications Today" value={data.todayNotifications} />
            <MetricCard
              icon={<Server className="h-6 w-6" />}
              label="Pending Queue Jobs"
              value={data.pendingQueueJobs}
              variant={data.pendingQueueJobs > 0 ? 'amber' : 'neutral'}
            />
            <MetricCard
              icon={<Bug className="h-6 w-6" />}
              label="Recent Errors"
              value={data.recentErrors}
              variant={data.recentErrors > 0 ? 'red' : 'neutral'}
            />
            <MetricCard icon={<Activity className="h-6 w-6" />} label="Requests (5 min)" value={data.requestsLast5Min} />
            <div className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm text-ink-400">
                <Clock className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">Last Updated</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-900" suppressHydrationWarning>
                  {relativeTime(data.timestamp)}
                </p>
                <p className="mt-0.5 text-xs text-ink-400" suppressHydrationWarning>
                  {new Date(data.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Auto-refreshing every 10s
          </div>
        </>
      )}
    </div>
  );
}
