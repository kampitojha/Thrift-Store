'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Loader2, Plus, Edit, Trash2, Check, ArrowLeft } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';

type Address = {
  id: string; label?: string; fullName: string; phone: string; line1: string; line2?: string;
  city: string; state: string; postalCode: string; country: string; isDefault: boolean; isBilling: boolean;
};

const emptyForm = {
  label: '', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'IN', isDefault: false, isBilling: false,
};

export default function AddressesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [delConfirm, setDelConfirm] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try { setAddresses(await apiClient.get<Address[]>('/addresses')); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load addresses'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchAddresses();
  }, [user, fetchAddresses, router]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (a: Address) => { setEditing(a); setForm({ label: a.label ?? '', fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? '', city: a.city, state: a.state, postalCode: a.postalCode, country: a.country, isDefault: a.isDefault, isBilling: a.isBilling }); setShowForm(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) { await apiClient.patch(`/addresses/${editing.id}`, form); }
      else { await apiClient.post('/addresses', form); }
      setShowForm(false);
      await fetchAddresses();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to save address'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await apiClient.delete(`/addresses/${id}`); setDelConfirm(null); await fetchAddresses(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to delete'); }
  };

  const setDefault = async (id: string) => {
    try { await apiClient.post(`/addresses/${id}/default`, {}); await fetchAddresses(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to set default'); }
  };

  if (!user) return null;

  return (
    <div className="container-page py-10 max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-700 mb-4"><ArrowLeft className="h-4 w-4" />Back to settings</Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Addresses</h1>
          <p className="mt-1 text-sm text-ink-500">{addresses.length} saved address{addresses.length !== 1 ? 'es' : ''}</p>
        </div>
        <Button variant="brand" onClick={openCreate}><Plus className="h-4 w-4" />Add address</Button>
      </div>

      {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-ink-100 animate-pulse" />)}</div>
      ) : addresses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <MapPin className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No addresses saved</p>
          <p className="mt-2 text-sm text-ink-500">Add a shipping address to checkout faster.</p>
          <Button variant="brand" className="mt-6" onClick={openCreate}><Plus className="h-4 w-4" />Add address</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((addr) => (
            <div key={addr.id} className={cn('rounded-2xl border p-5', addr.isDefault ? 'border-brand-200 bg-brand-50/30' : 'border-ink-100 bg-white')}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-ink-900">{addr.fullName}</span>
                    {addr.label && <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-600">{addr.label}</span>}
                    {addr.isDefault && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] text-brand-700">Default</span>}
                    {addr.isBilling && <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-600">Billing</span>}
                  </div>
                  <div className="mt-1 text-sm text-ink-600 space-y-0.5">
                    <p>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                    <p>{addr.city}, {addr.state} - {addr.postalCode}</p>
                    <p className="text-ink-400">{addr.phone}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!addr.isDefault && <Button variant="ghost" size="sm" onClick={() => setDefault(addr.id)}><Check className="h-4 w-4" /></Button>}
                  <Button variant="ghost" size="sm" onClick={() => openEdit(addr)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDelConfirm(addr.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <DialogHeader><h2 className="font-display text-lg font-semibold">{editing ? 'Edit address' : 'Add address'}</h2></DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="block text-sm font-medium text-ink-700 mb-1">Full name</label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-ink-700 mb-1">Phone</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-ink-700 mb-1">Label (optional)</label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Home, Work..." /></div>
            </div>
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Address line 1</label><Input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Address line 2 (optional)</label><Input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-sm font-medium text-ink-700 mb-1">City</label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-ink-700 mb-1">State</label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-ink-700 mb-1">Pincode</label><Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-brand-600" /><span className="text-sm text-ink-700">Set as default</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isBilling} onChange={(e) => setForm({ ...form, isBilling: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-brand-600" /><span className="text-sm text-ink-700">Also billing</span></label>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button variant="brand" onClick={handleSave} disabled={saving || !form.fullName || !form.phone || !form.line1 || !form.city || !form.state || !form.postalCode}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{editing ? 'Update' : 'Save'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!delConfirm} onClose={() => setDelConfirm(null)}>
        <DialogHeader><h2 className="font-display text-lg font-semibold">Delete address?</h2></DialogHeader>
        <DialogBody><p className="text-sm text-ink-500">This action cannot be undone.</p></DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDelConfirm(null)}>Cancel</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => delConfirm && handleDelete(delConfirm)}>Delete</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
