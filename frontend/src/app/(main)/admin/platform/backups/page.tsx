'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  HardDrive,
  Download,
  RefreshCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Database,
  Cloud,
  FileText,
  Loader2,
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
import { Select } from '@/components/ui/select';

type BackupEntry = {
  id: string;
  type: string;
  status: string;
  scope: string;
  fileSize: number | null;
  fileUrl: string | null;
  fileName: string | null;
  checksum: string | null;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdBy: string | null;
  createdAt: string;
};

type BackupData = {
  data: BackupEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  byStatus: Array<{ status: string; _count: { id: number } }>;
  byType: Array<{ type: string; _count: { id: number } }>;
  lastBackup: { id: string; createdAt: string; status: string } | null;
};

const SCOPE_OPTIONS = [
  { value: 'full', label: 'Full' },
  { value: 'database', label: 'Database' },
  { value: 'media', label: 'Media' },
];

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
  completed: {
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    className: 'bg-emerald-100 text-emerald-800',
    label: 'Completed',
  },
  failed: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    className: 'bg-red-100 text-red-800',
    label: 'Failed',
  },
  running: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    className: 'bg-blue-100 text-blue-800',
    label: 'Running',
  },
  pending: {
    icon: <Clock className="h-3.5 w-3.5" />,
    className: 'bg-amber-100 text-amber-800',
    label: 'Pending',
  },
};

function getDefaultStatusConfig(status: string) {
  return STATUS_CONFIG[status] || {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    className: 'bg-ink-100 text-ink-800',
    label: status,
  };
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return '—';
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const diff = end - start;
  if (diff < 0) return '—';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminBackupsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [stats, setStats] = useState<Omit<BackupData, 'data'>>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    byStatus: [],
    byType: [],
    lastBackup: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [scope, setScope] = useState('full');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<BackupData>('/admin/platform/backups');
      setBackups(res.data ?? []);
      setStats({
        total: res.total ?? 0,
        page: res.page ?? 1,
        limit: res.limit ?? 20,
        totalPages: res.totalPages ?? 1,
        byStatus: res.byStatus ?? [],
        byType: res.byType ?? [],
        lastBackup: res.lastBackup ?? null,
      });
    } catch {
      setError('Failed to load backups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    fetchBackups();
  }, [user, router, fetchBackups]);

  async function handleCreate() {
    setFormError(null);
    if (!scope) {
      setFormError('Please select a backup scope');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/admin/platform/backups', { scope, notes: notes.trim() || undefined });
      setDialogOpen(false);
      setScope('full');
      setNotes('');
      fetchBackups();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create backup';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  const statusCount = stats.lastBackup
    ? [
        { status: stats.lastBackup.status, count: 1 },
        ...stats.byStatus.filter((s) => s.status !== stats.lastBackup!.status),
      ]
    : stats.byStatus;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <HardDrive className="h-6 w-6 text-brand-600" />
            Backups
          </h1>
          <p className="mt-1 text-sm text-ink-500">Manage database and media backups</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchBackups}>
            <RefreshCcw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="brand" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Backup
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <Database className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Total Backups</p>
              <p className="mt-0.5 text-2xl font-semibold text-ink-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <Cloud className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Last Backup</p>
              <p className="mt-0.5 text-sm font-medium text-ink-900">
                {stats.lastBackup ? formatDate(stats.lastBackup.createdAt) : 'Never'}
              </p>
            </div>
          </div>
          {stats.lastBackup && (
            <div className="mt-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                  getDefaultStatusConfig(stats.lastBackup.status).className,
                )}
              >
                {getDefaultStatusConfig(stats.lastBackup.status).icon}
                {getDefaultStatusConfig(stats.lastBackup.status).label}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">By Type</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {stats.byType.map((t) => (
              <Badge key={t.type} variant="outline">
                {t.type} <span className="ml-1 font-semibold">{t._count.id}</span>
              </Badge>
            ))}
            {stats.byType.length === 0 && (
              <span className="text-xs text-ink-400">No data</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50">
              <AlertTriangle className="h-5 w-5 text-ink-500" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">By Status</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {stats.byStatus.map((s) => {
              const cfg = getDefaultStatusConfig(s.status);
              return (
                <span
                  key={s.status}
                  className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', cfg.className)}
                >
                  {cfg.icon}
                  {cfg.label} <span className="ml-0.5">{s._count.id}</span>
                </span>
              );
            })}
            {stats.byStatus.length === 0 && (
              <span className="text-xs text-ink-400">No data</span>
            )}
          </div>
        </div>
      </div>

      {/* Last Backup Highlight Card */}
      {stats.lastBackup && (() => {
        const entry = backups.find((b) => b.id === stats.lastBackup!.id);
        if (!entry) return null;
        const cfg = getDefaultStatusConfig(entry.status);
        return (
          <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50/50 p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
                  <Cloud className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-900">Latest Backup</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    Created {formatDate(entry.createdAt)}
                    {entry.createdBy && ` by ${entry.createdBy}`}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', cfg.className)}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                    <Badge variant="outline">{entry.type}</Badge>
                    <Badge variant="outline">{entry.scope}</Badge>
                    {entry.fileSize !== null && (
                      <span className="text-xs text-ink-500">{formatFileSize(entry.fileSize)}</span>
                    )}
                  </div>
                </div>
              </div>
              {entry.fileUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={entry.fileUrl} download={entry.fileName || undefined}>
                    <Download className="mr-1 h-4 w-4" />
                    Download
                  </a>
                </Button>
              )}
            </div>
            {entry.notes && (
              <p className="mt-3 text-sm text-ink-600 border-t border-brand-100 pt-3">{entry.notes}</p>
            )}
            {entry.errorMessage && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{entry.errorMessage}</span>
              </div>
            )}
          </div>
        );
      })()}

      {error && (
        <div role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div role="status" aria-busy="true" className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="rounded-3xl border border-dashed border-red-200 py-24 text-center">
          <HardDrive className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchBackups}>
            Try Again
          </Button>
        </div>
      ) : backups.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Database className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No backups found</p>
          <p className="mt-1 text-sm text-ink-400">Create your first backup to get started</p>
          <Button variant="brand" size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Backup
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/50">
                    <th className="px-4 py-3 font-medium text-ink-600">Type</th>
                    <th className="px-4 py-3 font-medium text-ink-600">Scope</th>
                    <th className="px-4 py-3 font-medium text-ink-600">Status</th>
                    <th className="px-4 py-3 font-medium text-ink-600">Size</th>
                    <th className="px-4 py-3 font-medium text-ink-600">Started</th>
                    <th className="px-4 py-3 font-medium text-ink-600">Completed</th>
                    <th className="px-4 py-3 font-medium text-ink-600">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {backups.map((backup) => {
                    const scfg = getDefaultStatusConfig(backup.status);
                    return (
                      <tr key={backup.id} className="transition hover:bg-ink-50/50">
                        <td className="px-4 py-3">
                          <Badge variant="outline">{backup.type}</Badge>
                        </td>
                        <td className="px-4 py-3 text-ink-700 capitalize">{backup.scope}</td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', scfg.className)}>
                            {scfg.icon}
                            {scfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink-600 whitespace-nowrap font-mono text-xs">{formatFileSize(backup.fileSize)}</td>
                        <td className="px-4 py-3 text-ink-500 whitespace-nowrap text-xs">{formatDate(backup.startedAt)}</td>
                        <td className="px-4 py-3 text-ink-500 whitespace-nowrap text-xs">{formatDate(backup.completedAt)}</td>
                        <td className="px-4 py-3 text-ink-600 whitespace-nowrap font-mono text-xs">{formatDuration(backup.startedAt, backup.completedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {backups.map((backup) => {
              const scfg = getDefaultStatusConfig(backup.status);
              return (
                <div key={backup.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{backup.type}</Badge>
                        <span className="text-sm capitalize text-ink-500">{backup.scope}</span>
                      </div>
                      <div className="mt-1.5">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', scfg.className)}>
                          {scfg.icon}
                          {scfg.label}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-500">
                        <span className="font-mono">{formatFileSize(backup.fileSize)}</span>
                        <span>Started {formatDate(backup.startedAt)}</span>
                        <span>Duration {formatDuration(backup.startedAt, backup.completedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {stats.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <span className="text-sm text-ink-500">
                Page {stats.page} of {stats.totalPages} ({stats.total} total)
              </span>
            </div>
          )}
        </>
      )}

      {/* Create Backup Dialog */}
      <Dialog open={dialogOpen} onClose={() => { if (!saving) { setDialogOpen(false); setFormError(null); } }}>
        <DialogHeader>Create Backup</DialogHeader>
        <DialogBody className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Scope</label>
            <Select
              options={SCOPE_OPTIONS}
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-400">
              Full: entire database + media · Database: database only · Media: media files only
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              Notes <span className="text-ink-400 font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="Reason for this backup..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { setDialogOpen(false); setFormError(null); }} disabled={saving}>
            Cancel
          </Button>
          <Button variant="brand" size="sm" onClick={handleCreate} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Start Backup'
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
