'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  Trash2,
  Search,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';

type StaticPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
  seoTitle?: string | null;
  seoDesc?: string | null;
  createdAt: string;
  updatedAt: string;
};

type PagesResponse = {
  items: StaticPage[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const SUGGESTED_PAGES = [
  'About', 'Contact', 'Privacy Policy', 'Terms of Service',
  'Buyer Protection', 'Seller Policy', 'Shipping Policy',
  'Refund Policy', 'Careers', 'Press',
];

const INITIAL_FORM = {
  slug: '',
  title: '',
  content: '',
  seoTitle: '',
  seoDesc: '',
};

export default function AdminCMSPagesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [pages, setPages] = useState<StaticPage[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState('');

  const fetchPages = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await apiClient.get<PagesResponse>(`/admin/cms/pages?${params}`);
      setPages(res.items);
      setMeta(res.meta);
    } catch {
      setError('Failed to load static pages');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    fetchPages();
  }, [user, router, fetchPages]);

  const openCreate = () => {
    setEditingPage(null);
    setForm(INITIAL_FORM);
    setDialogOpen(true);
  };

  const openEdit = (page: StaticPage) => {
    setEditingPage(page);
    setForm({
      slug: page.slug,
      title: page.title,
      content: page.content,
      seoTitle: page.seoTitle || '',
      seoDesc: page.seoDesc || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        slug: form.slug,
        title: form.title,
        content: form.content,
        seoTitle: form.seoTitle || undefined,
        seoDesc: form.seoDesc || undefined,
      };
      if (editingPage) {
        await apiClient.patch(`/admin/cms/pages/${editingPage.id}`, body);
      } else {
        await apiClient.post('/admin/cms/pages', body);
      }
      setDialogOpen(false);
      fetchPages(meta.page);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiClient.delete(`/admin/cms/pages/${deleteId}`);
      setDeleteId(null);
      setDeleteTitle('');
      fetchPages(meta.page);
    } catch {
      /* ignore */
    }
  };

  const fillSuggestion = (suggestion: string) => {
    const slug = suggestion.toLowerCase().replace(/\s+/g, '-');
    setForm((prev) => ({
      ...prev,
      title: suggestion,
      slug,
    }));
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <FileText className="h-6 w-6 text-brand-600" />
            Static Pages
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {meta.total} total pages &middot; Manage your site&apos;s static content
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchPages(meta.page)}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="brand" size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Page
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            onKeyDown={(e) => { if (e.key === 'Enter') fetchPages(); }}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchPages()}>
          Search
        </Button>
      </div>

      {/* Predefined Suggestions */}
      {pages.length === 0 && !loading && !error && (
        <div className="mb-6">
          <p className="mb-3 text-sm font-medium text-ink-600">Quick create from template</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PAGES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  openCreate();
                  fillSuggestion(s);
                }}
                className="rounded-full border border-dashed border-ink-200 px-4 py-2 text-sm text-ink-600 transition hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <FileText className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchPages()}>
            Try Again
          </Button>
        </div>
      ) : pages.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <FileText className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No pages found</p>
          <p className="mt-1 text-sm text-ink-400">
            {search ? 'Try a different search term' : 'Create your first static page to get started'}
          </p>
          {!search && (
            <Button variant="brand" size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Page
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl border border-ink-100 bg-white shadow-soft overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">SEO</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Last Updated</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-ink-50/50 transition">
                    <td className="px-4 py-3">
                      <code className="rounded bg-ink-50 px-2 py-0.5 text-xs font-mono text-brand-700">
                        {page.slug}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink-900">{page.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      {page.seoTitle ? (
                        <Badge variant="outline">Has SEO</Badge>
                      ) : (
                        <span className="text-ink-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-500 text-xs whitespace-nowrap">
                      {new Date(page.updatedAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/page/${page.slug}`} target="_blank">
                          <Button variant="ghost" size="icon" title="Preview">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(page)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setDeleteId(page.id); setDeleteTitle(page.title); }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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
            {pages.map((page) => (
              <div key={page.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink-900 truncate">{page.title}</p>
                    <code className="mt-0.5 inline-block rounded bg-ink-50 px-1.5 py-0.5 text-xs font-mono text-brand-700">
                      {page.slug}
                    </code>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-400">
                      <span>
                        Updated {new Date(page.updatedAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                      {page.seoTitle && <Badge variant="outline">SEO</Badge>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Link href={`/page/${page.slug}`} target="_blank">
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(page)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => fetchPages(meta.page - 1)}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-ink-500">Page {meta.page} of {meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => fetchPages(meta.page + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader>{editingPage ? 'Edit Page' : 'Create Page'}</DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Page title"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Slug *</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="page-slug"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Content *</label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Page content (HTML supported)"
                rows={8}
              />
            </div>
            <hr className="border-ink-100" />
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">SEO Settings</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">SEO Title</label>
              <Input
                value={form.seoTitle}
                onChange={(e) => setForm((prev) => ({ ...prev, seoTitle: e.target.value }))}
                placeholder="Meta title (optional)"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">SEO Description</label>
              <Textarea
                value={form.seoDesc}
                onChange={(e) => setForm((prev) => ({ ...prev, seoDesc: e.target.value }))}
                placeholder="Meta description (optional)"
                rows={3}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="brand"
            onClick={handleSave}
            disabled={saving || !form.title || !form.slug || !form.content}
          >
            {saving ? 'Saving...' : editingPage ? 'Update Page' : 'Create Page'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => { setDeleteId(null); setDeleteTitle(''); }}>
        <DialogHeader>Delete Page</DialogHeader>
        <DialogBody>
          <p className="text-sm text-ink-600">
            Are you sure you want to delete <span className="font-semibold text-ink-900">&ldquo;{deleteTitle}&rdquo;</span>?
            This action cannot be undone.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDeleteId(null); setDeleteTitle(''); }}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
