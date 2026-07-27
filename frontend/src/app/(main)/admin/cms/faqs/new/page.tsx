'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

type Faq = {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
};

type FaqsResponse = {
  items: Faq[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const CATEGORIES = [
  { value: 'General', label: 'General' },
  { value: 'Orders', label: 'Orders' },
  { value: 'Shipping', label: 'Shipping' },
  { value: 'Returns', label: 'Returns' },
  { value: 'Payments', label: 'Payments' },
  { value: 'Account', label: 'Account' },
  { value: 'Selling', label: 'Selling' },
];

export default function CreateFaqPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [form, setForm] = useState({
    question: '',
    answer: '',
    category: '',
    sortOrder: 0,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
    }
  }, [user, router]);

  const handleSave = async () => {
    if (!form.question.trim()) { setFormError('Question is required'); return; }
    if (!form.answer.trim()) { setFormError('Answer is required'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        question: form.question,
        answer: form.answer,
        category: form.category || undefined,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      };
      await apiClient.post('/admin/cms/faqs', body);
      router.push('/admin/cms/faqs');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create FAQ';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => router.push('/admin/cms/faqs')} className="mb-6">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to FAQs
      </Button>

      <h1 className="font-display text-2xl font-semibold text-ink-900 mb-8">Create FAQ</h1>

      {formError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Question *</label>
          <Input
            value={form.question}
            onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
            placeholder="Frequently asked question"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Answer *</label>
          <Textarea
            value={form.answer}
            onChange={(e) => setForm((prev) => ({ ...prev, answer: e.target.value }))}
            placeholder="Answer (HTML supported)"
            rows={6}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Category</label>
            <Select
              options={[
                { value: '', label: 'No category' },
                ...CATEGORIES,
              ]}
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Sort Order</label>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
              min={0}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              form.isActive ? 'bg-emerald-500' : 'bg-ink-200',
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                form.isActive ? 'translate-x-5' : 'translate-x-0',
              )}
            />
          </button>
          <span className="text-sm text-ink-700">
            {form.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => router.push('/admin/cms/faqs')}>
            Cancel
          </Button>
          <Button variant="brand" onClick={handleSave} disabled={saving || !form.question.trim() || !form.answer.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Create FAQ'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
