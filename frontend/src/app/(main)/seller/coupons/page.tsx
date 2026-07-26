'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Loader2, Plus, Search, Copy, CheckCircle, XCircle, Trash2, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

type Coupon = {
  id: string; code: string; type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
  value: number; minOrderPaise?: number; maxDiscountPaise?: number;
  usageLimit?: number; perUserLimit?: number; usedCount: number;
  isActive: boolean; startsAt?: string; endsAt?: string;
  createdAt: string;
};

const COUPON_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'FIXED', label: 'Fixed amount' },
  { value: 'FREE_SHIPPING', label: 'Free shipping' },
];

export default function CouponsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '', type: 'PERCENTAGE' as string, value: '',
    minOrderPaise: '', maxDiscountPaise: '', usageLimit: '', perUserLimit: '',
    startsAt: '', endsAt: '',
  });

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search) params.set('q', search);
      const res = await apiClient.get<{ data: Coupon[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(`/sellers/coupons?${params}`);
      setCoupons(res.data ?? []);
      setTotalPages(res.meta?.totalPages ?? 1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchCoupons();
  }, [user, fetchCoupons, router]);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', type: 'PERCENTAGE', value: '', minOrderPaise: '', maxDiscountPaise: '', usageLimit: '', perUserLimit: '', startsAt: '', endsAt: '' });
    setShowDialog(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code, type: c.type, value: String(c.value),
      minOrderPaise: c.minOrderPaise ? String(c.minOrderPaise) : '',
      maxDiscountPaise: c.maxDiscountPaise ? String(c.maxDiscountPaise) : '',
      usageLimit: c.usageLimit ? String(c.usageLimit) : '',
      perUserLimit: c.perUserLimit ? String(c.perUserLimit) : '',
      startsAt: c.startsAt ? new Date(c.startsAt).toISOString().slice(0, 16) : '',
      endsAt: c.endsAt ? new Date(c.endsAt).toISOString().slice(0, 16) : '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        code: form.code.toUpperCase(),
        type: form.type,
        value: parseInt(form.value, 10),
      };
      if (form.minOrderPaise) payload.minOrderPaise = parseInt(form.minOrderPaise, 10);
      if (form.maxDiscountPaise) payload.maxDiscountPaise = parseInt(form.maxDiscountPaise, 10);
      if (form.usageLimit) payload.usageLimit = parseInt(form.usageLimit, 10);
      if (form.perUserLimit) payload.perUserLimit = parseInt(form.perUserLimit, 10);
      if (form.startsAt) payload.startsAt = new Date(form.startsAt).toISOString();
      if (form.endsAt) payload.endsAt = new Date(form.endsAt).toISOString();

      if (editing) {
        await apiClient.patch(`/sellers/coupons/${editing.id}`, payload);
      } else {
        await apiClient.post('/sellers/coupons', payload);
      }
      setShowDialog(false);
      await fetchCoupons();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await apiClient.delete(`/sellers/coupons/${id}`);
      await fetchCoupons();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to delete coupon');
    }
  };

  const handleToggleActive = async (c: Coupon) => {
    try {
      await apiClient.patch(`/sellers/coupons/${c.id}`, { isActive: !c.isActive });
      await fetchCoupons();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to update coupon');
    }
  };

  const copyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Coupons</h1>
          <p className="text-sm text-ink-500">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="brand" onClick={openCreate}><Plus className="h-4 w-4" />Create coupon</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search coupons..." className="pl-9 h-10" />
        </div>
      </div>

      {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-ink-100 animate-pulse" />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-16 text-center">
          <Tag className="mx-auto h-12 w-12 text-ink-300" />
          <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">No coupons yet</h3>
          <p className="mt-2 text-sm text-ink-500">Create discounts to attract more buyers.</p>
          <Button variant="brand" className="mt-6" onClick={openCreate}><Plus className="h-4 w-4" />Create coupon</Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {coupons.map((c) => (
              <div key={c.id} className="rounded-2xl border border-ink-100 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-brand-50 p-3">
                      <Tag className="h-5 w-5 text-brand-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="rounded-lg bg-ink-50 px-2.5 py-1 font-mono text-sm font-semibold text-ink-900">{c.code}</code>
                        <button onClick={() => copyCode(c.code, c.id)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100">
                          {copiedId === c.id ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <p className="text-sm text-ink-700 mt-1">
                        {c.type === 'PERCENTAGE' ? `${c.value}% off` : c.type === 'FIXED' ? `${formatINR(c.value * 100)} off` : 'Free shipping'}
                        {c.minOrderPaise && ` · Min: ${formatINR(c.minOrderPaise)}`}
                        {c.maxDiscountPaise && c.type === 'PERCENTAGE' && ` · Max: ${formatINR(c.maxDiscountPaise)}`}
                      </p>
                      <p className="text-xs text-ink-400 mt-0.5">
                        Used {c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''} times
                        {c.perUserLimit ? ` · ${c.perUserLimit} per user` : ''}
                        {c.endsAt && ` · Expires ${new Date(c.endsAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleToggleActive(c)} className={cn('rounded-full px-3 py-1 text-xs font-medium transition', c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-ink-100 text-ink-500')}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(c.id)} className="rounded-lg p-2 text-red-400 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-ink-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <DialogHeader><h2 className="font-display text-lg font-semibold">{editing ? 'Edit coupon' : 'Create coupon'}</h2></DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Code</label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. SUMMER20" disabled={!!editing} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Discount type</label>
              <Select options={COUPON_TYPES} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">{form.type === 'PERCENTAGE' ? 'Percentage off' : form.type === 'FIXED' ? 'Amount off (in paise)' : ''}</label>
              {form.type !== 'FREE_SHIPPING' && (
                <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 50000'} />
              )}
              {form.type === 'FREE_SHIPPING' && <p className="text-sm text-ink-400">Free shipping on orders.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Min order (paise)</label>
                <Input type="number" value={form.minOrderPaise} onChange={(e) => setForm({ ...form, minOrderPaise: e.target.value })} placeholder="Optional" />
              </div>
              {form.type === 'PERCENTAGE' && (
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Max discount (paise)</label>
                  <Input type="number" value={form.maxDiscountPaise} onChange={(e) => setForm({ ...form, maxDiscountPaise: e.target.value })} placeholder="Optional" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Usage limit</label>
                <Input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="Unlimited" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Per user limit</label>
                <Input type="number" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} placeholder="Unlimited" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Start date</label>
                <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">End date</label>
                <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
          <Button variant="brand" onClick={handleSave} disabled={saving || !form.code || !form.value}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
