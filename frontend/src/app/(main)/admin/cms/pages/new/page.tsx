'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function CreatePagePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [form, setForm] = useState({
    slug: '',
    title: '',
    content: '',
    seoTitle: '',
    seoDesc: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
    }
  }, [user, router]);

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError('Title is required'); return; }
    if (!form.slug.trim()) { setFormError('Slug is required'); return; }
    if (!form.content.trim()) { setFormError('Content is required'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        slug: form.slug,
        title: form.title,
        content: form.content,
        seoTitle: form.seoTitle || undefined,
        seoDesc: form.seoDesc || undefined,
      };
      await apiClient.post('/admin/cms/pages', body);
      router.push('/admin/cms/pages');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create page';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => router.push('/admin/cms/pages')} className="mb-6">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Pages
      </Button>

      <h1 className="font-display text-2xl font-semibold text-ink-900 mb-8">Create Page</h1>

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
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="About Us"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Slug *</label>
          <Input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="about-us"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Content *</label>
          <Textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Page content (HTML supported)"
            rows={8}
          />
        </div>

        <div className="border-t border-ink-100 pt-5">
          <h3 className="text-sm font-semibold text-ink-700 mb-3">SEO Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">SEO Title</label>
              <Input
                value={form.seoTitle}
                onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                placeholder="Meta title for search engines"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">SEO Description</label>
              <Textarea
                value={form.seoDesc}
                onChange={(e) => setForm({ ...form, seoDesc: e.target.value })}
                placeholder="Meta description for search engines"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => router.push('/admin/cms/pages')}>
            Cancel
          </Button>
          <Button variant="brand" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Create Page'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
