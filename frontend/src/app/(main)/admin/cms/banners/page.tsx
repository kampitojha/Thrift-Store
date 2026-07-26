'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Image,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Trash2,
  Clock,
  Pencil,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';

type Banner = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  mobileUrl?: string | null;
  linkUrl?: string | null;
  placement: string;
  sortOrder: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type BannersResponse = {
  items: Banner[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const PLACEMENT_OPTIONS = [
  { value: 'home_hero', label: 'Home Hero' },
  { value: 'home_banner', label: 'Home Banner' },
  { value: 'promo', label: 'Promo' },
  { value: 'category', label: 'Category' },
  { value: 'sidebar', label: 'Sidebar' },
];

const PLACEMENT_STYLES: Record<string, string> = {
  home_hero: 'bg-violet-100 text-violet-800',
  home_banner: 'bg-blue-100 text-blue-800',
  promo: 'bg-amber-100 text-amber-800',
  category: 'bg-emerald-100 text-emerald-800',
  sidebar: 'bg-ink-100 text-ink-600',
};

const INITIAL_FORM = {
  title: '',
  subtitle: '',
  imageUrl: '',
  mobileUrl: '',
  linkUrl: '',
  placement: 'home_hero',
  sortOrder: 0,
  isActive: true,
  startsAt: '',
  endsAt: '',
};

export default function AdminBannersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placementFilter, setPlacementFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingBanner, setDeletingBanner] = useState<Banner | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const fetchBanners = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (placementFilter) params.set('placement', placementFilter);
        const res = await apiClient.get<BannersResponse>(`/admin/cms/banners?${params}`);
        setBanners(res.items);
        setMeta(res.meta);
      } catch {
        setError('Failed to load banners');
      } finally {
        setLoading(false);
      }
    },
    [placementFilter],
  );

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    fetchBanners();
  }, [user, router, fetchBanners]);

  const openCreate = () => {
    setEditingBanner(null);
    setForm(INITIAL_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || '',
      imageUrl: banner.imageUrl,
      mobileUrl: banner.mobileUrl || '',
      linkUrl: banner.linkUrl || '',
      placement: banner.placement,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
      startsAt: banner.startsAt ? banner.startsAt.slice(0, 16) : '',
      endsAt: banner.endsAt ? banner.endsAt.slice(0, 16) : '',
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError('Title is required'); return; }
    if (!form.imageUrl.trim()) { setFormError('Image URL is required'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        imageUrl: form.imageUrl.trim(),
        mobileUrl: form.mobileUrl.trim() || undefined,
        linkUrl: form.linkUrl.trim() || undefined,
        placement: form.placement,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
      };
      if (editingBanner) {
        await apiClient.patch(`/admin/cms/banners/${editingBanner.id}`, body);
      } else {
        await apiClient.post('/admin/cms/banners', body);
      }
      setDialogOpen(false);
      fetchBanners(meta.page);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save banner';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (banner: Banner) => {
    setDeletingBanner(banner);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingBanner) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/admin/cms/banners/${deletingBanner.id}`);
      setDeleteOpen(false);
      setDeletingBanner(null);
      fetchBanners(meta.page);
    } catch {
      setFormError('Failed to delete banner');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (banner: Banner) => {
    setTogglingIds((prev) => new Set(prev).add(banner.id));
    try {
      await apiClient.patch(`/admin/cms/banners/${banner.id}`, { isActive: !banner.isActive });
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, isActive: !b.isActive } : b)),
      );
    } catch {
      // ignore
    } finally {
      setTogglingIds((prev) => { const next = new Set(prev); next.delete(banner.id); return next; });
    }
  };

  const handleSortChange = async (banner: Banner, newOrder: number) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === banner.id ? { ...b, sortOrder: newOrder } : b)),
    );
    try {
      await apiClient.patch(`/admin/cms/banners/${banner.id}`, { sortOrder: newOrder });
    } catch {
      fetchBanners(meta.page);
    }
  };

  if (!user) return null;

  const filterChips = ['', ...PLACEMENT_OPTIONS.map((o) => o.value)];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Image className="h-6 w-6 text-brand-600" />
            Banner Management
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {meta.total} banners on the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchBanners(meta.page)}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="brand" size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Banner
          </Button>
        </div>
      </div>

      {/* Placement filter chips */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {filterChips.map((p) => {
          const label = p
            ? PLACEMENT_OPTIONS.find((o) => o.value === p)?.label || p
            : 'All';
          return (
            <button
              key={p || 'all'}
              onClick={() => setPlacementFilter(p)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
                placementFilter === p
                  ? 'bg-ink-900 text-white shadow-soft'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200',
              )}
            >
              {label}
              {!p && meta.total > 0 && (
                <span className="ml-1 text-ink-400">({meta.total})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchBanners()}>
            Try Again
          </Button>
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Image className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No banners found</p>
          <p className="mt-1 text-sm text-ink-400">Create your first banner to promote content</p>
          <Button variant="brand" size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Banner
          </Button>
        </div>
      ) : (
        <>
          {/* Banner cards */}
          <div className="space-y-3">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className={cn(
                  'rounded-2xl border bg-white shadow-soft overflow-hidden transition',
                  banner.isActive ? 'border-ink-100' : 'border-ink-100/60 opacity-75',
                )}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Thumbnail */}
                  <div className="relative h-32 w-full shrink-0 bg-ink-100 sm:h-auto sm:w-48">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                      }}
                    />
                    <div className="absolute inset-0 hidden items-center justify-center bg-ink-100 [&:has(img[style*='display:none'])]:flex">
                      <Image className="h-8 w-8 text-ink-300" />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between p-4 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-ink-900 truncate">{banner.title}</h3>
                          <Badge
                            variant={banner.isActive ? 'success' : 'default'}
                          >
                            {banner.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        {banner.subtitle && (
                          <p className="mt-0.5 text-sm text-ink-500 line-clamp-1">{banner.subtitle}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                          <Badge
                            variant="outline"
                            className={cn('text-[10px]', PLACEMENT_STYLES[banner.placement])}
                          >
                            {PLACEMENT_OPTIONS.find((o) => o.value === banner.placement)?.label || banner.placement}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <GripVertical className="h-3 w-3" />
                            Order: {banner.sortOrder}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(banner.createdAt)}
                          </span>
                          {banner.linkUrl && (
                            <span className="flex items-center gap-1 text-brand-600">
                              <ExternalLink className="h-3 w-3" />
                              Has link
                            </span>
                          )}
                        </div>
                        {(banner.startsAt || banner.endsAt) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-400">
                            {banner.startsAt && <span>From {formatDate(banner.startsAt)}</span>}
                            {banner.endsAt && <span>Until {formatDate(banner.endsAt)}</span>}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => toggleActive(banner)}
                          disabled={togglingIds.has(banner.id)}
                          className={cn(
                            'rounded-full p-2 transition',
                            banner.isActive
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-ink-400 hover:bg-ink-100',
                          )}
                          title={banner.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {togglingIds.has(banner.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : banner.isActive ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(banner)}
                          className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDelete(banner)}
                          className="rounded-full p-2 text-ink-400 hover:bg-red-50 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Sort order inline edit */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-ink-400">Sort:</span>
                      <button
                        onClick={() => handleSortChange(banner, banner.sortOrder - 1)}
                        disabled={banner.sortOrder <= 0}
                        className="rounded-full p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-30 transition"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[1.5rem] text-center text-sm font-medium text-ink-700">
                        {banner.sortOrder}
                      </span>
                      <button
                        onClick={() => handleSortChange(banner, banner.sortOrder + 1)}
                        className="rounded-full p-1 text-ink-400 hover:bg-ink-100 transition"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
                onClick={() => fetchBanners(meta.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-ink-500">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page >= meta.totalPages}
                onClick={() => fetchBanners(meta.page + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader>
          {editingBanner ? 'Edit Banner' : 'Create Banner'}
        </DialogHeader>
        <DialogBody>
          {formError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Summer Sale Banner"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Subtitle</label>
              <Input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="Up to 50% off on all items"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Image URL *</label>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://example.com/banner.jpg"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Mobile URL</label>
              <Input
                value={form.mobileUrl}
                onChange={(e) => setForm({ ...form, mobileUrl: e.target.value })}
                placeholder="https://example.com/banner-mobile.jpg"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Link URL</label>
              <Input
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                placeholder="https://example.com/sale"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Placement</label>
                <Select
                  options={PLACEMENT_OPTIONS}
                  value={form.placement}
                  onChange={(e) => setForm({ ...form, placement: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Sort Order</label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  min={0}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Active</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                  form.isActive ? 'bg-brand-600' : 'bg-ink-200',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                    form.isActive ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Start Date</label>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">End Date</label>
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="brand" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : editingBanner ? (
              'Update Banner'
            ) : (
              'Create Banner'
            )}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogHeader>Delete Banner</DialogHeader>
        <DialogBody>
          <p className="text-sm text-ink-600">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-ink-900">{deletingBanner?.title}</span>?
            This action cannot be undone.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
