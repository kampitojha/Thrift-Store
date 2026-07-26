'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tag,
  Plus,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ImageIcon,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  isLuxury: boolean;
  isActive: boolean;
  createdAt: string;
};

type BrandsResponse = {
  items: Brand[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

type FormData = {
  name: string;
  slug: string;
  logoUrl: string;
  isLuxury: boolean;
  isActive: boolean;
};

const EMPTY_FORM: FormData = { name: '', slug: '', logoUrl: '', isLuxury: false, isActive: true };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const FILTER_OPTIONS = [
  { value: '', label: 'All Brands' },
  { value: 'true', label: 'Active Only' },
  { value: 'false', label: 'Inactive Only' },
];

export default function AdminBrandsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [autoSlug, setAutoSlug] = useState(true);

  const fetchBrands = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (search) params.set('q', search);
        if (isActiveFilter) params.set('isActive', isActiveFilter);
        const res = await apiClient.get<BrandsResponse>(`/admin/brands?${params}`);
        setBrands(res.items);
        setMeta(res.meta);
      } catch {
        setError('Failed to load brands');
      } finally {
        setLoading(false);
      }
    },
    [search, isActiveFilter],
  );

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    fetchBrands();
  }, [user, router, fetchBrands]);

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setAutoSlug(true);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditingId(brand.id);
    setForm({
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl || '',
      isLuxury: brand.isLuxury,
      isActive: brand.isActive,
    });
    setAutoSlug(false);
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setAutoSlug(true);
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: autoSlug && !editingId ? slugify(name) : prev.slug,
    }));
  }

  async function handleSave() {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Brand name is required');
      return;
    }
    if (!form.slug.trim()) {
      setFormError('Slug is required');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      setFormError('Slug must contain only lowercase letters, numbers, and hyphens');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        logoUrl: form.logoUrl.trim() || undefined,
        isLuxury: form.isLuxury,
        isActive: form.isActive,
      };

      if (editingId) {
        await apiClient.patch(`/admin/brands/${editingId}`, payload);
      } else {
        await apiClient.post('/admin/brands', payload);
      }
      closeDialog();
      fetchBrands(meta.page);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save brand';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(brand: Brand) {
    try {
      await apiClient.patch(`/admin/brands/${brand.id}`, { isActive: !brand.isActive });
      setBrands((prev) =>
        prev.map((b) => (b.id === brand.id ? { ...b, isActive: !b.isActive } : b)),
      );
    } catch {
      setError('Failed to toggle brand status');
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/admin/brands/${deleteId}`);
      setDeleteId(null);
      fetchBrands(meta.page);
    } catch {
      setError('Failed to delete brand');
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
            <Tag className="h-6 w-6 text-brand-600" />
            Brand Management
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {meta.total} brands in the catalog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchBrands(meta.page)}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="brand" size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Brand
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            placeholder="Search brands by name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          Search
        </Button>
        <select
          value={isActiveFilter}
          onChange={(e) => setIsActiveFilter(e.target.value)}
          className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
        >
          {FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Tag className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No brands found</p>
          <p className="mt-1 text-sm text-ink-400">
            {search || isActiveFilter ? 'Try adjusting your search or filters' : 'Add your first brand to the catalog'}
          </p>
          {!search && !isActiveFilter && (
            <Button variant="brand" size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Brand
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/50">
                  <th className="px-4 py-3 font-medium text-ink-600">Brand</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Slug</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Type</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Status</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Created</th>
                  <th className="w-28 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {brands.map((brand) => (
                  <tr key={brand.id} className="transition hover:bg-ink-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink-100">
                          {brand.logoUrl ? (
                            <img src={brand.logoUrl} alt={brand.name} className="h-full w-full object-contain p-1" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-ink-400" />
                          )}
                        </div>
                        <span className="font-medium text-ink-900">{brand.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-ink-500">{brand.slug}</span>
                    </td>
                    <td className="px-4 py-3">
                      {brand.isLuxury ? (
                        <Badge variant="brand">Luxury</Badge>
                      ) : (
                        <Badge variant="outline">Standard</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-all',
                          brand.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-ink-100 text-ink-500 hover:bg-ink-200',
                        )}
                        onClick={() => handleToggleActive(brand)}
                        role="switch"
                        aria-checked={brand.isActive}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleActive(brand); }}
                      >
                        {brand.isActive ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {brand.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500 whitespace-nowrap">
                      {new Date(brand.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(brand)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(brand.id)}
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
            {brands.map((brand) => (
              <div key={brand.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink-100">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt={brand.name} className="h-full w-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-ink-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-ink-900">{brand.name}</span>
                      {brand.isLuxury && <Badge variant="brand" className="text-[10px]">Luxury</Badge>}
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-ink-400">{brand.slug}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer',
                          brand.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-ink-100 text-ink-500',
                        )}
                        onClick={() => handleToggleActive(brand)}
                      >
                        {brand.isActive ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {brand.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-ink-400">
                        Created {new Date(brand.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(brand)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(brand.id)}
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
                onClick={() => fetchBrands(meta.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-ink-500">Page {meta.page} of {meta.totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page >= meta.totalPages}
                onClick={() => fetchBrands(meta.page + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog}>
        <DialogHeader>{editingId ? 'Edit Brand' : 'Add Brand'}</DialogHeader>
        <DialogBody className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Brand Name</label>
            <Input
              placeholder="e.g. Nike"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Slug</label>
            <Input
              placeholder="e.g. nike"
              value={form.slug}
              onChange={(e) => {
                setAutoSlug(false);
                setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') });
              }}
            />
            {!editingId && (
              <p className="mt-1 text-xs text-ink-400">Auto-generated from brand name. You can edit it manually.</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Logo URL <span className="text-ink-400 font-normal">(optional)</span></label>
            <Input
              placeholder="https://example.com/logo.png"
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            />
            {form.logoUrl && (
              <div className="mt-2 flex h-12 w-12 items-center justify-center rounded-lg border border-ink-200 bg-ink-50 p-1">
                <img src={form.logoUrl} alt="Preview" className="max-h-full max-w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-ink-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink-900">Luxury Brand</p>
              <p className="text-xs text-ink-500">Mark as a premium or luxury brand</p>
            </div>
            <button
              type="button"
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                form.isLuxury ? 'bg-brand-600' : 'bg-ink-200',
              )}
              onClick={() => setForm({ ...form, isLuxury: !form.isLuxury })}
              role="switch"
              aria-checked={form.isLuxury}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                  form.isLuxury ? 'translate-x-5' : 'translate-x-0',
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-ink-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink-900">Active</p>
              <p className="text-xs text-ink-500">Brand will be visible on the platform</p>
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
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                  form.isActive ? 'translate-x-5' : 'translate-x-0',
                )}
              />
            </button>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button variant="brand" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update Brand' : 'Create Brand'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => { if (!deleting) setDeleteId(null); }}>
        <DialogHeader>Delete Brand</DialogHeader>
        <DialogBody>
          <p className="text-sm text-ink-700">
            Are you sure you want to delete <span className="font-medium text-ink-900">{brands.find((b) => b.id === deleteId)?.name}</span>? This action cannot be undone.
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
