'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plug,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCcw,
  ExternalLink,
  CreditCard,
  Mail,
  Cloud,
  Search,
  BarChart3,
  Shield,
  Truck,
  Globe,
  Wifi,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type Integration = {
  name: string;
  type: string;
  status: string;
  config: Record<string, string>;
  docs: string;
};

type IntegrationData = {
  integrations: Integration[];
  total: number;
  connected: number;
  disconnected: number;
};

type ToastState = { message: string; visible: boolean; error?: boolean };

const TYPE_ICONS: Record<string, React.ReactNode> = {
  payment: <CreditCard className="h-5 w-5" />,
  email: <Mail className="h-5 w-5" />,
  storage: <Cloud className="h-5 w-5" />,
  search: <Search className="h-5 w-5" />,
  analytics: <BarChart3 className="h-5 w-5" />,
  security: <Shield className="h-5 w-5" />,
  shipping: <Truck className="h-5 w-5" />,
  cdn: <Globe className="h-5 w-5" />,
  network: <Wifi className="h-5 w-5" />,
};

const TYPE_COLORS: Record<string, string> = {
  payment: 'bg-sky-50 text-sky-600',
  email: 'bg-violet-50 text-violet-600',
  storage: 'bg-amber-50 text-amber-600',
  search: 'bg-emerald-50 text-emerald-600',
  analytics: 'bg-indigo-50 text-indigo-600',
  security: 'bg-rose-50 text-rose-600',
  shipping: 'bg-cyan-50 text-cyan-600',
  cdn: 'bg-orange-50 text-orange-600',
  network: 'bg-teal-50 text-teal-600',
};

function maskKey(key: string): string {
  if (key.length <= 4) return key;
  return key.slice(0, 2) + '*'.repeat(key.length - 4) + key.slice(-2);
}

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

function showToast(setter: (t: ToastState) => void, message: string, error = false) {
  setter({ message, visible: true, error });
  setTimeout(() => setter({ message: '', visible: false }), 3500);
}

export default function AdminIntegrationsPage() {
  const [data, setData] = useState<IntegrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<IntegrationData>('/admin/platform/integrations');
      setData(res);
    } catch {
      setError('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleReconnect(name: string) {
    setReconnecting(name);
    try {
      await apiClient.post(`/admin/platform/integrations/${name}/reconnect`);
      showToast(setToast, `${name} reconnected successfully`);
      fetchData();
    } catch {
      showToast(setToast, `Failed to reconnect ${name}`, true);
    } finally {
      setReconnecting(null);
    }
  }

  const grouped = data?.integrations.reduce<Record<string, Integration[]>>((acc, integration) => {
    (acc[integration.type] ||= []).push(integration);
    return acc;
  }, {}) ?? {};

  if (loading && !data) {
    return (
      <div role="status" aria-busy="true" className="p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <Toast toast={toast} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Plug className="h-6 w-6 text-brand-600" />
            Integrations
          </h1>
          <p className="mt-1 text-sm text-ink-500">Manage third-party service integrations</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCcw className={cn('mr-1.5 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {data && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                <Plug className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Total</p>
                <p className="mt-0.5 text-2xl font-semibold text-ink-900">{data.total}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Connected</p>
                <p className="mt-0.5 text-2xl font-semibold text-emerald-700">{data.connected}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Disconnected</p>
                <p className="mt-0.5 text-2xl font-semibold text-red-700">{data.disconnected}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {data && data.integrations.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Plug className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No integrations found</p>
          <p className="mt-1 text-sm text-ink-500">Configure third-party integrations to get started</p>
        </div>
      ) : (
        Object.entries(grouped).map(([type, integrations]) => (
          <div key={type} className="mb-8">
            <h2 className="mb-3 font-display text-base font-semibold text-ink-900 flex items-center gap-2 capitalize">
              <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', TYPE_COLORS[type] || 'bg-ink-50 text-ink-600')}>
                {TYPE_ICONS[type] || <Plug className="h-4 w-4" />}
              </span>
              {type} Integrations
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {integrations.map((integration) => (
                <div
                  key={integration.name}
                  className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base font-semibold text-ink-900 truncate">
                          {integration.name}
                        </h3>
                        <Badge variant="outline" className="shrink-0 capitalize">{integration.type}</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className={cn(
                          'inline-flex h-2 w-2 rounded-full',
                          integration.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500',
                        )} />
                        <span className={cn(
                          'text-xs font-medium capitalize',
                          integration.status === 'connected' ? 'text-emerald-700' : 'text-red-700',
                        )}>
                          {integration.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {Object.keys(integration.config).length > 0 && (
                    <div className="mt-3 space-y-1">
                      {Object.entries(integration.config).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="text-ink-500 font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                          <code className="font-mono text-ink-700">{maskKey(value)}</code>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-2 border-t border-ink-100 pt-3">
                    <a
                      href={integration.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      View Docs
                    </a>
                    <Button
                      variant={integration.status === 'connected' ? 'default' : 'brand'}
                      size="sm"
                      onClick={() => handleReconnect(integration.name)}
                      disabled={reconnecting === integration.name}
                    >
                      <RefreshCcw className={cn('mr-1 h-3.5 w-3.5', reconnecting === integration.name && 'animate-spin')} />
                      Reconnect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
