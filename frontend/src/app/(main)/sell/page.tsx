'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export default function SellPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    condition: 'GOOD',
    priceRupees: '',
    originalRupees: '',
    size: '',
    color: '',
    tags: '',
    mediaUrl: 'https://placehold.co/800x1000/1a1a1a/fff?text=Product',
    rawNotes: '',
  });

  const runAi = async () => {
    if (!user) {
      router.push('/sign-in');
      return;
    }
    setAiLoading(true);
    try {
      const res = await apiClient.post<{
        title?: string;
        description?: string;
        tags?: string[];
        estimatedPricePaise?: number;
      }>('/ai/listing', {
        rawNotes: form.rawNotes || form.title,
        condition: form.condition,
      });
      setForm((f) => ({
        ...f,
        title: res.title || f.title,
        description: res.description || f.description,
        tags: res.tags?.join(', ') || f.tags,
        priceRupees: res.estimatedPricePaise
          ? String(Math.round(res.estimatedPricePaise / 100))
          : f.priceRupees,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/sign-in');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Ensure store exists (ignore if already)
      try {
        await apiClient.post('/sellers/store', {
          storeName: user.displayName || user.username,
          businessType: 'individual',
        });
      } catch {
        /* already seller */
      }

      const cats = await apiClient.get<Array<{ id: string; slug: string }>>('/categories');
      const categoryId = form.categoryId || cats[0]?.id;
      if (!categoryId) throw new Error('No categories — seed the database first');

      const product = await apiClient.post<{ slug: string }>('/products', {
        title: form.title,
        description: form.description,
        categoryId,
        condition: form.condition,
        pricePaise: Math.round(Number(form.priceRupees) * 100),
        originalPricePaise: form.originalRupees
          ? Math.round(Number(form.originalRupees) * 100)
          : undefined,
        size: form.size || undefined,
        color: form.color || undefined,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        mediaUrls: [form.mediaUrl],
        publish: true,
        allowsShipping: true,
      });

      router.push(`/product/${product.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to list');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Sell an item</h1>
      <p className="mt-1 text-sm text-ink-500">
        Create a listing. Use AI to draft title, description & price.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
          <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-brand-900">
            <Sparkles className="h-3.5 w-3.5" />
            Quick notes for AI
          </label>
          <Input
            value={form.rawNotes}
            onChange={(e) => setForm((f) => ({ ...f, rawNotes: e.target.value }))}
            placeholder="e.g. Nike dunks size 9 white, worn twice, original box"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={runAi}
            disabled={aiLoading}
          >
            {aiLoading ? 'Generating…' : 'Generate with AI'}
          </Button>
        </div>

        <Field label="Title">
          <Input
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </Field>
        <Field label="Description">
          <textarea
            required
            minLength={20}
            rows={5}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price (₹)">
            <Input
              required
              type="number"
              min={1}
              value={form.priceRupees}
              onChange={(e) => setForm((f) => ({ ...f, priceRupees: e.target.value }))}
            />
          </Field>
          <Field label="Original price (₹)">
            <Input
              type="number"
              value={form.originalRupees}
              onChange={(e) => setForm((f) => ({ ...f, originalRupees: e.target.value }))}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Condition">
            <select
              value={form.condition}
              onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
              className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm"
            >
              {['NEW_WITH_TAGS', 'NEW_WITHOUT_TAGS', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'].map(
                (c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, ' ')}
                  </option>
                ),
              )}
            </select>
          </Field>
          <Field label="Size">
            <Input
              value={form.size}
              onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
            />
          </Field>
          <Field label="Color">
            <Input
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
            />
          </Field>
        </div>
        <Field label="Tags (comma separated)">
          <Input
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          />
        </Field>
        <Field label="Image URL (temp — S3 upload next)">
          <Input
            value={form.mediaUrl}
            onChange={(e) => setForm((f) => ({ ...f, mediaUrl: e.target.value }))}
          />
        </Field>

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Publishing…' : 'Publish listing'}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-ink-600">{label}</label>
      {children}
    </div>
  );
}
