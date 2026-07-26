'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Clock,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  Image,
  BookOpen,
  Search,
  Globe,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  coverUrl?: string | null;
  authorName?: string | null;
  status: string;
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDesc?: string | null;
  createdAt: string;
  updatedAt: string;
};

type BlogsResponse = {
  items: BlogPost[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const STATUS_FILTERS = ['ALL', 'DRAFT', 'PUBLISHED', 'SCHEDULED'] as const;

const STATUS_BADGE: Record<string, 'default' | 'brand' | 'outline' | 'success'> = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  SCHEDULED: 'outline',
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-ink-100 text-ink-700',
  PUBLISHED: 'bg-emerald-100 text-emerald-800',
  SCHEDULED: 'bg-amber-100 text-amber-800',
};

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

const INITIAL_FORM = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverUrl: '',
  authorName: '',
  status: 'draft',
  seoTitle: '',
  seoDesc: '',
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function AdminBlogsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingBlog, setDeletingBlog] = useState<BlogPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const fetchBlogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (statusFilter !== 'ALL') params.set('status', statusFilter);
        const res = await apiClient.get<BlogsResponse>(`/admin/cms/blogs?${params}`);
        setBlogs(res.items);
        setMeta(res.meta);
      } catch {
        setError('Failed to load blog posts');
      } finally {
        setLoading(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    fetchBlogs();
  }, [user, router, fetchBlogs]);

  const openCreate = () => {
    setEditingBlog(null);
    setForm(INITIAL_FORM);
    setSlugManuallyEdited(false);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (blog: BlogPost) => {
    setEditingBlog(blog);
    setForm({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt || '',
      content: blog.content,
      coverUrl: blog.coverUrl || '',
      authorName: blog.authorName || '',
      status: blog.status,
      seoTitle: blog.seoTitle || '',
      seoDesc: blog.seoDesc || '',
    });
    setSlugManuallyEdited(true);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: slugManuallyEdited ? prev.slug : slugify(title),
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError('Title is required'); return; }
    if (!form.slug.trim()) { setFormError('Slug is required'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        excerpt: form.excerpt.trim() || undefined,
        content: form.content,
        coverUrl: form.coverUrl.trim() || undefined,
        authorName: form.authorName.trim() || undefined,
        status: form.status,
        seoTitle: form.seoTitle.trim() || undefined,
        seoDesc: form.seoDesc.trim() || undefined,
      };
      if (editingBlog) {
        await apiClient.patch(`/admin/cms/blogs/${editingBlog.id}`, body);
      } else {
        await apiClient.post('/admin/cms/blogs', body);
      }
      setDialogOpen(false);
      fetchBlogs(meta.page);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save blog post';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (blog: BlogPost) => {
    setDeletingBlog(blog);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingBlog) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/admin/cms/blogs/${deletingBlog.id}`);
      setDeleteOpen(false);
      setDeletingBlog(null);
      fetchBlogs(meta.page);
    } catch {
      setFormError('Failed to delete blog post');
    } finally {
      setDeleting(false);
    }
  };

  const toggleStatus = async (blog: BlogPost) => {
    setTogglingIds((prev) => new Set(prev).add(blog.id));
    const newStatus = blog.status === 'published' ? 'draft' : 'published';
    try {
      await apiClient.patch(`/admin/cms/blogs/${blog.id}`, { status: newStatus });
      setBlogs((prev) =>
        prev.map((b) =>
          b.id === blog.id
            ? { ...b, status: newStatus, publishedAt: newStatus === 'published' ? new Date().toISOString() : b.publishedAt }
            : b,
        ),
      );
    } catch {
      // ignore
    } finally {
      setTogglingIds((prev) => { const next = new Set(prev); next.delete(blog.id); return next; });
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <FileText className="h-6 w-6 text-brand-600" />
            Blog Management
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {meta.total} blog {meta.total === 1 ? 'post' : 'posts'} on the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchBlogs(meta.page)}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="brand" size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Blog Post
          </Button>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
              statusFilter === s
                ? 'bg-ink-900 text-white shadow-soft'
                : 'bg-ink-100 text-ink-600 hover:bg-ink-200',
            )}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            {s === 'ALL' && meta.total > 0 && (
              <span className="ml-1 text-ink-400">({meta.total})</span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchBlogs()}>
            Try Again
          </Button>
        </div>
      ) : blogs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No blog posts found</p>
          <p className="mt-1 text-sm text-ink-400">
            {statusFilter !== 'ALL' ? 'Try changing the status filter' : 'Create your first blog post'}
          </p>
          <Button variant="brand" size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Blog Post
          </Button>
        </div>
      ) : (
        <>
          {/* Blog cards */}
          <div className="space-y-3">
            {blogs.map((blog) => (
              <div
                key={blog.id}
                className={cn(
                  'rounded-2xl border bg-white shadow-soft overflow-hidden transition',
                  blog.status === 'published' ? 'border-ink-100' : 'border-ink-100/60 opacity-75',
                )}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Cover thumbnail */}
                  <div className="relative h-32 w-full shrink-0 bg-ink-100 sm:h-auto sm:w-44">
                    {blog.coverUrl ? (
                      <img
                        src={blog.coverUrl}
                        alt={blog.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    <div className={cn(
                      'absolute inset-0 flex items-center justify-center',
                      blog.coverUrl ? 'bg-ink-100/40' : 'bg-ink-100',
                    )}>
                      <Image className={cn(
                        'h-8 w-8',
                        blog.coverUrl ? 'text-white' : 'text-ink-300',
                      )} />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between p-4 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-ink-900 truncate">{blog.title}</h3>
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                            STATUS_STYLES[blog.status] || 'bg-ink-100 text-ink-600',
                          )}>
                            {blog.status.charAt(0).toUpperCase() + blog.status.slice(1)}
                          </span>
                        </div>
                        {blog.excerpt && (
                          <p className="mt-1 text-sm text-ink-500 line-clamp-2">{blog.excerpt}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
                          {blog.authorName && (
                            <span className="font-medium text-ink-600">{blog.authorName}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            /{blog.slug}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {blog.publishedAt
                              ? `Published ${formatDate(blog.publishedAt)}`
                              : `Created ${formatDate(blog.createdAt)}`
                            }
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => toggleStatus(blog)}
                          disabled={togglingIds.has(blog.id)}
                          className={cn(
                            'rounded-full p-2 transition',
                            blog.status === 'published'
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-ink-400 hover:bg-ink-100',
                          )}
                          title={blog.status === 'published' ? 'Unpublish' : 'Publish'}
                        >
                          {togglingIds.has(blog.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : blog.status === 'published' ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(blog)}
                          className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDelete(blog)}
                          className="rounded-full p-2 text-ink-400 hover:bg-red-50 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
                onClick={() => fetchBlogs(meta.page - 1)}
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
                onClick={() => fetchBlogs(meta.page + 1)}
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
          {editingBlog ? 'Edit Blog Post' : 'Create Blog Post'}
        </DialogHeader>
        <DialogBody>
          {formError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Title */}
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Title *</label>
              <Input
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="How to style vintage denim"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Slug</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-400 pointer-events-none">
                  /
                </span>
                <Input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true);
                    setForm({ ...form, slug: slugify(e.target.value) });
                  }}
                  placeholder="how-to-style-vintage-denim"
                  className="pl-6"
                />
              </div>
              <p className="mt-1 text-xs text-ink-400">Auto-generated from title. Edit to customize.</p>
            </div>

            {/* Excerpt */}
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Excerpt</label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                placeholder="A brief summary of the blog post..."
                rows={2}
              />
            </div>

            {/* Content */}
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Content</label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write your blog content here... (rich text coming soon)"
                rows={8}
              />
              {form.content && (
                <p className="mt-1 text-xs text-ink-400 text-right">
                  {wordCount(form.content)} words · {form.content.length} characters
                </p>
              )}
            </div>

            {/* Cover URL & Author */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Cover Image URL</label>
                <Input
                  value={form.coverUrl}
                  onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
                  placeholder="https://example.com/cover.jpg"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Author Name</label>
                <Input
                  value={form.authorName}
                  onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                  placeholder="Jane Doe"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Status</label>
              <Select
                options={STATUS_OPTIONS}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              />
            </div>

            {/* SEO Section */}
            <div className="border-t border-ink-100 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-4 w-4 text-ink-400" />
                <span className="text-sm font-semibold text-ink-700">SEO Settings</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">SEO Title</label>
                  <Input
                    value={form.seoTitle}
                    onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                    placeholder="Meta title for search engines"
                  />
                  {form.seoTitle && (
                    <p className="mt-1 text-xs text-ink-400 text-right">{form.seoTitle.length} characters</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">SEO Description</label>
                  <Textarea
                    value={form.seoDesc}
                    onChange={(e) => setForm({ ...form, seoDesc: e.target.value })}
                    placeholder="Meta description for search engines"
                    rows={2}
                  />
                  {form.seoDesc && (
                    <p className="mt-1 text-xs text-ink-400 text-right">{form.seoDesc.length} characters</p>
                  )}
                </div>
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
            ) : editingBlog ? (
              'Update Blog Post'
            ) : (
              'Create Blog Post'
            )}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogHeader>Delete Blog Post</DialogHeader>
        <DialogBody>
          <p className="text-sm text-ink-600">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-ink-900">{deletingBlog?.title}</span>?
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
