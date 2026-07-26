'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCcw,
  Eye,
  EyeOff,
  Server,
  Shield,
  Key,
  Activity,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type EnvironmentData = {
  environment: string;
  availableEnvironments: string[];
  variables: Array<{
    key: string;
    value: string | null;
    required: boolean;
    secret: boolean;
    validated?: boolean;
  }>;
  stats: { total: number; configured: number; missing: number; secrets: number };
  lastValidated: string;
};

const ENV_COLORS: Record<string, string> = {
  development: 'bg-blue-100 text-blue-800 border-blue-200',
  staging: 'bg-amber-100 text-amber-800 border-amber-200',
  production: 'bg-red-100 text-red-800 border-red-200',
};

export default function AdminPlatformEnvironmentPage() {
  const [data, setData] = useState<EnvironmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const res = await apiClient.get<EnvironmentData>('/admin/platform/environment');
      setData(res);
    } catch {
      setError('Failed to load environment data');
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSecret = (key: string) => {
    setRevealedSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  function formatTimestamp(ts: string) {
    return new Date(ts).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-3xl border border-dashed border-red-200 py-24 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchData(true)}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Globe className="h-6 w-6 text-brand-600" />
            Environment Configuration
          </h1>
          <p className="mt-1 text-sm text-ink-500">Manage environment variables and configuration</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
          <RefreshCcw className={cn('mr-1.5 h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {loading && !data && (
        <div className="space-y-4">
          <Skeleton className="h-16 rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-12 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <Badge className={cn('border', ENV_COLORS[data.environment] || 'bg-ink-100 text-ink-800')}>
                <Server className="mr-1 h-3.5 w-3.5" />
                {data.environment.charAt(0).toUpperCase() + data.environment.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-ink-500">
              <Activity className="h-4 w-4" />
              <span>Last validated:</span>
              <span className="font-medium text-ink-700" suppressHydrationWarning>
                {formatTimestamp(data.lastValidated)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition hover:shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm text-ink-500">
                <Key className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">Total Variables</p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums text-ink-900">{data.stats.total}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-soft transition hover:shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm text-emerald-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">Configured</p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums text-emerald-900">{data.stats.configured}</p>
              </div>
            </div>
            <div className={cn(
              'flex items-center gap-4 rounded-2xl border p-5 shadow-soft transition hover:shadow-md',
              data.stats.missing > 0 ? 'border-red-200 bg-red-50/50' : 'border-ink-100 bg-white',
            )}>
              <div className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm',
                data.stats.missing > 0 ? 'text-red-600' : 'text-ink-500',
              )}>
                <XCircle className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">Missing</p>
                <p className={cn('mt-0.5 text-2xl font-semibold tabular-nums', data.stats.missing > 0 ? 'text-red-900' : 'text-ink-900')}>
                  {data.stats.missing}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition hover:shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm text-ink-500">
                <Shield className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">Secrets</p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums text-ink-900">{data.stats.secrets}</p>
              </div>
            </div>
          </div>

          {data.availableEnvironments.length > 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <h3 className="font-display text-sm font-semibold text-ink-700 mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4 text-ink-400" />
                Available Environments
              </h3>
              <p className="text-xs text-ink-500 mb-3">Switching environment requires a server restart</p>
              <div className="flex flex-wrap gap-3">
                {data.availableEnvironments.map((env) => (
                  <div
                    key={env}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                      env === data.environment
                        ? 'border-brand-200 bg-brand-50 text-brand-700'
                        : 'border-ink-200 bg-white text-ink-500',
                    )}
                  >
                    <div className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border-2',
                      env === data.environment ? 'border-brand-600' : 'border-ink-300',
                    )}>
                      {env === data.environment && <div className="h-2 w-2 rounded-full bg-brand-600" />}
                    </div>
                    <span className="capitalize">{env}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-ink-100 bg-white shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">Variable</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">Validated</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {data.variables.map((v) => {
                    const isMissing = v.value === null || v.value === '';
                    const rowColor = isMissing && v.required
                      ? 'bg-red-50/40'
                      : isMissing && !v.required
                        ? 'bg-amber-50/40'
                        : '';
                    return (
                      <tr key={v.key} className={cn('group', rowColor)}>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-medium text-ink-900">{v.key}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'font-mono text-xs',
                              v.secret && !revealedSecrets.has(v.key) ? 'text-ink-300' : 'text-ink-700',
                            )}>
                              {v.value === null || v.value === ''
                                ? <span className="text-ink-400 italic">not set</span>
                                : v.secret && !revealedSecrets.has(v.key)
                                  ? '•'.repeat(Math.min(v.value.length, 24))
                                  : v.value}
                            </span>
                            {v.secret && v.value && (
                              <button
                                onClick={() => toggleSecret(v.key)}
                                className="flex h-6 w-6 items-center justify-center rounded-md text-ink-300 hover:text-ink-600 hover:bg-ink-100 transition-colors"
                              >
                                {revealedSecrets.has(v.key) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isMissing && v.required ? (
                            <Badge className="bg-red-100 text-red-800 gap-1">
                              <XCircle className="h-3 w-3" />
                              Missing
                            </Badge>
                          ) : isMissing && !v.required ? (
                            <Badge className="bg-amber-100 text-amber-800 gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Optional
                            </Badge>
                          ) : (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Set
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {v.validated === true ? (
                            <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Valid
                            </span>
                          ) : v.validated === false ? (
                            <span className="flex items-center gap-1.5 text-red-600 text-xs font-medium">
                              <XCircle className="h-3.5 w-3.5" />
                              Invalid
                            </span>
                          ) : (
                            <span className="text-ink-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {v.secret ? (
                            <Badge className="bg-purple-100 text-purple-800 gap-1">
                              <Key className="h-3 w-3" />
                              Secret
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Globe className="h-3 w-3" />
                              Public
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.variables.length === 0 && (
              <div className="py-16 text-center">
                <Key className="mx-auto h-10 w-10 text-ink-300" />
                <p className="mt-3 text-sm font-medium text-ink-600">No variables configured</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
