'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tag, ChevronLeft, ChevronRight, RefreshCw, Percent, Clock, Plus, Pencil, Trash2, Copy, CheckCircle, XCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';

type Coupon = {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
  value: number;
  usedCount: number;
  usageLimit?: number | null;
  perUserLimit: number;
  minOrderPaise?: number | null;
  maxDiscountPaise?: number | null;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  createdBy?: { id: string; username: string } | null;
};

type CouponsResponse = {
  data: Coupon[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const COUPON_TYPES = ['PERCENTAGE', 'FIXED', 'FREE_SHIPPING'] as const;

export default function AdminCouponsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [deleteCouponId, setDeleteCouponId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '', type: 'PERCENTAGE' as string, value: '', minOrderPaise: '', maxDiscountPaise: '',
    usageLimit: '', perUserLimit: '1', startsAt: '', endsAt: '', isActive: true,
  });

  const fetchCoupons = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      const res = await apiClient.get<CouponsResponse>(`/admin/coupons?${params}`);
      setCoupons(res.data);
      setMeta(res.meta);
    } catch {
      setError('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) { router.push('/'); return; }
    fetchCoupons();
  }, [user, router, fetchCoupons]);

  const resetForm = () => setForm({ code: '', type: 'PERCENTAGE', value: '', minOrderPaise: '', maxDiscountPaise: '', usageLimit: '', perUserLimit: '1', startsAt: '', endsAt: '', isActive: true });

  const handleCreate = async () => {
    setSaving(true);
    try {
      await apiClient.post('/admin/coupons', {
        code: form.code, type: form.type, value: parseInt(form.value),
        minOrderPaise: form.minOrderPaise ? parseInt(form.minOrderPaise) : undefined,
        maxDiscountPaise: form.maxDiscountPaise ? parseInt(form.maxDiscountPaise) : undefined,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : undefined,
        perUserLimit: parseInt(form.perUserLimit),
        startsAt: form.startsAt || undefined, endsAt: form.endsAt || undefined,
        isActive: form.isActive,
      });
      setShowCreate(false); resetForm(); fetchCoupons();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editCoupon) return;
    setSaving(true);
    try {
      await apiClient.patch(`/admin/coupons/${editCoupon.id}`, {
        ...(form.code ? { code: form.code } : {}),
        type: form.type, value: parseInt(form.value),
        minOrderPaise: form.minOrderPaise ? parseInt(form.minOrderPaise) : null,
        maxDiscountPaise: form.maxDiscountPaise ? parseInt(form.maxDiscountPaise) : null,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
        perUserLimit: parseInt(form.perUserLimit),
        startsAt: form.startsAt || undefined, endsAt: form.endsAt || undefined,
        isActive: form.isActive,
      });
      setEditCoupon(null); resetForm(); fetchCoupons();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteCouponId) return;
    try {
      await apiClient.delete(`/admin/coupons/${deleteCouponId}`);
      setDeleteCouponId(null); fetchCoupons();
    } catch { /* ignore */ }
  };

  const openEdit = (c: Coupon) => {
    setEditCoupon(c);
    setForm({
      code: c.code, type: c.type, value: String(c.value),
      minOrderPaise: c.minOrderPaise ? String(c.minOrderPaise) : '',
      maxDiscountPaise: c.maxDiscountPaise ? String(c.maxDiscountPaise) : '',
      usageLimit: c.usageLimit ? String(c.usageLimit) : '',
      perUserLimit: String(c.perUserLimit),
      startsAt: c.startsAt ? c.startsAt.slice(0, 16) : '',
      endsAt: c.endsAt ? c.endsAt.slice(0, 16) : '',
      isActive: c.isActive,
    });
  };

  if (!user) return null;

  const formContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-ink-700 mb-1 block">Code</label>
          <Input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20" />
        </div>
        <div>
          <label className="text-sm font-medium text-ink-700 mb-1 block">Type</label>
          <select className="flex h-11 w-full rounded-xl border border-ink-200 bg-white px-4 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200" value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}>
            {COUPON_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-ink-700 mb-1 block">Value {form.type === 'PERCENTAGE' ? '(%)' : '(in paise)'}</label>
        <Input type="number" min="1" value={form.value} onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))} placeholder={form.type === 'PERCENTAGE' ? '20' : '50000'} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-ink-700 mb-1 block">Min Order (paise)</label>
          <Input type="number" min="0" value={form.minOrderPaise} onChange={(e) => setForm(f => ({ ...f, minOrderPaise: e.target.value }))} placeholder="Optional" />
        </div>
        <div>
          <label className="text-sm font-medium text-ink-700 mb-1 block">Max Discount (paise)</label>
          <Input type="number" min="0" value={form.maxDiscountPaise} onChange={(e) => setForm(f => ({ ...f, maxDiscountPaise: e.target.value }))} placeholder="Optional" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-ink-700 mb-1 block">Usage Limit</label>
          <Input type="number" min="0" value={form.usageLimit} onChange={(e) => setForm(f => ({ ...f, usageLimit: e.target.value }))} placeholder="Unlimited" />
        </div>
        <div>
          <label className="text-sm font-medium text-ink-700 mb-1 block">Per User Limit</label>
          <Input type="number" min="1" value={form.perUserLimit} onChange={(e) => setForm(f => ({ ...f, perUserLimit: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-ink-700 mb-1 block">Start Date</label>
          <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm(f => ({ ...f, startsAt: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-ink-700 mb-1 block">End Date</label>
          <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm(f => ({ ...f, endsAt: e.target.value }))} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-ink-700">Active</label>
        <button
          type="button"
          role="switch"
          aria-checked={form.isActive}
          onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
            form.isActive ? 'bg-brand-600' : 'bg-ink-200',
          )}
        >
          <span className={cn('pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition', form.isActive ? 'translate-x-5' : 'translate-x-0')} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Tag className="h-6 w-6 text-brand-600" />
            Coupon Management
          </h1>
          <p className="mt-1 text-sm text-ink-500">Manage discount coupons and promotional codes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="brand" size="sm" onClick={() => { resetForm(); setShowCreate(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Create Coupon
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchCoupons(meta.page)}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-ink-100 animate-pulse" />)}</div>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Tag className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchCoupons()}>Try Again</Button>
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Clock className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No coupons found</p>
          <Button variant="brand" size="sm" className="mt-4" onClick={() => { resetForm(); setShowCreate(true); }}>Create your first coupon</Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-2xl border border-ink-100 bg-white shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Type / Value</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Usage</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Min Order</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Dates</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-ink-50/50 transition">
                      <td className="px-4 py-3"><span className="font-mono font-bold text-ink-900">{coupon.code}</span></td>
                      <td className="px-4 py-3">
                        <Badge variant={coupon.type === 'PERCENTAGE' ? 'brand' : coupon.type === 'FIXED' ? 'outline' : 'default'}>
                          {coupon.type === 'PERCENTAGE' ? <><Percent className="h-3 w-3 mr-1" />{coupon.value}%</> : coupon.type === 'FIXED' ? formatINR(coupon.value) : 'Free Shipping'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-ink-700">
                        <span className="font-medium">{coupon.usedCount}</span>
                        {coupon.usageLimit != null && <span className="text-ink-400"> / {coupon.usageLimit}</span>}
                      </td>
                      <td className="px-4 py-3 text-ink-600">{coupon.minOrderPaise ? formatINR(coupon.minOrderPaise) : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', coupon.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-ink-100 text-ink-500')}>
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-500 whitespace-nowrap">
                        <span>From {new Date(coupon.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        <span> · Until {new Date(coupon.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(coupon)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => setDeleteCouponId(coupon.id)} className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {coupons.map((coupon) => (
              <div key={coupon.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-ink-900">{coupon.code}</span>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', coupon.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-ink-100 text-ink-500')}>
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <Badge variant={coupon.type === 'PERCENTAGE' ? 'brand' : 'outline'}>
                        {coupon.type === 'PERCENTAGE' ? `${coupon.value}% off` : coupon.type === 'FIXED' ? `${formatINR(coupon.value)} off` : 'Free Shipping'}
                      </Badge>
                      <span className="text-ink-500">Used {coupon.usedCount}{coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : ''}</span>
                    </div>
                    <div className="mt-1 text-xs text-ink-400">
                      {new Date(coupon.startsAt).toLocaleDateString()} - {new Date(coupon.endsAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(coupon)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteCouponId(coupon.id)} className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => fetchCoupons(meta.page - 1)}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-ink-500">Page {meta.page} of {meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => fetchCoupons(meta.page + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogHeader>Create Coupon</DialogHeader>
        <DialogBody>{formContent}</DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button variant="brand" onClick={handleCreate} disabled={saving || !form.code || !form.value}>{saving ? 'Creating...' : 'Create'}</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!editCoupon} onClose={() => setEditCoupon(null)}>
        <DialogHeader>Edit Coupon</DialogHeader>
        <DialogBody>{formContent}</DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditCoupon(null)}>Cancel</Button>
          <Button variant="brand" onClick={handleUpdate} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!deleteCouponId} onClose={() => setDeleteCouponId(null)}>
        <DialogHeader>Delete Coupon</DialogHeader>
        <DialogBody>
          <p className="text-sm text-ink-600">Are you sure you want to delete this coupon? This action cannot be undone.</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteCouponId(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
