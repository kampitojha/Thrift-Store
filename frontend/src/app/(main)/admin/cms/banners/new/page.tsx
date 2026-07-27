'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

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

export default function CreateBannerPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [form, setForm] = useState({
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
      await apiClient.post('/admin/cms/banners', body);
      router.push('/admin/cms/banners');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create banner';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => router.push('/admin/cms/banners')} className="mb-6">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Banners
      </Button>

      <h1 className="font-display text-2xl font-semibold text-ink-900 mb-8">Create Banner</h1>

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

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => router.push('/admin/cms/banners')}>
            Cancel
          </Button>
          <Button variant="brand" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Create Banner'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
