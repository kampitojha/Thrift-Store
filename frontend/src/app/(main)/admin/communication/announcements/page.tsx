'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Megaphone,
  Plus,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Info,
  AlertOctagon,
  Wrench,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

const ANNOUNCEMENT_TYPES = [
  { value: 'INFO', label: 'Info' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'RELEASE', label: 'Release' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  INFO: { icon: <Info className="h-4 w-4" />, bg: 'bg-blue-50 text-blue-700', text: 'text-blue-700' },
  WARNING: { icon: <AlertTriangle className="h-4 w-4" />, bg: 'bg-amber-50 text-amber-700', text: 'text-amber-700' },
  MAINTENANCE: { icon: <Wrench className="h-4 w-4" />, bg: 'bg-violet-50 text-violet-700', text: 'text-violet-700' },
  RELEASE: { icon: <AlertOctagon className="h-4 w-4" />, bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700' },
};

const PRIORITY_CONFIG: Record<string, { icon: React.ReactNode; bg: string }> = {
  LOW: { icon: <ArrowDown className="h-3 w-3" />, bg: 'bg-ink-100 text-ink-600' },
  MEDIUM: { icon: <ArrowUp className="h-3 w-3" />, bg: 'bg-blue-100 text-blue-700' },
  HIGH: { icon: <ArrowUp className="h-3 w-3" />, bg: 'bg-amber-100 text-amber-700' },
  URGENT: { icon: <AlertTriangle className="h-3 w-3" />, bg: 'bg-red-100 text-red-700' },
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'reloom-announcements';

function seedAnnouncements(): Announcement[] {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return JSON.parse(existing);

  const now = new Date().toISOString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const announcements: Announcement[] = [
    {
      id: crypto.randomUUID(),
      title: 'Platform Maintenance',
      message: 'The platform will undergo scheduled maintenance on Sunday from 2 AM to 4 AM IST. Some features may be unavailable during this time.',
      type: 'MAINTENANCE',
      priority: 'HIGH',
      isActive: true,
      startsAt: now,
      endsAt: nextWeek,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: 'New Feature: Bulk Upload',
      message: 'Sellers can now upload products in bulk using our new CSV import feature. Check the seller dashboard for details.',
      type: 'RELEASE',
      priority: 'MEDIUM',
      isActive: true,
      startsAt: now,
      endsAt: nextWeek,
      createdAt: now,
      updatedAt: now,
    },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(announcements));
  return announcements;
}

type FormData = {
  title: string;
  message: string;
  type: string;
  priority: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
};

const EMPTY_FORM: FormData = {
  title: '',
  message: '',
  type: 'INFO',
  priority: 'MEDIUM',
  isActive: true,
  startsAt: new Date().toISOString().slice(0, 16),
  endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
};

function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AnnouncementsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAnnouncements = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const data = seedAnnouncements();
      setAnnouncements(data);
    } catch {
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    loadAnnouncements();
  }, [user, isHydrated, router, loadAnnouncements]);

  function persistAnnouncements(updated: Announcement[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setAnnouncements(updated);
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(announcement: Announcement) {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      priority: announcement.priority,
      isActive: announcement.isActive,
      startsAt: announcement.startsAt ? new Date(announcement.startsAt).toISOString().slice(0, 16) : '',
      endsAt: announcement.endsAt ? new Date(announcement.endsAt).toISOString().slice(0, 16) : '',
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

  function handleSave() {
    setFormError(null);
    if (!form.title.trim()) { setFormError('Title is required'); return; }
    if (!form.message.trim()) { setFormError('Message is required'); return; }
    if (!form.startsAt) { setFormError('Start date is required'); return; }
    if (!form.endsAt) { setFormError('End date is required'); return; }
    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      setFormError('End date must be after start date');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      };

      if (editingId) {
        const updated = announcements.map((a) =>
          a.id === editingId ? { ...a, ...payload, updatedAt: now } : a,
        );
        persistAnnouncements(updated);
      } else {
        const newAnnouncement: Announcement = {
          id: crypto.randomUUID(),
          ...payload,
          createdAt: now,
          updatedAt: now,
        };
        persistAnnouncements([newAnnouncement, ...announcements]);
      }
      closeDialog();
    } catch {
      setFormError('Failed to save announcement');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const updated = announcements.filter((a) => a.id !== deleteId);
      persistAnnouncements(updated);
      setDeleteId(null);
    } catch {
      setError('Failed to delete announcement');
    } finally {
      setDeleting(false);
    }
  }

  function handleToggleActive(announcement: Announcement) {
    const updated = announcements.map((a) =>
      a.id === announcement.id ? { ...a, isActive: !a.isActive, updatedAt: new Date().toISOString() } : a,
    );
    persistAnnouncements(updated);
  }

  if (!isHydrated || loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Megaphone className="h-6 w-6 text-brand-600" />
            Announcements
          </h1>
          <p className="mt-1 text-sm text-ink-500">{announcements.length} announcements</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAnnouncements}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="brand" size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Announcement
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {announcements.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Megaphone className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No announcements</p>
          <p className="mt-1 text-sm text-ink-400">Create your first platform announcement</p>
          <Button variant="brand" size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Announcement
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => {
            const typeCfg = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.INFO;
            const priorityCfg = PRIORITY_CONFIG[announcement.priority] || PRIORITY_CONFIG.MEDIUM;
            const now = new Date();
            const startsAt = new Date(announcement.startsAt);
            const endsAt = new Date(announcement.endsAt);
            const isExpired = endsAt < now;
            const isScheduled = startsAt > now;

            return (
              <div
                key={announcement.id}
                className={cn(
                  'rounded-2xl border bg-white p-5 shadow-soft transition hover:shadow-lift',
                  announcement.isActive ? 'border-ink-100' : 'border-ink-100 opacity-60',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', typeCfg.bg)}>
                        {typeCfg.icon}
                        {announcement.type}
                      </span>
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', priorityCfg.bg)}>
                        {priorityCfg.icon}
                        {announcement.priority}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer',
                          announcement.isActive
                            ? isExpired ? 'bg-red-100 text-red-700' : isScheduled ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-800'
                            : 'bg-ink-100 text-ink-500',
                        )}
                        onClick={() => handleToggleActive(announcement)}
                      >
                        {announcement.isActive
                          ? isExpired ? 'Expired' : isScheduled ? 'Scheduled' : 'Active'
                          : 'Inactive'}
                      </span>
                    </div>
                    <h3 className="font-display text-base font-semibold text-ink-900">{announcement.title}</h3>
                    <p className="text-sm text-ink-600 whitespace-pre-wrap">{announcement.message}</p>
                    <div className="flex items-center gap-4 text-xs text-ink-400">
                      <span>From: {formatDateTime(announcement.startsAt)}</span>
                      <span>To: {formatDateTime(announcement.endsAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(announcement)}>Edit</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(announcement.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog}>
        <DialogHeader>{editingId ? 'Edit Announcement' : 'Create Announcement'}</DialogHeader>
        <DialogBody className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Title</label>
            <Input placeholder="e.g. Platform Maintenance" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Message</label>
            <Textarea
              placeholder="Write your announcement message..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={5}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Type</label>
              <Select options={ANNOUNCEMENT_TYPES} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Priority</label>
              <Select options={PRIORITY_OPTIONS} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Start Date & Time</label>
              <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">End Date & Time</label>
              <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-ink-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink-900">Active</p>
              <p className="text-xs text-ink-500">Announcement will be visible on the platform</p>
            </div>
            <button
              type="button"
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                form.isActive ? 'bg-emerald-500' : 'bg-ink-200',
              )}
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              role="switch"
              aria-checked={form.isActive}
            >
              <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform', form.isActive ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button variant="brand" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update Announcement' : 'Create Announcement'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!deleteId} onClose={() => { if (!deleting) setDeleteId(null); }}>
        <DialogHeader>Delete Announcement</DialogHeader>
        <DialogBody>
          <p className="text-sm text-ink-700">
            Are you sure you want to delete <span className="font-medium text-ink-900">{announcements.find((a) => a.id === deleteId)?.title}</span>? This action cannot be undone.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setDeleteId(null)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
