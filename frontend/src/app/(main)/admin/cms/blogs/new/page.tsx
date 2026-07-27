'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

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

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

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

export default function CreateBlogPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverUrl: '',
    authorName: '',
    status: 'draft',
    seoTitle: '',
    seoDesc: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
    }
  }, [user, router]);

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
      await apiClient.post('/admin/cms/blogs', body);
      router.push('/admin/cms/blogs');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create blog post';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => router.push('/admin/cms/blogs')} className="mb-6">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Blogs
      </Button>

      <h1 className="font-display text-2xl font-semibold text-ink-900 mb-8">Create Blog Post</h1>

      {formError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Title *</label>
          <Input
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="How to style vintage denim"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Slug</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-400 pointer-events-none">/</span>
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

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Excerpt</label>
          <Textarea
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            placeholder="A brief summary of the blog post..."
            rows={2}
          />
        </div>

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
              {wordCount(form.content)} words &middot; {form.content.length} characters
            </p>
          )}
        </div>

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

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Status</label>
          <Select
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          />
        </div>

        <div className="border-t border-ink-100 pt-5">
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

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => router.push('/admin/cms/blogs')}>
            Cancel
          </Button>
          <Button variant="brand" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Create Blog Post'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
