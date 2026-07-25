'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Send, Save, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { UploadArea, UploadImage } from '@/components/ui/upload-area';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function EditListingPage() {
  const router = useRouter();
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [images, setImages] = useState<UploadImage[]>([]);
  const [form, setForm] = useState({
    title: '', description: '', categoryId: '', subcategoryId: '',
    brandId: '', condition: 'GOOD', gender: 'UNISEX',
    color: '', material: '', size: '', weightGrams: '',
    priceRupees: '', originalRupees: '', quantity: '1',
    tags: '', allowsPickup: false, allowsShipping: true,
    returnPolicyDays: '7', city: '', state: '',
  });

  useEffect(() => {
    Promise.all([
      apiClient.get<CategoryNode[]>('/categories'),
      apiClient.get<Array<{ id: string; name: string }>>('/categories/brands'),
    ]).then(([cats, brs]) => {
      setCategories(cats);
      setBrands(brs);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id || !user) return;
    apiClient.get<Record<string, unknown>>(`/products/${id}`).then((product: any) => {
      setForm({
        title: product.title || '',
        description: product.description || '',
        categoryId: product.category?.id || product.categoryId || '',
        subcategoryId: '',
        brandId: product.brand?.id || product.brandId || '',
        condition: product.condition || 'GOOD',
        gender: product.gender || 'UNISEX',
        color: product.color || '',
        material: product.material || '',
        size: product.size || '',
        weightGrams: product.weightGrams ? String(product.weightGrams) : '',
        priceRupees: product.pricePaise ? String(Math.round(product.pricePaise / 100)) : '',
        originalRupees: product.originalPricePaise ? String(Math.round(product.originalPricePaise / 100)) : '',
        quantity: String(product.quantity || 1),
        tags: product.tags?.join(', ') || '',
        allowsPickup: product.allowsPickup || false,
        allowsShipping: product.allowsShipping ?? true,
        returnPolicyDays: String(product.returnPolicyDays || 7),
        city: product.city || '',
        state: product.state || '',
      });
      if (product.media?.length) {
        setImages(
          product.media.map((m: any, i: number) => ({
            id: m.id || `img-${i}`,
            url: m.url,
            isPrimary: m.isPrimary || i === 0,
          })),
        );
      }
      setLoading(false);
    }).catch(() => {
      setError('Listing not found');
      setLoading(false);
    });
  }, [id, user]);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const saveListing = async (publishAfter = false) => {
    if (!user) return;
    const mediaUrls = images.map((i) => i.url).filter(Boolean);
    await apiClient.patch(`/products/${id}`, {
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
      originalPricePaise: form.originalRupees ? Math.round(Number(form.originalRupees) * 100) : undefined,
      quantity: Number(form.quantity) || 1,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      mediaUrls,
      allowsPickup: form.allowsPickup,
      allowsShipping: form.allowsShipping,
      returnPolicyDays: Number(form.returnPolicyDays) || 7,
      city: form.city || undefined,
      state: form.state || undefined,
      weightGrams: form.weightGrams ? Number(form.weightGrams) : undefined,
      publish: publishAfter,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveListing(false);
      router.push('/listings');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;
  if (loading) return <div className="container-page py-10"><Skeleton className="h-96 rounded-2xl" /></div>;
  if (error) return <div className="container-page py-24 text-center"><p className="text-red-600">{error}</p></div>;

  const subcategories = categories.find((c) => c.id === form.categoryId)?.children || [];

  return (
    <div className="container-page max-w-4xl py-10">
      <button
        type="button"
        onClick={() => router.push('/listings')}
        className="mb-6 flex items-center gap-2 text-sm text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to listings
      </button>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Edit listing</h1>

      <form onSubmit={handleSave} className="mt-8 space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Photos</h2>
          <UploadArea images={images} onChange={setImages} maxFiles={12} />
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Title"><Input required maxLength={120} value={form.title} onChange={(e) => updateField('title', e.target.value)} /></Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description"><Textarea required minLength={20} maxLength={5000} value={form.description} onChange={(e) => updateField('description', e.target.value)} /></Field>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          <Field label="Category">
            <Select value={form.categoryId} onChange={(e) => { updateField('categoryId', e.target.value); updateField('subcategoryId', ''); }} options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select category" />
          </Field>
          {subcategories.length > 0 && (
            <Field label="Subcategory">
              <Select value={form.subcategoryId} onChange={(e) => updateField('subcategoryId', e.target.value)} options={subcategories.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select subcategory" />
            </Field>
          )}
          <Field label="Brand">
            <Select value={form.brandId} onChange={(e) => updateField('brandId', e.target.value)} options={brands.map((b) => ({ value: b.id, label: b.name }))} placeholder="Select brand" />
          </Field>
        </section>

        <section className="grid gap-5 sm:grid-cols-3">
          <Field label="Condition"><Select value={form.condition} onChange={(e) => updateField('condition', e.target.value)} options={CONDITIONS} /></Field>
          <Field label="Gender"><Select value={form.gender} onChange={(e) => updateField('gender', e.target.value)} options={GENDERS} /></Field>
          <Field label="Size"><Input value={form.size} onChange={(e) => updateField('size', e.target.value)} placeholder="e.g. M, UK 9" /></Field>
          <Field label="Color"><Input value={form.color} onChange={(e) => updateField('color', e.target.value)} /></Field>
          <Field label="Material"><Input value={form.material} onChange={(e) => updateField('material', e.target.value)} /></Field>
          <Field label="Weight (g)"><Input type="number" value={form.weightGrams} onChange={(e) => updateField('weightGrams', e.target.value)} /></Field>
        </section>

        <section className="grid gap-5 sm:grid-cols-3">
          <Field label="Price (₹)"><Input required type="number" min={1} value={form.priceRupees} onChange={(e) => updateField('priceRupees', e.target.value)} /></Field>
          <Field label="Original price (₹)"><Input type="number" value={form.originalRupees} onChange={(e) => updateField('originalRupees', e.target.value)} /></Field>
          <Field label="Quantity"><Input type="number" min={1} value={form.quantity} onChange={(e) => updateField('quantity', e.target.value)} /></Field>
        </section>

        <Field label="Tags"><Input value={form.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="comma, separated" /></Field>

        <section className="rounded-2xl border border-ink-100 bg-white p-5">
          <h3 className="text-sm font-semibold">Shipping & returns</h3>
          <div className="mt-4 flex gap-5">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allowsShipping} onChange={(e) => updateField('allowsShipping', e.target.checked)} className="accent-brand-600" /> Shipping</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allowsPickup} onChange={(e) => updateField('allowsPickup', e.target.checked)} className="accent-brand-600" /> Pickup</label>
          </div>
          <div className="mt-4 w-1/3">
            <Field label="Returns">
              <Select value={form.returnPolicyDays} onChange={(e) => updateField('returnPolicyDays', e.target.value)} options={[
                { value: '0', label: 'No returns' }, { value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' },
              ]} />
            </Field>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          <Field label="City"><Input value={form.city} onChange={(e) => updateField('city', e.target.value)} /></Field>
          <Field label="State"><Input value={form.state} onChange={(e) => updateField('state', e.target.value)} /></Field>
        </section>

        {error && <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}

        <div className="flex gap-3 border-t border-ink-100 pt-6">
          <Button type="submit" variant="brand" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />{saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/listings')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-medium text-ink-600">{label}</label>{children}</div>;
}
