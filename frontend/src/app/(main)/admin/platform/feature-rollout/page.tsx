'use client';

import { useEffect, useState, useCallback } from 'react';
import { ToggleLeft, Percent, Users, RefreshCcw, RotateCcw, CheckCircle, XCircle, AlertTriangle, Clock, History, Save, Play, StopCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';

type FeatureRolloutData = {
  rollouts: Array<{
    id: string;
    key: string;
    name: string;
    description: string | null;
    enabled: boolean;
    rolloutPercentage: number;
    rules: any;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  enabled: number;
  disabled: number;
};

type ToastState = { message: string; visible: boolean; error?: boolean };

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

export default function FeatureRolloutPage() {
  const [data, setData] = useState<FeatureRolloutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });
  const [editMap, setEditMap] = useState<Record<string, { enabled: boolean; rolloutPercentage: number }>>({});
  const [historyDialog, setHistoryDialog] = useState<{ id: string; entries: any[] } | null>(null);
  const [rollbackDialog, setRollbackDialog] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<FeatureRolloutData>('/admin/platform/feature-rollouts');
      setData(res);
      const map: Record<string, { enabled: boolean; rolloutPercentage: number }> = {};
      res.rollouts.forEach(r => { map[r.id] = { enabled: r.enabled, rolloutPercentage: r.rolloutPercentage }; });
      setEditMap(map);
    } catch {
      setError('Failed to load feature rollouts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function hasChanges(rollout: FeatureRolloutData['rollouts'][number]) {
    const edit = editMap[rollout.id];
    if (!edit) return false;
    return edit.enabled !== rollout.enabled || edit.rolloutPercentage !== rollout.rolloutPercentage;
  }

  function handleToggle(id: string) {
    setEditMap(prev => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, enabled: !cur.enabled } };
    });
  }

  function handlePercentageChange(id: string, value: number) {
    setEditMap(prev => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, rolloutPercentage: value } };
    });
  }

  async function handleSave(rollout: FeatureRolloutData['rollouts'][number]) {
    const edit = editMap[rollout.id];
    if (!edit) return;
    setActionLoading(rollout.id);
    try {
      await apiClient.patch(`/admin/platform/feature-rollouts/${rollout.id}`, {
        enabled: edit.enabled,
        rolloutPercentage: edit.rolloutPercentage,
      });
      showToast(setToast, 'Feature rollout saved successfully');
      fetchData();
    } catch {
      showToast(setToast, 'Failed to save feature rollout', true);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRollback(id: string) {
    setActionLoading(id);
    try {
      await apiClient.post(`/admin/platform/feature-rollouts/${id}/rollback`);
      showToast(setToast, 'Rollback completed successfully');
      setRollbackDialog(null);
      fetchData();
    } catch {
      showToast(setToast, 'Failed to rollback feature rollout', true);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleOpenHistory(id: string) {
    setHistoryLoading(true);
    try {
      const entries = await apiClient.get<any[]>(`/admin/platform/feature-rollouts/${id}/history`);
      setHistoryDialog({ id, entries });
    } catch {
      showToast(setToast, 'Failed to load history', true);
    } finally {
      setHistoryLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="mb-6 flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-48 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-3xl border border-dashed border-red-200 py-24 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>Retry</Button>
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
            <ToggleLeft className="h-6 w-6 text-brand-600" />
            Feature Rollouts
          </h1>
          <p className="mt-1 text-sm text-ink-500">Manage feature flag rollout percentages and status</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCcw className={cn('mr-1.5 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {data && (
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft min-w-[160px]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
                <ToggleLeft className="h-4.5 w-4.5 text-brand-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-ink-500">Total Flags</p>
                <p className="text-lg font-semibold text-ink-900">{data.total}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft min-w-[160px]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-ink-500">Enabled</p>
                <p className="text-lg font-semibold text-ink-900">{data.enabled}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft min-w-[160px]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-50">
                <StopCircle className="h-4.5 w-4.5 text-ink-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-ink-500">Disabled</p>
                <p className="text-lg font-semibold text-ink-900">{data.disabled}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {data && data.rollouts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <ToggleLeft className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No feature rollouts configured</p>
          <p className="mt-1 text-sm text-ink-500">Feature flags will appear here once created.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {data?.rollouts.map((rollout) => {
            const edit = editMap[rollout.id] || rollout;
            const dirty = hasChanges(rollout);
            const segments = rollout.rules?.segments as string[] | undefined;
            const betaOnly = rollout.rules?.betaOnly as boolean | undefined;

            return (
              <div
                key={rollout.id}
                className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-semibold text-ink-900">{rollout.name}</h3>
                      <code className="rounded-md bg-ink-50 px-2 py-0.5 text-xs font-mono text-ink-600">
                        {rollout.key}
                      </code>
                      {betaOnly && (
                        <Badge variant="brand" className="text-[10px]">Beta Only</Badge>
                      )}
                    </div>
                    {rollout.description && (
                      <p className="mt-1 text-sm text-ink-500">{rollout.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={edit.enabled ? 'success' : 'default'}>
                      {edit.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    {dirty && (
                      <span className="text-[10px] font-medium text-amber-600">Unsaved</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-500">
                      <Percent className="h-3.5 w-3.5" />
                      Rollout {edit.rolloutPercentage}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={edit.rolloutPercentage}
                      onChange={(e) => handlePercentageChange(rollout.id, Number(e.target.value))}
                      className="w-full accent-brand-600"
                    />
                    <Progress value={edit.rolloutPercentage} className="mt-1.5" />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-500">
                      <Users className="h-3.5 w-3.5" />
                      User Segments
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {segments && segments.length > 0 ? (
                        segments.map((seg) => (
                          <Badge key={seg} variant="outline" className="text-[10px]">
                            {seg}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-ink-400">All users</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(rollout.id)}
                      title={edit.enabled ? 'Disable flag' : 'Enable flag'}
                    >
                      {edit.enabled
                        ? <StopCircle className="h-3.5 w-3.5" />
                        : <Play className="h-3.5 w-3.5" />
                      }
                      {edit.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSave(rollout)}
                      disabled={!dirty || actionLoading === rollout.id}
                    >
                      <Save className={cn('mr-1 h-3.5 w-3.5', actionLoading === rollout.id && 'animate-spin')} />
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRollbackDialog(rollout.id)}
                      disabled={actionLoading === rollout.id}
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      Rollback
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenHistory(rollout.id)}
                      disabled={actionLoading === rollout.id}
                    >
                      <History className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!historyDialog} onClose={() => setHistoryDialog(null)}>
        {historyDialog && (
          <>
            <DialogHeader>Rollout History</DialogHeader>
            <DialogBody>
              {historyLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-xl" />
                  ))}
                </div>
              ) : historyDialog.entries.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-500">No history entries found.</p>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {historyDialog.entries.map((entry: any, idx: number) => (
                    <div
                      key={entry.id ?? idx}
                      className="rounded-xl border border-ink-100 bg-ink-50/30 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-ink-900 capitalize">
                          {entry.action || entry.type || 'Update'}
                        </span>
                        <span className="text-xs text-ink-500" suppressHydrationWarning>
                          {entry.createdAt
                            ? new Date(entry.createdAt).toLocaleString('en-IN', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                              })
                            : '—'}
                        </span>
                      </div>
                      {entry.changes && (
                        <pre className="mt-1.5 rounded-lg bg-ink-900 p-2 text-xs text-green-400 overflow-x-auto font-mono">
                          {typeof entry.changes === 'string'
                            ? entry.changes
                            : JSON.stringify(entry.changes, null, 2)}
                        </pre>
                      )}
                      {entry.performedBy && (
                        <p className="mt-1 text-xs text-ink-500">by {entry.performedBy}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setHistoryDialog(null)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      <Dialog open={!!rollbackDialog} onClose={() => setRollbackDialog(null)}>
        {rollbackDialog && (
          <>
            <DialogHeader>Confirm Rollback</DialogHeader>
            <DialogBody>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 flex-shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-ink-900">Rollback feature rollout?</p>
                  <p className="mt-1 text-sm text-ink-500">
                    This will revert the rollout to its previous configuration. This action can be undone by rolling forward again.
                  </p>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setRollbackDialog(null)}>Cancel</Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleRollback(rollbackDialog)}
                disabled={actionLoading === rollbackDialog}
              >
                <RotateCcw className={cn('mr-1 h-3.5 w-3.5', actionLoading === rollbackDialog && 'animate-spin')} />
                Confirm Rollback
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </div>
  );
}
