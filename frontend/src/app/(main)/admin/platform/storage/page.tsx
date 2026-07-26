'use client';

import { useEffect, useState, useCallback } from 'react';
import { Cloud, Image, Video, File, HardDrive, CheckCircle, XCircle, AlertTriangle, RefreshCcw, Trash2, Database } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

type StorageData = {
  provider: string;
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  activeFiles: number;
  unusedFiles: number;
  brokenFiles: number;
  byType: { images: number; videos: number; view360: number };
  cloudinary: { cloudName: string; usage: string };
};

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  highlight?: boolean;
};

function StatCard({ icon, label, value, sub, color, highlight }: StatCardProps) {
  return (
    <div className={cn(
      'rounded-2xl border bg-white p-5 shadow-soft transition',
      highlight ? 'border-amber-200 ring-1 ring-amber-100' : 'border-ink-100',
    )}>
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', color || 'bg-brand-50')}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-500">{label}</p>
          <p className={cn('text-lg font-semibold', highlight ? 'text-amber-700' : 'text-ink-900')}>{value}</p>
          {sub && <p className="text-xs text-ink-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default function StoragePage() {
  const [data, setData] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<StorageData>('/admin/platform/storage');
      setData(res);
    } catch {
      setError('Failed to load storage data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeRatio = data ? Math.round((data.activeFiles / (data.totalFiles || 1)) * 100) : 0;

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
          <Skeleton className="h-24 rounded-2xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
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
            <Cloud className="h-6 w-6 text-brand-600" />
            Storage
          </h1>
          <p className="mt-1 text-sm text-ink-500">Manage file storage and media assets</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCcw className="mr-1.5 h-4 w-4" />Refresh
        </Button>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50">
                <Cloud className="h-6 w-6 text-sky-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-semibold text-ink-900">Provider</h2>
                  <Badge variant="brand">{data.provider}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-ink-500">
                  Cloud: <span className="font-medium text-ink-700">{data.cloudinary.cloudName}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-ink-500">
              <div className="text-center">
                <p className="text-xs font-medium text-ink-400">Usage</p>
                <p className="font-semibold text-ink-700">{data.cloudinary.usage}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<File className="h-5 w-5 text-brand-600" />}
            label="Total Files"
            value={data.totalFiles.toLocaleString()}
            sub="All stored files"
            color="bg-brand-50"
          />
          <StatCard
            icon={<HardDrive className="h-5 w-5 text-violet-600" />}
            label="Total Size"
            value={data.totalSizeFormatted}
            sub={data.totalSizeBytes > 0 ? `${(data.totalSizeBytes / 1024 / 1024).toFixed(1)} MB` : undefined}
            color="bg-violet-50"
          />
          <StatCard
            icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
            label="Active Files"
            value={data.activeFiles.toLocaleString()}
            sub="In use by products"
            color="bg-emerald-50"
          />
          <StatCard
            icon={<Trash2 className="h-5 w-5 text-amber-600" />}
            label="Unused Files"
            value={data.unusedFiles.toLocaleString()}
            sub="Orphaned / stale"
            color="bg-amber-50"
            highlight={data.unusedFiles > 0}
          />
        </div>

        <div className={cn(
          'rounded-2xl border p-5 shadow-soft',
          data.brokenFiles > 0 ? 'border-red-200 bg-red-50/30' : 'border-ink-100 bg-white',
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl',
                data.brokenFiles > 0 ? 'bg-red-100' : 'bg-emerald-50',
              )}>
                {data.brokenFiles > 0
                  ? <XCircle className="h-5 w-5 text-red-600" />
                  : <CheckCircle className="h-5 w-5 text-emerald-600" />
                }
              </div>
              <div>
                <p className="text-xs font-medium text-ink-500">Storage Health</p>
                <p className={cn(
                  'text-lg font-semibold',
                  data.brokenFiles > 0 ? 'text-red-700' : 'text-emerald-700',
                )}>
                  {data.brokenFiles > 0
                    ? `${data.brokenFiles} broken file${data.brokenFiles !== 1 ? 's' : ''} detected`
                    : 'All files healthy'
                  }
                </p>
                {data.brokenFiles > 0 && (
                  <p className="text-xs text-red-500">Orphaned or corrupted files need attention</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-display text-base font-semibold text-ink-900 flex items-center gap-2">
            <Database className="h-4 w-4 text-brand-600" />
            By Type Distribution
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
                  <Image className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-500">Images</p>
                  <p className="text-lg font-semibold text-ink-900">{data.byType.images.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
                  <Video className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-500">Videos</p>
                  <p className="text-lg font-semibold text-ink-900">{data.byType.videos.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                  <Database className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-500">360 Views</p>
                  <p className="text-lg font-semibold text-ink-900">{data.byType.view360.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-ink-900 flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-brand-600" />
              Storage Usage
            </h3>
            <span className="text-xs font-medium text-ink-500">
              {data.activeFiles.toLocaleString()} active / {data.unusedFiles.toLocaleString()} unused
            </span>
          </div>
          <Progress value={activeRatio} />
          <div className="mt-2 flex items-center justify-between text-xs text-ink-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Active ({activeRatio}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-ink-300" />
              Unused ({100 - activeRatio}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
