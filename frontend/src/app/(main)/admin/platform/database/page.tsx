'use client';

import { useEffect, useState, useCallback } from 'react';
import { Database, Server, Clock, AlertTriangle, CheckCircle, XCircle, Activity, RefreshCcw, HardDrive } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

type DatabaseData = {
  status: string;
  poolUsed: number;
  poolTotal: number;
  poolFree: number;
  activeQueries: number;
  slowQueriesCount: number;
  failedQueries: number;
  sizeBytes: number;
  sizeFormatted: string;
  lastBackup: string | null;
  schemaVersion: string;
  migrationsApplied: number;
  connectionString: string;
  activeQueriesList: Array<{ pid: number; query: string; state: string; wait_event: string | null; query_start: string }>;
  slowQueriesList: Array<{ query: string; calls: number; mean_time: number; rows: number }>;
  migrationStatus: Array<{ migration_name: string; started_at: string; finished_at: string }>;
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

export default function DatabasePage() {
  const [data, setData] = useState<DatabaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<DatabaseData>('/admin/platform/database');
      setData(res);
    } catch {
      setError('Failed to load database data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const poolPercent = data ? Math.round((data.poolUsed / data.poolTotal) * 100) : 0;
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
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
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

  const maskConnection = (str: string) => {
    try {
      const url = new URL(str);
      if (url.password) url.password = '****';
      if (url.username) url.username = url.username.slice(0, 4) + '****';
      return url.toString();
    } catch {
      return str.replace(/\/\/[^:]+:[^@]+@/, '//****:****@');
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Database className="h-6 w-6 text-brand-600" />
            Database
          </h1>
          <p className="mt-1 text-sm text-ink-500">Monitor database performance, connections, and queries</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCcw className="mr-1.5 h-4 w-4" />Refresh
        </Button>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
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
                <p className="mt-0.5 text-xs font-mono text-ink-400">{maskConnection(data.connectionString)}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-ink-500">
              <div className="text-center">
                <p className="text-xs font-medium text-ink-400">Schema</p>
                <p className="font-semibold text-ink-700">{data.schemaVersion}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-ink-400">Migrations</p>
                <p className="font-semibold text-ink-700">{data.migrationsApplied}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-ink-400">Last Backup</p>
                <p className="font-semibold text-ink-700">{data.lastBackup ? new Date(data.lastBackup).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-xs font-medium text-ink-500">Connection Pool</span>
              <span className="text-xs font-medium text-ink-700">{data.poolUsed} / {data.poolTotal} used</span>
            </div>
            <Progress value={poolPercent} />
            <p className="mt-1 text-xs text-ink-400">{data.poolFree} free connections available</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Server className="h-5 w-5 text-brand-600" />}
            label="Pool Used"
            value={`${data.poolUsed} / ${data.poolTotal}`}
            sub={`${poolPercent}% utilized`}
            color="bg-brand-50"
          />
          <StatCard
            icon={<Activity className="h-5 w-5 text-blue-600" />}
            label="Active Queries"
            value={data.activeQueries}
            sub="Currently executing"
            color="bg-blue-50"
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            label="Slow Queries"
            value={data.slowQueriesCount}
            sub="Above threshold"
            color="bg-amber-50"
          />
          <StatCard
            icon={<HardDrive className="h-5 w-5 text-violet-600" />}
            label="DB Size"
            value={data.sizeFormatted}
            sub={data.sizeBytes > 0 ? `${(data.sizeBytes / 1024 / 1024).toFixed(1)} MB` : undefined}
            color="bg-violet-50"
          />
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
          <div className="border-b border-ink-100 px-5 py-4">
            <h3 className="font-display text-base font-semibold text-ink-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              Active Queries
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-medium text-ink-500">
                  <th className="px-5 py-3">PID</th>
                  <th className="px-5 py-3">Query</th>
                  <th className="px-5 py-3">State</th>
                  <th className="px-5 py-3">Wait Event</th>
                  <th className="px-5 py-3">Started At</th>
                </tr>
              </thead>
              <tbody>
                {data.activeQueriesList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-ink-400">
                      No active queries
                    </td>
                  </tr>
                ) : (
                  data.activeQueriesList.map((q) => (
                    <tr key={q.pid} className="border-b border-ink-50 hover:bg-ink-50/50">
                      <td className="px-5 py-3 font-mono text-xs text-ink-700">{q.pid}</td>
                      <td className="max-w-xs px-5 py-3">
                        <p className="truncate font-mono text-xs text-ink-700">{q.query}</p>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={
                          q.state === 'active' ? 'default' :
                          q.state === 'idle' ? 'outline' : 'brand'
                        }>{q.state}</Badge>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-ink-500">{q.wait_event || '—'}</td>
                      <td className="px-5 py-3 text-xs text-ink-500">
                        {new Date(q.query_start).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
          <div className="border-b border-ink-100 px-5 py-4">
            <h3 className="font-display text-base font-semibold text-ink-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Slow Queries
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-medium text-ink-500">
                  <th className="px-5 py-3">Query</th>
                  <th className="px-5 py-3 text-right">Calls</th>
                  <th className="px-5 py-3 text-right">Mean Time (ms)</th>
                  <th className="px-5 py-3 text-right">Rows</th>
                </tr>
              </thead>
              <tbody>
                {data.slowQueriesList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-ink-400">
                      No slow queries recorded
                    </td>
                  </tr>
                ) : (
                  data.slowQueriesList.map((q, i) => (
                    <tr key={i} className="border-b border-ink-50 hover:bg-ink-50/50">
                      <td className="max-w-md px-5 py-3">
                        <p className="truncate font-mono text-xs text-ink-700">{q.query}</p>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-ink-700">{q.calls}</td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-ink-700">{q.mean_time.toFixed(2)}</td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-ink-700">{q.rows}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
          <div className="border-b border-ink-100 px-5 py-4">
            <h3 className="font-display text-base font-semibold text-ink-900 flex items-center gap-2">
              <Server className="h-4 w-4 text-violet-600" />
              Migrations
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-medium text-ink-500">
                  <th className="px-5 py-3">Migration</th>
                  <th className="px-5 py-3">Started At</th>
                  <th className="px-5 py-3">Finished At</th>
                </tr>
              </thead>
              <tbody>
                {data.migrationStatus.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-12 text-center text-sm text-ink-400">
                      No migrations recorded
                    </td>
                  </tr>
                ) : (
                  data.migrationStatus.map((m, i) => (
                    <tr key={i} className="border-b border-ink-50 hover:bg-ink-50/50">
                      <td className="px-5 py-3 font-mono text-xs text-ink-700">{m.migration_name}</td>
                      <td className="px-5 py-3 text-xs text-ink-500">{new Date(m.started_at).toLocaleString()}</td>
                      <td className="px-5 py-3 text-xs text-ink-500">
                        {m.finished_at ? new Date(m.finished_at).toLocaleString() : (
                          <Badge variant="brand">In Progress</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
