'use client';

import { useEffect, useState, useCallback, Fragment } from 'react';
import { Webhook, RefreshCcw, CheckCircle, XCircle, AlertTriangle, Clock, ExternalLink, RotateCcw, List, Filter } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';

type WebhookData = {
  data: Array<{
    id: string;
    provider: string;
    eventType: string;
    status: string;
    requestBody: any;
    responseBody: string | null;
    responseStatus: number | null;
    signature: string | null;
    attempts: number;
    maxAttempts: number;
    lastAttemptAt: string | null;
    completedAt: string | null;
    errorMessage: string | null;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  byProvider: Array<{ provider: string; _count: { id: number } }>;
  byStatus: Array<{ status: string; _count: { id: number } }>;
};

type ToastState = { message: string; visible: boolean; error?: boolean };

const STATUS_OPTIONS = ['All', 'Pending', 'Completed', 'Failed'] as const;

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function statusBadgeVariant(status: string): 'success' | 'default' | 'outline' {
  switch (status) {
    case 'completed': return 'success';
    case 'failed': return 'default';
    default: return 'outline';
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'completed': return '';
    case 'failed': return 'bg-red-100 text-red-800';
    case 'pending': return 'bg-amber-100 text-amber-800';
    default: return '';
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'completed': return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
    default: return <Clock className="h-4 w-4 text-amber-500" />;
  }
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

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

export default function WebhooksPage() {
  const [data, setData] = useState<WebhookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });
  const [dialogWebhook, setDialogWebhook] = useState<WebhookData['data'][number] | null>(null);
  const [retryDialog, setRetryDialog] = useState<WebhookData['data'][number] | null>(null);
  const [retryAttempts, setRetryAttempts] = useState<number>(3);

  const fetchData = useCallback(async (p?: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.set('status', statusFilter.toLowerCase());
      if (p) params.set('page', String(p));
      const qs = params.toString();
      const res = await apiClient.get<WebhookData>(`/admin/platform/webhooks${qs ? `?${qs}` : ''}`);
      setData(res);
    } catch {
      setError('Failed to load webhook events');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData(page);
  }, [fetchData, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const handleRetry = async (id: string) => {
    setActionLoading(id);
    try {
      await apiClient.post(`/admin/platform/webhooks/${id}/retry`, { maxAttempts: retryAttempts });
      showToast(setToast, 'Retry initiated successfully');
      setRetryDialog(null);
      fetchData(page);
    } catch {
      showToast(setToast, 'Failed to retry webhook', true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewDetails = (wh: WebhookData['data'][number]) => {
    setDialogWebhook(wh);
  };

  const toggleExpanded = (id: string) => {
    setExpanded(expanded === id ? null : id);
  };

  const filteredData = data?.data || [];

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
        <div className="mb-6 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div role="alert" className="rounded-3xl border border-dashed border-red-200 py-24 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchData(page)}>Retry</Button>
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
            <Webhook className="h-6 w-6 text-brand-600" />
            Webhooks
          </h1>
          <p className="mt-1 text-sm text-ink-500">Monitor and manage incoming webhook events</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(page)} disabled={loading}>
          <RefreshCcw className={cn('mr-1.5 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {data && (
        <>
          <div className="mb-4 flex flex-wrap gap-4">
            <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft min-w-[180px]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
                  <List className="h-4.5 w-4.5 text-brand-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-500">Total Events</p>
                  <p className="text-lg font-semibold text-ink-900">{data.total}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft min-w-[180px]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-500">Completed</p>
                  <p className="text-lg font-semibold text-ink-900">
                    {data.byStatus.find(s => s.status === 'completed')?._count.id ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
              <p className="mb-2.5 text-xs font-medium text-ink-500 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                By Provider
              </p>
              <div className="flex flex-wrap gap-2">
                {data.byProvider.map((p) => (
                  <Badge key={p.provider} variant="outline" className="gap-1.5">
                    {p.provider}
                    <span className="inline-flex items-center justify-center rounded-full bg-ink-100 px-1.5 py-0 text-[10px] font-semibold text-ink-600">
                      {p._count.id}
                    </span>
                  </Badge>
                ))}
                {data.byProvider.length === 0 && (
                  <span className="text-sm text-ink-400">No data</span>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
              <p className="mb-2.5 text-xs font-medium text-ink-500 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                By Status
              </p>
              <div className="flex flex-wrap gap-2">
                {data.byStatus.map((s) => (
                  <Badge key={s.status} variant="outline" className={cn('gap-1.5', statusBadgeClass(s.status))}>
                    {s.status}
                    <span className="inline-flex items-center justify-center rounded-full bg-ink-100 px-1.5 py-0 text-[10px] font-semibold text-ink-600">
                      {s._count.id}
                    </span>
                  </Badge>
                ))}
                {data.byStatus.length === 0 && (
                  <span className="text-sm text-ink-400">No data</span>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-ink-500 mr-1">Filter:</span>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setStatusFilter(opt)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
                  statusFilter === opt
                    ? 'bg-ink-900 text-white shadow-soft'
                    : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50',
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}

      {loading && data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Webhook className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No webhook events found</p>
          <p className="mt-1 text-sm text-ink-500">
            {statusFilter !== 'All' ? 'Try changing the status filter.' : 'Webhook events will appear here when received.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500">Event Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500">Attempts</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-ink-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((wh) => (
                  <Fragment key={wh.id}>
                    <tr
                      className={cn(
                        'border-b border-ink-50 transition cursor-pointer hover:bg-ink-50/50',
                        expanded === wh.id && 'bg-ink-50/50',
                      )}
                      onClick={() => toggleExpanded(wh.id)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-ink-600" title={wh.id}>
                        {truncateId(wh.id)}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink-900">{wh.provider}</td>
                      <td className="px-4 py-3">
                        <code className="rounded-md bg-ink-50 px-2 py-0.5 text-xs font-mono text-ink-700">
                          {wh.eventType}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                          statusBadgeClass(wh.status),
                        )}>
                          {statusIcon(wh.status)}
                          {wh.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-700">
                        <span className={cn(
                          wh.attempts > 0 && wh.status === 'failed' && 'font-medium text-red-600',
                        )}>
                          {wh.attempts}/{wh.maxAttempts}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-500" suppressHydrationWarning>
                        {relativeTime(wh.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleViewDetails(wh); }}
                            title="View details"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          {wh.status === 'failed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setRetryDialog(wh); setRetryAttempts(wh.maxAttempts); }}
                              disabled={actionLoading === wh.id}
                            >
                              <RotateCcw className={cn('mr-1 h-3.5 w-3.5', actionLoading === wh.id && 'animate-spin')} />
                              Retry
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded === wh.id && (
                      <tr key={`${wh.id}-expanded`}>
                        <td colSpan={7} className="px-4 py-4 bg-ink-50/30">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold text-ink-500 mb-1.5">Request Body</p>
                              <pre className="rounded-xl bg-ink-900 p-3 text-xs text-green-400 overflow-x-auto max-h-48 overflow-y-auto font-mono">
                                {wh.requestBody
                                  ? typeof wh.requestBody === 'string'
                                    ? wh.requestBody
                                    : JSON.stringify(wh.requestBody, null, 2)
                                  : '—'}
                              </pre>
                            </div>
                            <div className="space-y-3">
                              {wh.responseBody && (
                                <div>
                                  <p className="text-xs font-semibold text-ink-500 mb-1.5">
                                    Response {wh.responseStatus && <span className="text-ink-400">({wh.responseStatus})</span>}
                                  </p>
                                  <pre className="rounded-xl bg-ink-900 p-3 text-xs text-green-400 overflow-x-auto max-h-32 overflow-y-auto font-mono">
                                    {wh.responseBody}
                                  </pre>
                                </div>
                              )}
                              {wh.errorMessage && (
                                <div>
                                  <p className="text-xs font-semibold text-red-600 mb-1.5">Error</p>
                                  <pre className="rounded-xl bg-red-50 p-3 text-xs text-red-700 overflow-x-auto font-mono border border-red-200">
                                    {wh.errorMessage}
                                  </pre>
                                </div>
                              )}
                              {wh.signature && (
                                <div>
                                  <p className="text-xs font-semibold text-ink-500 mb-1.5">Signature</p>
                                  <code className="rounded-md bg-ink-100 px-2 py-0.5 text-xs font-mono text-ink-600 break-all">
                                    {wh.signature}
                                  </code>
                                </div>
                              )}
                              {wh.lastAttemptAt && (
                                <div>
                                  <p className="text-xs font-semibold text-ink-500 mb-1.5">Last Attempt</p>
                                  <p className="text-sm text-ink-700" suppressHydrationWarning>
                                    {new Date(wh.lastAttemptAt).toLocaleString('en-IN', {
                                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3">
              <p className="text-xs text-ink-500">
                Page {data.page} of {data.totalPages} ({data.total} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages || loading}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!dialogWebhook} onClose={() => setDialogWebhook(null)}>
        {dialogWebhook && (
          <>
            <DialogHeader>Webhook Details</DialogHeader>
            <DialogBody>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-ink-500">ID</p>
                    <p className="mt-0.5 font-mono text-xs text-ink-700 break-all">{dialogWebhook.id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-500">Provider</p>
                    <p className="mt-0.5 text-sm font-medium text-ink-900">{dialogWebhook.provider}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-500">Event Type</p>
                    <code className="mt-0.5 inline-block rounded-md bg-ink-50 px-2 py-0.5 text-xs font-mono text-ink-700">
                      {dialogWebhook.eventType}
                    </code>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-500">Status</p>
                    <span className={cn(
                      'mt-0.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      statusBadgeClass(dialogWebhook.status),
                    )}>
                      {statusIcon(dialogWebhook.status)}
                      {dialogWebhook.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-500">Attempts</p>
                    <p className="mt-0.5 text-sm text-ink-700">{dialogWebhook.attempts}/{dialogWebhook.maxAttempts}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-500">Created</p>
                    <p className="mt-0.5 text-sm text-ink-700" suppressHydrationWarning>
                      {new Date(dialogWebhook.createdAt).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                {dialogWebhook.lastAttemptAt && (
                  <div>
                    <p className="text-xs font-semibold text-ink-500">Last Attempt</p>
                    <p className="mt-0.5 text-sm text-ink-700" suppressHydrationWarning>
                      {new Date(dialogWebhook.lastAttemptAt).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
                {dialogWebhook.completedAt && (
                  <div>
                    <p className="text-xs font-semibold text-ink-500">Completed</p>
                    <p className="mt-0.5 text-sm text-ink-700" suppressHydrationWarning>
                      {new Date(dialogWebhook.completedAt).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
                {dialogWebhook.signature && (
                  <div>
                    <p className="text-xs font-semibold text-ink-500">Signature</p>
                    <code className="mt-0.5 inline-block rounded-md bg-ink-100 px-2 py-0.5 text-xs font-mono text-ink-600 break-all">
                      {dialogWebhook.signature}
                    </code>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-ink-500 mb-1">Request Body</p>
                  <pre className="rounded-xl bg-ink-900 p-3 text-xs text-green-400 overflow-x-auto max-h-48 overflow-y-auto font-mono">
                    {dialogWebhook.requestBody
                      ? typeof dialogWebhook.requestBody === 'string'
                        ? dialogWebhook.requestBody
                        : JSON.stringify(dialogWebhook.requestBody, null, 2)
                      : '—'}
                  </pre>
                </div>
                {dialogWebhook.responseBody && (
                  <div>
                    <p className="text-xs font-semibold text-ink-500 mb-1">
                      Response {dialogWebhook.responseStatus && <span className="text-ink-400">({dialogWebhook.responseStatus})</span>}
                    </p>
                    <pre className="rounded-xl bg-ink-900 p-3 text-xs text-green-400 overflow-x-auto max-h-32 overflow-y-auto font-mono">
                      {dialogWebhook.responseBody}
                    </pre>
                  </div>
                )}
                {dialogWebhook.errorMessage && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 mb-1">Error Message</p>
                    <pre className="rounded-xl bg-red-50 p-3 text-xs text-red-700 overflow-x-auto font-mono border border-red-200">
                      {dialogWebhook.errorMessage}
                    </pre>
                  </div>
                )}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDialogWebhook(null)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      <Dialog open={!!retryDialog} onClose={() => setRetryDialog(null)}>
        {retryDialog && (
          <>
            <DialogHeader>Retry Webhook</DialogHeader>
            <DialogBody>
              <div className="space-y-4">
                <p className="text-sm text-ink-700">
                  Retry webhook event <code className="rounded-md bg-ink-100 px-1.5 py-0.5 font-mono text-xs">{truncateId(retryDialog.id)}</code> from <strong>{retryDialog.provider}</strong> ({retryDialog.eventType})?
                </p>
                <div>
                  <label className="text-xs font-semibold text-ink-500 mb-1.5 block">Max Attempts</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={retryAttempts}
                    onChange={(e) => setRetryAttempts(Number(e.target.value))}
                    className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setRetryDialog(null)}>Cancel</Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleRetry(retryDialog.id)}
                disabled={actionLoading === retryDialog.id}
              >
                <RotateCcw className={cn('mr-1 h-3.5 w-3.5', actionLoading === retryDialog.id && 'animate-spin')} />
                Retry
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </div>
  );
}
