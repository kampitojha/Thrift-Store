'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  HelpCircle,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Search,
  Eye,
  EyeOff,
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
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';

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
  { value: '', label: 'All Categories' },
  { value: 'General', label: 'General' },
  { value: 'Orders', label: 'Orders' },
  { value: 'Shipping', label: 'Shipping' },
  { value: 'Returns', label: 'Returns' },
  { value: 'Payments', label: 'Payments' },
  { value: 'Account', label: 'Account' },
  { value: 'Selling', label: 'Selling' },
];

const CATEGORY_COLORS: Record<string, string> = {
  General: 'bg-ink-100 text-ink-700',
  Orders: 'bg-blue-100 text-blue-800',
  Shipping: 'bg-amber-100 text-amber-800',
  Returns: 'bg-red-100 text-red-800',
  Payments: 'bg-emerald-100 text-emerald-800',
  Account: 'bg-purple-100 text-purple-800',
  Selling: 'bg-brand-100 text-brand-800',
};

const INITIAL_FORM = {
  question: '',
  answer: '',
  category: '',
  sortOrder: 0,
  isActive: true,
};

export default function AdminCMSFaqsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteQuestion, setDeleteQuestion] = useState('');

  const fetchFaqs = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await apiClient.get<FaqsResponse>(`/admin/cms/faqs?${params}`);
      setFaqs(res.items);
      setMeta(res.meta);
    } catch {
      setError('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    fetchFaqs();
  }, [user, router, fetchFaqs]);

  const openCreate = () => {
    setEditingFaq(null);
    setForm(INITIAL_FORM);
    setDialogOpen(true);
  };

  const openEdit = (faq: Faq) => {
    setEditingFaq(faq);
    setForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || '',
      sortOrder: faq.sortOrder,
      isActive: faq.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        question: form.question,
        answer: form.answer,
        category: form.category || undefined,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      };
      if (editingFaq) {
        await apiClient.patch(`/admin/cms/faqs/${editingFaq.id}`, body);
      } else {
        await apiClient.post('/admin/cms/faqs', body);
      }
      setDialogOpen(false);
      fetchFaqs(meta.page);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiClient.delete(`/admin/cms/faqs/${deleteId}`);
      setDeleteId(null);
      setDeleteQuestion('');
      fetchFaqs(meta.page);
    } catch {
      /* ignore */
    }
  };

  const toggleActive = async (faq: Faq) => {
    try {
      await apiClient.patch(`/admin/cms/faqs/${faq.id}`, { isActive: !faq.isActive });
      fetchFaqs(meta.page);
    } catch {
      /* ignore */
    }
  };

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === faqs.length - 1)
    ) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const newFaqs = [...faqs];
    const temp = newFaqs[index];
    newFaqs[index] = newFaqs[swapIndex];
    newFaqs[swapIndex] = temp;

    setFaqs(newFaqs);

    try {
      await apiClient.post('/admin/cms/faqs/reorder', {
        ids: newFaqs.map((f) => f.id),
      });
    } catch {
      fetchFaqs(meta.page);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') fetchFaqs();
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <HelpCircle className="h-6 w-6 text-brand-600" />
            FAQ Management
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {meta.total} total FAQs &middot; Manage frequently asked questions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchFaqs(meta.page)}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="brand" size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New FAQ
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            placeholder="Search by question..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchFaqs()}>
          Search
        </Button>
        <Select
          options={CATEGORIES}
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); }}
          className="w-auto min-w-[150px]"
        />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchFaqs()}>
            Try Again
          </Button>
        </div>
      ) : faqs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No FAQs found</p>
          <p className="mt-1 text-sm text-ink-400">
            {search || categoryFilter ? 'Try adjusting your filters or search terms' : 'Create your first FAQ to get started'}
          </p>
          {!search && !categoryFilter && (
            <Button variant="brand" size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create FAQ
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
                  <th className="w-10 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-ink-500">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Question</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Answer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Category</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-ink-500">Status</th>
                  <th className="w-28 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {faqs.map((faq, index) => (
                  <tr key={faq.id} className="hover:bg-ink-50/50 transition">
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveItem(index, 'up')}
                          disabled={index === 0}
                          className={cn(
                            'rounded p-0.5 transition',
                            index === 0 ? 'text-ink-200 cursor-not-allowed' : 'text-ink-400 hover:text-ink-700 hover:bg-ink-100',
                          )}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs text-ink-400">{faq.sortOrder}</span>
                        <button
                          type="button"
                          onClick={() => moveItem(index, 'down')}
                          disabled={index === faqs.length - 1}
                          className={cn(
                            'rounded p-0.5 transition',
                            index === faqs.length - 1 ? 'text-ink-200 cursor-not-allowed' : 'text-ink-400 hover:text-ink-700 hover:bg-ink-100',
                          )}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-900 max-w-xs truncate">{faq.question}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-ink-500 text-xs max-w-sm truncate">
                        {faq.answer.replace(/<[^>]*>/g, '').substring(0, 100)}
                        {faq.answer.length > 100 ? '...' : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {faq.category ? (
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          CATEGORY_COLORS[faq.category] || 'bg-ink-100 text-ink-700',
                        )}>
                          {faq.category}
                        </span>
                      ) : (
                        <span className="text-ink-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleActive(faq)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition',
                          faq.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-ink-100 text-ink-500 hover:bg-ink-200',
                        )}
                      >
                        {faq.isActive ? (
                          <><Eye className="h-3 w-3" /> Active</>
                        ) : (
                          <><EyeOff className="h-3 w-3" /> Inactive</>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(faq)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setDeleteId(faq.id); setDeleteQuestion(faq.question); }}
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
            {faqs.map((faq, index) => (
              <div key={faq.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-ink-900 truncate">{faq.question}</p>
                      <button
                        type="button"
                        onClick={() => toggleActive(faq)}
                        className={cn(
                          'shrink-0 rounded-full p-1 transition',
                          faq.isActive ? 'text-emerald-600' : 'text-ink-400',
                        )}
                      >
                        {faq.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-ink-500 line-clamp-2">
                      {faq.answer.replace(/<[^>]*>/g, '').substring(0, 120)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {faq.category && (
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-medium',
                          CATEGORY_COLORS[faq.category] || 'bg-ink-100 text-ink-700',
                        )}>
                          {faq.category}
                        </span>
                      )}
                      <span className="text-[10px] text-ink-400">Sort: {faq.sortOrder}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className={cn(
                        'rounded p-0.5 transition',
                        index === 0 ? 'text-ink-200 cursor-not-allowed' : 'text-ink-400 hover:text-ink-700',
                      )}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[10px] text-ink-400">{faq.sortOrder}</span>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === faqs.length - 1}
                      className={cn(
                        'rounded p-0.5 transition',
                        index === faqs.length - 1 ? 'text-ink-200 cursor-not-allowed' : 'text-ink-400 hover:text-ink-700',
                      )}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(faq)}>
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setDeleteId(faq.id); setDeleteQuestion(faq.question); }}
                  >
                    <Trash2 className="mr-1 h-3 w-3 text-red-500" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => fetchFaqs(meta.page - 1)}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-ink-500">Page {meta.page} of {meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => fetchFaqs(meta.page + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader>{editingFaq ? 'Edit FAQ' : 'Create FAQ'}</DialogHeader>
        <DialogBody>
          <div className="space-y-4">
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
                    ...CATEGORIES.slice(1),
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
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="brand"
            onClick={handleSave}
            disabled={saving || !form.question || !form.answer}
          >
            {saving ? 'Saving...' : editingFaq ? 'Update FAQ' : 'Create FAQ'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => { setDeleteId(null); setDeleteQuestion(''); }}>
        <DialogHeader>Delete FAQ</DialogHeader>
        <DialogBody>
          <p className="text-sm text-ink-600">
            Are you sure you want to delete this FAQ? This action cannot be undone.
          </p>
          {deleteQuestion && (
            <p className="mt-2 text-sm font-medium text-ink-900">&ldquo;{deleteQuestion}&rdquo;</p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDeleteId(null); setDeleteQuestion(''); }}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
