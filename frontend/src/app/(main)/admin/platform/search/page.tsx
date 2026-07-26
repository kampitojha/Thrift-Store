'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search as SearchIcon, RefreshCcw, Database, CheckCircle, XCircle, AlertTriangle, Clock, Activity, Server, BookOpen } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

type SearchData = {
  indexStatus: string;
  meilisearchHost: string;
  documentsIndexed: number;
  lastSynced: string;
  syncDuration: string;
  indexes: Array<{ name: string; count: number }>;
  searchCount: number;
  avgSearchTime: string;
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

export default function SearchPage() {
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get<SearchData>('/admin/platform/search');
      setData(res);
      setError(null);
    } catch {
      setError('Failed to load search data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleReindex = async (target?: string) => {
    setReindexing(target || 'all');
    try {
      await apiClient.post('/admin/platform/search/reindex', target ? { target } : undefined);
      setReindexing(null);
      fetchData();
    } catch {
      setReindexing(null);
    }
  };

  const statusHealthy = data?.indexStatus === 'healthy' || data?.indexStatus === 'connected';

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
          <Skeleton className="h-32 rounded-2xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <SearchIcon className="h-6 w-6 text-brand-600" />
            Search Engine
          </h1>
          <p className="mt-1 text-sm text-ink-500">Monitor and manage Meilisearch indexes</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCcw className="mr-1.5 h-4 w-4" />Refresh
        </Button>
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
                  {data.indexStatus}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs font-mono text-ink-400">{data.meilisearchHost}</p>
            </div>
            <div className="ml-auto flex items-center gap-6 text-sm text-ink-500">
              <div className="text-center">
                <p className="text-xs font-medium text-ink-400">Last Synced</p>
                <p className="font-semibold text-ink-700">{data.lastSynced ? new Date(data.lastSynced).toLocaleString() : 'N/A'}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-ink-400">Sync Duration</p>
                <p className="font-semibold text-ink-700">{data.syncDuration}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Database className="h-5 w-5 text-brand-600" />}
            label="Documents Indexed"
            value={data.documentsIndexed.toLocaleString()}
            sub={`${data.indexes.length} indexes`}
            color="bg-brand-50"
          />
          <StatCard
            icon={<Activity className="h-5 w-5 text-blue-600" />}
            label="Search Count Today"
            value={data.searchCount.toLocaleString()}
            sub="Queries today"
            color="bg-blue-50"
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            label="Avg Search Time"
            value={data.avgSearchTime}
            sub="Average latency"
            color="bg-amber-50"
          />
          <StatCard
            icon={<Server className="h-5 w-5 text-violet-600" />}
            label="Last Synced"
            value={data.lastSynced ? new Date(data.lastSynced).toLocaleDateString() : 'N/A'}
            sub={data.lastSynced ? new Date(data.lastSynced).toLocaleTimeString() : undefined}
            color="bg-violet-50"
          />
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
          <div className="border-b border-ink-100 px-5 py-4">
            <h3 className="font-display text-base font-semibold text-ink-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-violet-600" />
              Indexes
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-medium text-ink-500">
                  <th className="px-5 py-3">Index Name</th>
                  <th className="px-5 py-3">Documents</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.indexes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-12 text-center text-sm text-ink-400">
                      No indexes found
                    </td>
                  </tr>
                ) : (
                  data.indexes.map((idx) => (
                    <tr key={idx.name} className="border-b border-ink-50 hover:bg-ink-50/50">
                      <td className="px-5 py-3 font-mono text-xs text-ink-700">{idx.name}</td>
                      <td className="px-5 py-3 text-xs text-ink-700">{idx.count.toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReindex(idx.name)}
                          disabled={reindexing === idx.name}
                        >
                          <RefreshCcw className={cn('mr-1.5 h-3 w-3', reindexing === idx.name && 'animate-spin')} />
                          {reindexing === idx.name ? 'Reindexing...' : 'Reindex'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <h3 className="font-display text-base font-semibold text-ink-900 flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-emerald-600" />
            Actions
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleReindex()}
              disabled={reindexing === 'all'}
            >
              <RefreshCcw className={cn('mr-1.5 h-4 w-4', reindexing === 'all' && 'animate-spin')} />
              {reindexing === 'all' ? 'Rebuilding...' : 'Rebuild All Indexes'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReindex('products')}
              disabled={reindexing === 'products'}
            >
              <RefreshCcw className={cn('mr-1.5 h-4 w-4', reindexing === 'products' && 'animate-spin')} />
              {reindexing === 'products' ? 'Rebuilding...' : 'Rebuild Products'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReindex('sellers')}
              disabled={reindexing === 'sellers'}
            >
              <RefreshCcw className={cn('mr-1.5 h-4 w-4', reindexing === 'sellers' && 'animate-spin')} />
              {reindexing === 'sellers' ? 'Rebuilding...' : 'Rebuild Sellers'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
