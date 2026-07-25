'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient, ApiError } from '@/lib/api';
import { Store, FileText, Shield, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Upload } from 'lucide-react';

const STEPS = [
  { id: 'store', label: 'Store details', icon: Store },
  { id: 'policies', label: 'Policies', icon: FileText },
  { id: 'verify', label: 'Verification', icon: Shield },
];

export default function SellerOnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [store, setStore] = useState({
    storeName: user?.displayName || user?.username || '',
    storeDescription: '',
    returnPolicy: '',
    shippingPolicy: '',
    paymentInfo: '',
  });
  const [idFile, setIdFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!user) {
    router.push('/sign-in');
    return null;
  }

  const validateStep = (): boolean => {
    if (step === 0 && !store.storeName.trim()) { setError('Store name is required'); return false; }
    setError(null);
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/sellers/store', {
        storeName: store.storeName,
        storeDescription: store.storeDescription || undefined,
        policies: {
          returnPolicy: store.returnPolicy,
          shippingPolicy: store.shippingPolicy,
          paymentInfo: store.paymentInfo,
        },
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create store');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="container-page py-10 max-w-lg mx-auto">
        <div className="rounded-3xl border border-ink-100 bg-white p-8 shadow-lift text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-7 w-7 text-emerald-700" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">You&apos;re a seller!</h1>
          <p className="mt-2 text-sm text-ink-500">
            Your store <strong className="text-ink-700">{store.storeName}</strong> is now live. List your first item to start selling.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button variant="brand" onClick={() => router.push('/sell')}>List an item</Button>
            <Button variant="outline" onClick={() => router.push('/seller/dashboard')}>Go to dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Become a seller</h1>
        <p className="mt-1 text-sm text-ink-500">Set up your store and start selling pre-loved treasures.</p>
      </div>

      {/* Progress */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              i === step ? 'bg-brand-100 text-brand-800' : i < step ? 'bg-emerald-100 text-emerald-800' : 'bg-ink-100 text-ink-500'
            }`}>
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </div>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-ink-200" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>
      )}

      <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-lift">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink-900">Store details</h2>
              <p className="mt-1 text-sm text-ink-500">This information appears on your storefront.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-600">Store name *</label>
              <Input
                required
                value={store.storeName}
                onChange={(e) => setStore((s) => ({ ...s, storeName: e.target.value }))}
                placeholder="My thrift store"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-600">Description</label>
              <Textarea
                value={store.storeDescription}
                onChange={(e) => setStore((s) => ({ ...s, storeDescription: e.target.value }))}
                placeholder="Tell shoppers what makes your store special…"
                rows={4}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink-900">Policies</h2>
              <p className="mt-1 text-sm text-ink-500">Set expectations for your buyers.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-600">Return policy</label>
              <Textarea
                value={store.returnPolicy}
                onChange={(e) => setStore((s) => ({ ...s, returnPolicy: e.target.value }))}
                placeholder="e.g. Returns accepted within 7 days…"
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-600">Shipping policy</label>
              <Textarea
                value={store.shippingPolicy}
                onChange={(e) => setStore((s) => ({ ...s, shippingPolicy: e.target.value }))}
                placeholder="e.g. Ships within 2-3 business days…"
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-600">Payment info</label>
              <Input
                value={store.paymentInfo}
                onChange={(e) => setStore((s) => ({ ...s, paymentInfo: e.target.value }))}
                placeholder="UPI ID, bank account, etc."
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink-900">Verification</h2>
              <p className="mt-1 text-sm text-ink-500">
                Upload a government-issued ID to verify your identity. This helps build trust with buyers.
              </p>
            </div>
            <div className="rounded-2xl border-2 border-dashed border-ink-200 p-8 text-center">
              {idFile ? (
                <div className="space-y-2">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                  <p className="text-sm font-medium text-ink-900">{idFile.name}</p>
                  <Button variant="outline" size="sm" onClick={() => setIdFile(null)}>Remove</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto h-8 w-8 text-ink-400" />
                  <p className="text-sm text-ink-500">Drag & drop or click to upload</p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="id-upload"
                  />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('id-upload')?.click()}>
                    Choose file
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-ink-100 pt-6">
          <Button variant="ghost" onClick={prevStep} disabled={step === 0}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="brand" onClick={nextStep}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button variant="brand" onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create store
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
