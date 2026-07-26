'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderTree,
  Plus,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  CheckCircle,
  XCircle,
  Package,
  Layers,
  Hash,
  Globe,
  FileText,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

type CategoryCount = {
  products: number;
  children: number;
};

type CategoryParent = {
  id: string;
  name: string;
};

type CategoryChild = {
  id: string;
  name: string;
  slug: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  iconUrl?: string | null;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
  seoTitle?: string | null;
  seoDesc?: string | null;
  createdAt: string;
  updatedAt: string;
  parent?: CategoryParent | null;
  _count: CategoryCount;
  children?: CategoryChild[];
};

type CategoriesResponse = {
  data: Category[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

type FormData = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  iconUrl: string;
  parentId: string;
  sortOrder: number;
  isActive: boolean;
  seoTitle: string;
  seoDesc: string;
};

const EMPTY_FORM: FormData = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  iconUrl: '',
  parentId: '',
  sortOrder: 0,
  isActive: true,
  seoTitle: '',
  seoDesc: '',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildDepthMap(items: Category[]): Map<string, number> {
  const depthMap = new Map<string, number>();
  const itemMap = new Map(items.map((c) => [c.id, c]));

  function getDepth(id: string): number {
    if (depthMap.has(id)) return depthMap.get(id)!;
    const item = itemMap.get(id);
    if (!item || !item.parentId || !itemMap.has(item.parentId)) {
      depthMap.set(id, 0);
      return 0;
    }
    const depth = getDepth(item.parentId) + 1;
    depthMap.set(id, depth);
    return depth;
  }

  for (const item of items) getDepth(item.id);
  return depthMap;
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [autoSlug, setAutoSlug] = useState(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [parentOptions, setParentOptions] = useState<Category[]>([]);
  const [depthMap, setDepthMap] = useState<Map<string, number>>(new Map());

  const fetchCategories = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (search) params.set('q', search);
        const res = await apiClient.get<CategoriesResponse>(`/admin/categories?${params}`);
        const data = res.data ?? [];
        setCategories(data);
        setMeta(res.meta);
        setDepthMap(buildDepthMap(data));
      } catch {
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    },
    [search],
  );

  const fetchParentOptions = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: '1', limit: '500' });
      const res = await apiClient.get<CategoriesResponse>(`/admin/categories?${params}`);
      setParentOptions(res.data ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    fetchCategories();
  }, [user, router, fetchCategories]);

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
    fetchParentOptions();
    setDialogOpen(true);
  }

  function openEdit(category: Category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      iconUrl: category.iconUrl || '',
      parentId: category.parentId || '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      seoTitle: category.seoTitle || '',
      seoDesc: category.seoDesc || '',
    });
    setAutoSlug(false);
    setFormError(null);
    fetchParentOptions();
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
      setFormError('Category name is required');
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
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        iconUrl: form.iconUrl.trim() || undefined,
        parentId: form.parentId || undefined,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
        seoTitle: form.seoTitle.trim() || undefined,
        seoDesc: form.seoDesc.trim() || undefined,
      };

      if (editingId) {
        await apiClient.patch(`/admin/categories/${editingId}`, payload);
      } else {
        await apiClient.post('/admin/categories', payload);
      }
      closeDialog();
      fetchCategories(meta.page);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save category';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(category: Category) {
    try {
      await apiClient.patch(`/admin/categories/${category.id}`, { isActive: !category.isActive });
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, isActive: !c.isActive } : c)),
      );
    } catch {
      setError('Failed to toggle category status');
    }
  }

  async function handleDelete() {
    if (!deleteId) return;

    const target = categories.find((c) => c.id === deleteId);
    if (target && (target._count.products > 0 || target._count.children > 0)) return;

    setDeleting(true);
    try {
      await apiClient.delete(`/admin/categories/${deleteId}`);
      setDeleteId(null);
      fetchCategories(meta.page);
    } catch {
      setError('Failed to delete category');
    } finally {
      setDeleting(false);
    }
  }

  const categoryToDelete = categories.find((c) => c.id === deleteId);
  const hasProducts = (categoryToDelete?._count?.products ?? 0) > 0;
  const hasChildren = (categoryToDelete?._count?.children ?? 0) > 0;
  const canDelete = categoryToDelete && !hasProducts && !hasChildren;

  const parentSelectOptions = [
    { value: '', label: 'None (top-level)' },
    ...parentOptions
      .filter((c) => c.id !== editingId)
      .map((c) => ({ value: c.id, label: c.name })),
  ];

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <FolderTree className="h-6 w-6 text-brand-600" />
            Category Management
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {meta.total} categories in the catalog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchCategories(meta.page)}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="brand" size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Category
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            placeholder="Search categories by name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          Search
        </Button>
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setSearchInput(''); }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <FolderTree className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No categories found</p>
          <p className="mt-1 text-sm text-ink-400">
            {search
              ? 'Try adjusting your search terms'
              : 'Start organizing your products by creating categories'}
          </p>
          {!search && (
            <Button variant="brand" size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Category
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
                  <th className="px-4 py-3 font-medium text-ink-600">Name</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Slug</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Parent</th>
                  <th className="px-4 py-3 font-medium text-ink-600 text-center">Products</th>
                  <th className="px-4 py-3 font-medium text-ink-600 text-center">Subcategories</th>
                  <th className="px-4 py-3 font-medium text-ink-600 text-center">Sort</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Status</th>
                  <th className="w-28 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {categories.map((category) => {
                  const depth = depthMap.get(category.id) ?? 0;
                  return (
                    <tr key={category.id} className="transition hover:bg-ink-50/50">
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${depth * 20}px` }}
                        >
                          {depth > 0 && (
                            <div className="flex items-center text-ink-300">
                              <ChevronRightIcon className="h-3 w-3 shrink-0" />
                            </div>
                          )}
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-100">
                            {category.imageUrl ? (
                              <img
                                src={category.imageUrl}
                                alt={category.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <FolderTree className="h-4 w-4 text-ink-400" />
                            )}
                          </div>
                          <span className="font-medium text-ink-900">{category.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-ink-500">{category.slug}</span>
                      </td>
                      <td className="px-4 py-3">
                        {category.parent ? (
                          <span className="text-sm text-ink-600">{category.parent.name}</span>
                        ) : (
                          <span className="text-xs text-ink-400">&mdash;</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-ink-600">
                          <Package className="h-3.5 w-3.5 text-ink-400" />
                          {category._count.products}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-ink-600">
                          <Layers className="h-3.5 w-3.5 text-ink-400" />
                          {category._count.children}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-ink-500">
                          <Hash className="h-3.5 w-3.5 text-ink-400" />
                          {category.sortOrder}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-all',
                            category.isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-ink-100 text-ink-500 hover:bg-ink-200',
                          )}
                          onClick={() => handleToggleActive(category)}
                          role="switch"
                          aria-checked={category.isActive}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ')
                              handleToggleActive(category);
                          }}
                        >
                          {category.isActive ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {category.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(category)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(category.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {categories.map((category) => {
              const depth = depthMap.get(category.id) ?? 0;
              return (
                <div
                  key={category.id}
                  className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft"
                  style={{ marginLeft: `${depth * 16}px` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink-100">
                      {category.imageUrl ? (
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <FolderTree className="h-5 w-5 text-ink-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-ink-900">{category.name}</span>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-ink-400">{category.slug}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer',
                            category.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-ink-100 text-ink-500',
                          )}
                          onClick={() => handleToggleActive(category)}
                        >
                          {category.isActive ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {category.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-ink-400">
                          <Package className="h-3 w-3" />
                          {category._count.products} products
                        </span>
                        <span className="flex items-center gap-1 text-xs text-ink-400">
                          <Layers className="h-3 w-3" />
                          {category._count.children} sub
                        </span>
                        <span className="flex items-center gap-1 text-xs text-ink-400">
                          <Hash className="h-3 w-3" />
                          sort {category.sortOrder}
                        </span>
                        {category.parent && (
                          <span className="text-xs text-ink-400">
                            Parent: {category.parent.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(category.id)}
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

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page <= 1}
                onClick={() => fetchCategories(meta.page - 1)}
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
                onClick={() => fetchCategories(meta.page + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog}>
        <DialogHeader>{editingId ? 'Edit Category' : 'Create Category'}</DialogHeader>
        <DialogBody className="space-y-4 max-h-[70vh] overflow-y-auto">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Electronics"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              Slug <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. electronics"
              value={form.slug}
              onChange={(e) => {
                setAutoSlug(false);
                setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') });
              }}
            />
            {!editingId && (
              <p className="mt-1 text-xs text-ink-400">
                Auto-generated from category name. You can edit it manually.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              Description <span className="text-ink-400 font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="Describe this category..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                Image URL <span className="text-ink-400 font-normal">(optional)</span>
              </label>
              <Input
                placeholder="https://..."
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />
              {form.imageUrl && (
                <div className="mt-2 flex h-12 w-12 items-center justify-center rounded-lg border border-ink-200 bg-ink-50 p-1">
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                Icon URL <span className="text-ink-400 font-normal">(optional)</span>
              </label>
              <Input
                placeholder="https://..."
                value={form.iconUrl}
                onChange={(e) => setForm({ ...form, iconUrl: e.target.value })}
              />
              {form.iconUrl && (
                <div className="mt-2 flex h-12 w-12 items-center justify-center rounded-lg border border-ink-200 bg-ink-50 p-1">
                  <img
                    src={form.iconUrl}
                    alt="Preview"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                Parent Category <span className="text-ink-400 font-normal">(optional)</span>
              </label>
              <Select
                options={parentSelectOptions}
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Sort Order</label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })
                }
                min={0}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-ink-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink-900">Active</p>
              <p className="text-xs text-ink-500">
                Category will be visible on the platform
              </p>
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

          {/* SEO Section */}
          <div className="rounded-xl border border-ink-100 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-ink-500" />
              <span className="text-sm font-semibold text-ink-700">SEO Settings</span>
              <span className="text-xs text-ink-400 font-normal">(optional)</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">
                  SEO Title
                </label>
                <Input
                  placeholder="Custom title for search engines"
                  value={form.seoTitle}
                  onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">
                  SEO Description
                </label>
                <Textarea
                  placeholder="Custom meta description"
                  value={form.seoDesc}
                  onChange={(e) => setForm({ ...form, seoDesc: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button variant="brand" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteId}
        onClose={() => {
          if (!deleting) setDeleteId(null);
        }}
      >
        <DialogHeader>Delete Category</DialogHeader>
        <DialogBody>
          {categoryToDelete && (hasProducts || hasChildren) ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-600">
                <FileText className="h-5 w-5" />
                <p className="text-sm font-medium">Cannot delete this category</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {hasProducts && (
                  <p>
                    This category contains{' '}
                    <span className="font-semibold">{categoryToDelete._count.products}</span>{' '}
                    product(s). Remove or reassign them before deleting.
                  </p>
                )}
                {hasChildren && (
                  <p className={cn(hasProducts && 'mt-2')}>
                    This category has{' '}
                    <span className="font-semibold">
                      {categoryToDelete._count.children}
                    </span>{' '}
                    subcategor{categoryToDelete._count.children === 1 ? 'y' : 'ies'}.
                    Delete or reassign them before proceeding.
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteId(null)}
              >
                Got it
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-ink-700">
                Are you sure you want to delete{' '}
                <span className="font-medium text-ink-900">
                  {categoryToDelete?.name}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting || !canDelete}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          )}
        </DialogBody>
      </Dialog>
    </div>
  );
}
