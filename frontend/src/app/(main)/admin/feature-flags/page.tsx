'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ToggleLeft,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type FeatureFlag = {
  id: string;
  key: string;
  description?: string | null;
  enabled: boolean;
  rolloutPct: number;
  rules?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

type FlagsResponse = {
  items: FeatureFlag[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

type FormData = {
  key: string;
  description: string;
  enabled: boolean;
  rolloutPct: number;
  rules: string;
};

const EMPTY_FORM: FormData = { key: '', description: '', enabled: false, rolloutPct: 100, rules: '' };

export default function AdminFeatureFlagsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFlags = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      const res = await apiClient.get<FlagsResponse>(`/admin/feature-flags?${params}`);
      setFlags(res.items);
      setMeta(res.meta);
    } catch {
      setError('Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    fetchFlags();
  }, [user, router, fetchFlags]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(flag: FeatureFlag) {
    setEditingId(flag.id);
    setForm({
      key: flag.key,
      description: flag.description || '',
      enabled: flag.enabled,
      rolloutPct: flag.rolloutPct,
      rules: flag.rules ? JSON.stringify(flag.rules, null, 2) : '',
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function handleSave() {
    setFormError(null);
    const trimmedKey = form.key.trim().toLowerCase();
    if (!trimmedKey) {
      setFormError('Key is required');
      return;
    }
    if (!/^[a-z][a-z0-9_.-]*$/.test(trimmedKey)) {
      setFormError('Key must start with a letter and contain only lowercase letters, numbers, dots, hyphens, and underscores');
      return;
    }

    let parsedRules: Record<string, unknown> | undefined;
    if (form.rules.trim()) {
      try {
        parsedRules = JSON.parse(form.rules.trim());
        if (typeof parsedRules !== 'object' || Array.isArray(parsedRules)) {
          throw new Error('Must be a JSON object');
        }
      } catch {
        setFormError('Rules must be valid JSON object (or leave empty)');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        key: trimmedKey,
        description: form.description.trim() || undefined,
        enabled: form.enabled,
        rolloutPct: form.rolloutPct,
        rules: parsedRules,
      };

      if (editingId) {
        await apiClient.patch(`/admin/feature-flags/${editingId}`, payload);
      } else {
        await apiClient.post('/admin/feature-flags', payload);
      }
      closeDialog();
      fetchFlags(meta.page);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save feature flag';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(flag: FeatureFlag) {
    try {
      await apiClient.patch(`/admin/feature-flags/${flag.id}/toggle`);
      setFlags((prev) =>
        prev.map((f) => (f.id === flag.id ? { ...f, enabled: !f.enabled } : f)),
      );
    } catch {
      setError('Failed to toggle feature flag');
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/admin/feature-flags/${deleteId}`);
      setDeleteId(null);
      fetchFlags(meta.page);
    } catch {
      setError('Failed to delete feature flag');
    } finally {
      setDeleting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <ToggleLeft className="h-6 w-6 text-brand-600" />
            Feature Flags
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Toggle application features without deploying code
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchFlags(meta.page)}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="brand" size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Flag
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-ink-100 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-600">
        <Globe className="h-4 w-4 text-brand-600" />
        <span>
          Public endpoint: <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs text-ink-800">GET /api/v1/feature-flags</code>
          {' '}— returns enabled flags for public consumption
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : flags.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <ToggleLeft className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No feature flags</p>
          <p className="mt-1 text-sm text-ink-400">Create your first feature flag to get started</p>
          <Button variant="brand" size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Flag
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/50">
                  <th className="px-4 py-3 font-medium text-ink-600">Key</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Description</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Status</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Rollout</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Updated</th>
                  <th className="w-28 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {flags.map((flag) => (
                  <tr key={flag.id} className="transition hover:bg-ink-50/50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-ink-900">{flag.key}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-600 max-w-[240px] truncate">
                      {flag.description || <span className="text-ink-300 italic">No description</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-all',
                          flag.enabled
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-ink-100 text-ink-500 hover:bg-ink-200',
                        )}
                        onClick={() => handleToggle(flag)}
                        role="switch"
                        aria-checked={flag.enabled}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggle(flag); }}
                      >
                        <span className={cn('h-2 w-2 rounded-full', flag.enabled ? 'bg-emerald-500' : 'bg-ink-400')} />
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-ink-100">
                          <div
                            className={cn('h-full rounded-full transition-all', flag.enabled ? 'bg-emerald-500' : 'bg-ink-300')}
                            style={{ width: `${flag.rolloutPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-ink-600">{flag.rolloutPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500 whitespace-nowrap">
                      {new Date(flag.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(flag)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(flag.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {flags.map((flag) => (
              <div key={flag.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-medium text-ink-900">{flag.key}</span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer',
                          flag.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-ink-100 text-ink-500',
                        )}
                        onClick={() => handleToggle(flag)}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', flag.enabled ? 'bg-emerald-500' : 'bg-ink-400')} />
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-500 line-clamp-2">
                      {flag.description || <span className="italic text-ink-300">No description</span>}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className={cn('h-full rounded-full', flag.enabled ? 'bg-emerald-500' : 'bg-ink-300')}
                          style={{ width: `${flag.rolloutPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-ink-500">{flag.rolloutPct}% rollout</span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-ink-400">
                      Updated {new Date(flag.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(flag)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(flag.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page <= 1}
                onClick={() => fetchFlags(meta.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-ink-500">Page {meta.page} of {meta.totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page >= meta.totalPages}
                onClick={() => fetchFlags(meta.page + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog}>
        <DialogHeader>{editingId ? 'Edit Feature Flag' : 'Create Feature Flag'}</DialogHeader>
        <DialogBody className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Key</label>
            <Input
              placeholder="e.g. new_checkout_flow"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              disabled={!!editingId}
              className={editingId ? 'opacity-60' : ''}
            />
            <p className="mt-1 text-xs text-ink-400">Lowercase letters, numbers, dots, hyphens, underscores. Cannot be changed after creation.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Description</label>
            <Input
              placeholder="Brief description of this flag"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-ink-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink-900">Enabled</p>
              <p className="text-xs text-ink-500">Immediately activate this flag</p>
            </div>
            <button
              type="button"
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                form.enabled ? 'bg-emerald-500' : 'bg-ink-200',
              )}
              onClick={() => setForm({ ...form, enabled: !form.enabled })}
              role="switch"
              aria-checked={form.enabled}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                  form.enabled ? 'translate-x-5' : 'translate-x-0',
                )}
              />
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              Rollout Percentage: <span className="font-mono text-brand-600">{form.rolloutPct}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={form.rolloutPct}
              onChange={(e) => setForm({ ...form, rolloutPct: Number(e.target.value) })}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-ink-200 accent-brand-600 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-600 [&::-webkit-slider-thumb]:shadow-soft"
            />
            <div className="mt-1 flex justify-between text-xs text-ink-400">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Rules <span className="text-ink-400 font-normal">(JSON, optional)</span></label>
            <Textarea
              placeholder='{"country": ["IN", "US"], "userId": ["user_123"]}'
              value={form.rules}
              onChange={(e) => setForm({ ...form, rules: e.target.value })}
              className="min-h-[120px] font-mono text-xs"
            />
            <p className="mt-1 text-xs text-ink-400">Targeting rules as a JSON object. Leave empty for no restrictions.</p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button variant="brand" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update Flag' : 'Create Flag'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => { if (!deleting) setDeleteId(null); }}>
        <DialogHeader>Delete Feature Flag</DialogHeader>
        <DialogBody>
          <p className="text-sm text-ink-700">
            Are you sure you want to delete <span className="font-mono font-medium text-ink-900">{flags.find((f) => f.id === deleteId)?.key}</span>? This action cannot be undone.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setDeleteId(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
