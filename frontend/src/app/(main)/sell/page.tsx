'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Save, Send, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { UploadArea, UploadImage } from '@/components/ui/upload-area';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

const CONDITIONS = [
  { value: 'NEW_WITH_TAGS', label: 'New with tags' },
  { value: 'NEW_WITHOUT_TAGS', label: 'New without tags' },
  { value: 'LIKE_NEW', label: 'Like new' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
];

const GENDERS = [
  { value: 'MEN', label: 'Men' },
  { value: 'WOMEN', label: 'Women' },
  { value: 'UNISEX', label: 'Unisex' },
  { value: 'KIDS', label: 'Kids' },
  { value: 'OTHER', label: 'Other' },
];

type CategoryNode = { id: string; name: string; slug: string; children?: CategoryNode[] };

export default function SellPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [images, setImages] = useState<UploadImage[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    subcategoryId: '',
    brandId: '',
    condition: 'GOOD',
    gender: 'UNISEX' as string,
    color: '',
    material: '',
    size: '',
    weightGrams: '',
    priceRupees: '',
    originalRupees: '',
    quantity: '1',
    tags: '',
    allowsPickup: false,
    allowsShipping: true,
    returnPolicyDays: '7',
    city: '',
    state: '',
    rawNotes: '',
  });

  useEffect(() => {
    apiClient.get<CategoryNode[]>('/categories').then(setCategories).catch(() => {});
    apiClient.get<Array<{ id: string; name: string }>>('/categories/brands').then(setBrands).catch(() => {});
  }, []);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const runAi = async () => {
    if (!user) { router.push('/sign-in'); return; }
    setAiLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<{
        title?: string;
        description?: string;
        tags?: string[];
        suggestedCategorySlug?: string;
        estimatedPricePaise?: number;
      }>('/ai/listing', {
        rawNotes: form.rawNotes || form.title,
        condition: form.condition,
        categoryHint: categories.find((c) => c.id === form.categoryId)?.slug,
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
      if (res.suggestedCategorySlug) {
        const match = categories.find((c) => c.slug === res.suggestedCategorySlug);
        if (match) updateField('categoryId', match.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!user) { router.push('/sign-in'); return; }
    setLoading(true);
    setError(null);
    try {
      await submitListing(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const submitListing = async (asDraft = false) => {
    await ensureSellerExists();
    const mediaUrls = images.map((i) => i.url).filter(Boolean);
    if (!asDraft && mediaUrls.length === 0) {
      throw new Error('At least one image is required');
    }

    const product = await apiClient.post<{ id: string; slug: string }>('/products', {
      title: form.title,
      description: form.description,
      categoryId: form.subcategoryId || form.categoryId,
      brandId: form.brandId || undefined,
      gender: form.gender,
      condition: form.condition,
      color: form.color || undefined,
      material: form.material || undefined,
      size: form.size || undefined,
      pricePaise: Math.round(Number(form.priceRupees) * 100),
      originalPricePaise: form.originalRupees
        ? Math.round(Number(form.originalRupees) * 100)
        : undefined,
      quantity: Number(form.quantity) || 1,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      mediaUrls,
      allowsPickup: form.allowsPickup,
      allowsShipping: form.allowsShipping,
      returnPolicyDays: Number(form.returnPolicyDays) || 7,
      city: form.city || undefined,
      state: form.state || undefined,
      weightGrams: form.weightGrams ? Number(form.weightGrams) : undefined,
      publish: !asDraft,
    });

    return product;
  };

  const ensureSellerExists = async () => {
    try {
      await apiClient.post('/sellers/store', {
        storeName: user?.displayName || user?.username,
        businessType: 'individual',
      });
    } catch {
      /* already seller */
    }
  };

  const publishListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push('/sign-in'); return; }
    setLoading(true);
    setError(null);
    try {
      const product = await submitListing(false);
      router.push(`/product/${product.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to publish');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">Sell an item</h1>
        <p className="mt-2 text-ink-500">Sign in to create a listing.</p>
        <Button variant="brand" className="mt-6" onClick={() => router.push('/sign-in')}>
          Sign in
        </Button>
      </div>
    );
  }

  const subcategories = categories.find((c) => c.id === form.categoryId)?.children || [];
  const catOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const brandOptions = brands.map((b) => ({ value: b.id, label: b.name }));

  return (
    <div className="container-page max-w-4xl py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Sell an item</h1>
          <p className="mt-1 text-sm text-ink-500">
            List with AI assistance. Fill what you can, complete the rest.
          </p>
        </div>
      </div>

      <form onSubmit={publishListing} className="space-y-8">
        {/* AI Assistant */}
        <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-900">
            <Sparkles className="h-4 w-4" />
            AI Listing Assistant
          </div>
          <p className="mt-1 text-xs text-brand-700">
            Describe your item naturally and let AI generate title, description, tags, and price.
          </p>
          <div className="mt-3 flex gap-3">
            <Input
              value={form.rawNotes}
              onChange={(e) => updateField('rawNotes', e.target.value)}
              placeholder="e.g. Nike Air Force 1 Low White, size UK 9, worn twice, original box included, bought from Vegas"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runAi}
              disabled={aiLoading}
              className="shrink-0"
            >
              {aiLoading ? 'Generating…' : 'Generate'}
            </Button>
          </div>
        </div>

        {/* Images */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Photos *</h2>
          <UploadArea images={images} onChange={setImages} maxFiles={12} />
        </section>

        {/* Basic Info */}
        <section className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Title *">
              <Input
                required
                maxLength={120}
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g. Nike Air Force 1 Low White - Size UK 9"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description *">
              <Textarea
                required
                minLength={20}
                maxLength={5000}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe condition, fit, flaws, and why someone should buy this. Include measurements if possible."
              />
            </Field>
          </div>
        </section>

        {/* Category & Brand */}
        <section className="grid gap-5 sm:grid-cols-2">
          <Field label="Category *">
            <Select
              required
              value={form.categoryId}
              onChange={(e) => {
                updateField('categoryId', e.target.value);
                updateField('subcategoryId', '');
              }}
              options={catOptions}
              placeholder="Select category"
            />
          </Field>
          {subcategories.length > 0 && (
            <Field label="Subcategory">
              <Select
                value={form.subcategoryId}
                onChange={(e) => updateField('subcategoryId', e.target.value)}
                options={subcategories.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Select subcategory"
              />
            </Field>
          )}
          <Field label="Brand">
            <Select
              value={form.brandId}
              onChange={(e) => updateField('brandId', e.target.value)}
              options={brandOptions}
              placeholder="Select brand"
            />
          </Field>
        </section>

        {/* Condition & Gender */}
        <section className="grid gap-5 sm:grid-cols-3">
          <Field label="Condition *">
            <Select
              required
              value={form.condition}
              onChange={(e) => updateField('condition', e.target.value)}
              options={CONDITIONS}
            />
          </Field>
          <Field label="Gender">
            <Select
              value={form.gender}
              onChange={(e) => updateField('gender', e.target.value)}
              options={GENDERS}
            />
          </Field>
          <Field label="Size">
            <Input
              value={form.size}
              onChange={(e) => updateField('size', e.target.value)}
              placeholder="e.g. M, UK 9, 32x34"
            />
          </Field>
        </section>

        {/* Color, Material, Weight */}
        <section className="grid gap-5 sm:grid-cols-3">
          <Field label="Color">
            <Input
              value={form.color}
              onChange={(e) => updateField('color', e.target.value)}
              placeholder="e.g. Black, Navy"
            />
          </Field>
          <Field label="Material">
            <Input
              value={form.material}
              onChange={(e) => updateField('material', e.target.value)}
              placeholder="e.g. Cotton, Leather"
            />
          </Field>
          <Field label="Weight (grams)">
            <Input
              type="number"
              min={0}
              value={form.weightGrams}
              onChange={(e) => updateField('weightGrams', e.target.value)}
              placeholder="e.g. 500"
            />
          </Field>
        </section>

        {/* Pricing */}
        <section className="grid gap-5 sm:grid-cols-3">
          <Field label="Price (₹) *">
            <Input
              required
              type="number"
              min={1}
              value={form.priceRupees}
              onChange={(e) => updateField('priceRupees', e.target.value)}
              placeholder="e.g. 2499"
            />
          </Field>
          <Field label="Original price (₹)">
            <Input
              type="number"
              min={0}
              value={form.originalRupees}
              onChange={(e) => updateField('originalRupees', e.target.value)}
              placeholder="e.g. 4999"
            />
          </Field>
          <Field label="Quantity">
            <Input
              type="number"
              min={1}
              max={9999}
              value={form.quantity}
              onChange={(e) => updateField('quantity', e.target.value)}
            />
          </Field>
        </section>

        {/* Tags */}
        <section>
          <Field label="Tags (comma separated)">
            <Input
              value={form.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              placeholder="e.g. sneakers, nike, streetwear, vintage"
            />
          </Field>
        </section>

        {/* Shipping */}
        <section className="rounded-2xl border border-ink-100 bg-white p-5">
          <h3 className="text-sm font-semibold text-ink-900">Shipping & returns</h3>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 hover:bg-ink-50 has-[:checked]:border-brand-300">
              <input
                type="checkbox"
                checked={form.allowsShipping}
                onChange={(e) => updateField('allowsShipping', e.target.checked)}
                className="accent-brand-600"
              />
              <span className="text-sm text-ink-700">Allow shipping</span>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 hover:bg-ink-50 has-[:checked]:border-brand-300">
              <input
                type="checkbox"
                checked={form.allowsPickup}
                onChange={(e) => updateField('allowsPickup', e.target.checked)}
                className="accent-brand-600"
              />
              <span className="text-sm text-ink-700">Allow local pickup</span>
            </label>
          </div>
          <div className="mt-4 sm:w-1/3">
            <Field label="Return policy (days)">
              <Select
                value={form.returnPolicyDays}
                onChange={(e) => updateField('returnPolicyDays', e.target.value)}
                options={[
                  { value: '0', label: 'No returns' },
                  { value: '3', label: '3 days' },
                  { value: '7', label: '7 days' },
                  { value: '14', label: '14 days' },
                  { value: '30', label: '30 days' },
                ]}
              />
            </Field>
          </div>
        </section>

        {/* Location */}
        <section className="grid gap-5 sm:grid-cols-2">
          <Field label="City">
            <Input
              value={form.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="e.g. Mumbai"
            />
          </Field>
          <Field label="State">
            <Input
              value={form.state}
              onChange={(e) => updateField('state', e.target.value)}
              placeholder="e.g. Maharashtra"
            />
          </Field>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push('/listings')}
            className="order-3 sm:order-1"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            My listings
          </Button>
          <div className="flex gap-3 order-2">
            <Button
              type="button"
              variant="outline"
              onClick={saveDraft}
              disabled={loading}
            >
              <Save className="mr-2 h-4 w-4" />
              Save draft
            </Button>
            <Button
              type="submit"
              variant="brand"
              size="lg"
              disabled={loading || images.length === 0}
            >
              {loading ? (
                'Publishing…'
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Publish
                </>
              )}
            </Button>
          </div>
        </div>
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
