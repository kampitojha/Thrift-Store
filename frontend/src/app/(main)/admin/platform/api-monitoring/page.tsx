'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Activity,
  ActivitySquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCcw,
  Server,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type ApiMonitoringData = {
  totalEndpoints: number;
  healthyEndpoints: number;
  degradedEndpoints: number;
  downEndpoints: number;
  totalRequestsToday: number;
  requestsLastHour: number;
  errorsLastHour: number;
  errorRate: string;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  endpoints: Array<{
    path: string;
    method: string;
    description: string;
    status: string;
    latencyMs: number;
    requestCount: number;
    errorCount: number;
    lastChecked: string;
  }>;
};

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-800',
  POST: 'bg-blue-100 text-blue-800',
  PUT: 'bg-amber-100 text-amber-800',
  PATCH: 'bg-violet-100 text-violet-800',
  DELETE: 'bg-red-100 text-red-800',
};

function getStatusColor(status: string) {
  switch (status) {
    case 'healthy': return 'bg-emerald-500';
    case 'degraded': return 'bg-amber-500';
    case 'down': return 'bg-red-500';
    default: return 'bg-ink-300';
  }
}

function getLatencyColor(ms: number) {
  if (ms < 50) return 'text-emerald-600';
  if (ms < 100) return 'text-amber-600';
  return 'text-red-600';
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</p>
          <p className={cn('mt-1.5 text-2xl font-semibold', color)}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-ink-400">{sub}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50 text-ink-500">
          {icon}
        </div>
      </div>
    </div>
  );
}

function LatencyCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</p>
      <p className={cn('mt-1.5 text-2xl font-semibold', getLatencyColor(value))}>
        {formatDuration(value)}
      </p>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white shadow-soft overflow-hidden">
      <div className="divide-y divide-ink-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ApiMonitoringPage() {
  const [data, setData] = useState<ApiMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get<ApiMonitoringData>('/admin/platform/api-monitoring');
      setData(res);
    } catch {
      setError('Failed to load API monitoring data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Activity className="h-6 w-6 text-brand-600" />
            API Monitoring
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Real-time health and performance of all API endpoints
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCcw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div role="status" aria-busy="true" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <SkeletonTable />
        </div>
      ) : error ? (
        <div role="alert" className="rounded-3xl border border-dashed border-red-200 py-24 text-center">
          <ActivitySquare className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>
            Try Again
          </Button>
        </div>
      ) : !data ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Server className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No data available</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <SummaryCard
              icon={<Server className="h-5 w-5" />}
              label="Total Endpoints"
              value={data.totalEndpoints}
              sub={[
                data.healthyEndpoints > 0 && `${data.healthyEndpoints} healthy`,
                data.degradedEndpoints > 0 && `${data.degradedEndpoints} degraded`,
                data.downEndpoints > 0 && `${data.downEndpoints} down`,
              ].filter(Boolean).join(' · ')}
              color="text-ink-900"
            />
            <SummaryCard
              icon={<Activity className="h-5 w-5" />}
              label="Requests Today"
              value={data.totalRequestsToday.toLocaleString()}
              sub={`${data.requestsLastHour.toLocaleString()} in last hour`}
              color="text-ink-900"
            />
            <SummaryCard
              icon={<AlertTriangle className="h-5 w-5" />}
              label="Error Rate"
              value={data.errorRate}
              sub={`${data.errorsLastHour} errors in last hour`}
              color={Number(data.errorRate) > 5 ? 'text-red-600' : Number(data.errorRate) > 1 ? 'text-amber-600' : 'text-emerald-600'}
            />
            <SummaryCard
              icon={<Clock className="h-5 w-5" />}
              label="Avg Latency"
              value={formatDuration(data.avgLatencyMs)}
              color={getLatencyColor(data.avgLatencyMs)}
            />
          </div>

          {/* Latency Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <LatencyCard label="P95 Latency" value={data.p95LatencyMs} />
            <LatencyCard label="P99 Latency" value={data.p99LatencyMs} />
          </div>

          {/* Endpoint Table */}
          <div className="rounded-2xl border border-ink-100 bg-white shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Path</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Latency</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Requests</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Errors</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Last Checked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {data.endpoints.map((ep) => (
                    <tr key={ep.path + ep.method} className="hover:bg-ink-50/50 transition">
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          METHOD_COLORS[ep.method] || 'bg-ink-100 text-ink-700',
                        )}>
                          {ep.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-700 max-w-[240px] truncate">
                        {ep.path}
                      </td>
                      <td className="px-4 py-3 text-ink-600 max-w-[200px] truncate">
                        {ep.description}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full', getStatusColor(ep.status))} />
                          <span className="text-xs capitalize text-ink-600">{ep.status}</span>
                        </div>
                      </td>
                      <td className={cn('px-4 py-3 font-medium whitespace-nowrap', getLatencyColor(ep.latencyMs))}>
                        {formatDuration(ep.latencyMs)}
                      </td>
                      <td className="px-4 py-3 text-ink-700 whitespace-nowrap">
                        {ep.requestCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-sm',
                          ep.errorCount > 0 ? 'text-red-600 font-medium' : 'text-ink-500',
                        )}>
                          {ep.errorCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-400 whitespace-nowrap">
                        {new Date(ep.lastChecked).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.endpoints.length === 0 && (
              <div className="py-16 text-center">
                <Server className="mx-auto h-10 w-10 text-ink-300" />
                <p className="mt-3 text-sm text-ink-500">No endpoints registered</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
