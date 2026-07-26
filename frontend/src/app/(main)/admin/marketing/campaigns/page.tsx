'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Megaphone,
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
  Calendar,
  GripVertical,
  Percent,
  IndianRupee,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

type CampaignStatus = 'draft' | 'active';
type CampaignType =
  | 'FLASH_SALE'
  | 'SEASONAL'
  | 'FESTIVAL'
  | 'BRAND'
  | 'CATEGORY'
  | 'LANDING';

type ComputedStatus = 'active' | 'scheduled' | 'ended';

type Campaign = {
  id: string;
  name: string;
  type: CampaignType;
  description: string;
  startDate: string;
  endDate: string;
  priority: number;
  status: CampaignStatus;
  discountPercentage: number;
  minPurchase: number;
  createdAt: string;
};

type FormData = {
  name: string;
  type: CampaignType | '';
  description: string;
  startDate: string;
  endDate: string;
  priority: number;
  status: CampaignStatus;
  discountPercentage: number;
  minPurchase: number;
};

const EMPTY_FORM: FormData = {
  name: '',
  type: '',
  description: '',
  startDate: '',
  endDate: '',
  priority: 5,
  status: 'draft',
  discountPercentage: 0,
  minPurchase: 0,
};

const CAMPAIGN_TYPES: { value: CampaignType; label: string }[] = [
  { value: 'FLASH_SALE', label: 'Flash Sale' },
  { value: 'SEASONAL', label: 'Seasonal' },
  { value: 'FESTIVAL', label: 'Festival' },
  { value: 'BRAND', label: 'Brand' },
  { value: 'CATEGORY', label: 'Category' },
  { value: 'LANDING', label: 'Landing' },
];

const TYPE_FILTERS = ['ALL', ...CAMPAIGN_TYPES.map((t) => t.value)] as const;

const STORAGE_KEY = 'admin_campaigns';

const SEED_CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    name: 'Summer Fest Sale',
    type: 'SEASONAL',
    description: 'End of season clearance on summer collections',
    startDate: '2026-07-01',
    endDate: '2026-08-15',
    priority: 8,
    status: 'active',
    discountPercentage: 40,
    minPurchase: 999,
    createdAt: '2026-06-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Diwali Dhamaka',
    type: 'FESTIVAL',
    description: 'Festival special discounts across all categories',
    startDate: '2026-10-15',
    endDate: '2026-11-05',
    priority: 10,
    status: 'active',
    discountPercentage: 50,
    minPurchase: 499,
    createdAt: '2026-06-20T10:00:00Z',
  },
  {
    id: '3',
    name: 'Nike Flash Sale',
    type: 'BRAND',
    description: '24-hour flash sale on Nike footwear',
    startDate: '2026-07-25',
    endDate: '2026-07-26',
    priority: 9,
    status: 'draft',
    discountPercentage: 30,
    minPurchase: 0,
    createdAt: '2026-07-20T10:00:00Z',
  },
  {
    id: '4',
    name: 'Weekend Blockbuster',
    type: 'FLASH_SALE',
    description: 'Weekend flash sale with extra 20% off',
    startDate: '2026-06-20',
    endDate: '2026-06-22',
    priority: 7,
    status: 'active',
    discountPercentage: 20,
    minPurchase: 299,
    createdAt: '2026-06-18T10:00:00Z',
  },
  {
    id: '5',
    name: 'Winter Collection Launch',
    type: 'LANDING',
    description: 'Preview landing page for upcoming winter collection',
    startDate: '2026-09-01',
    endDate: '2026-10-30',
    priority: 6,
    status: 'draft',
    discountPercentage: 15,
    minPurchase: 1499,
    createdAt: '2026-05-01T10:00:00Z',
  },
];

function getComputedStatus(c: Campaign): ComputedStatus {
  const now = new Date();
  const start = new Date(c.startDate);
  const end = new Date(c.endDate);
  if (c.status === 'draft') return 'scheduled';
  if (now < start) return 'scheduled';
  if (now > end) return 'ended';
  return 'active';
}

const statusConfig: Record<ComputedStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-800',
  },
  scheduled: {
    label: 'Scheduled',
    className: 'bg-amber-100 text-amber-800',
  },
  ended: {
    label: 'Ended',
    className: 'bg-ink-100 text-ink-500',
  },
};

const typeVariantMap: Record<CampaignType, 'brand' | 'default' | 'outline' | 'success'> = {
  FLASH_SALE: 'brand',
  SEASONAL: 'success',
  FESTIVAL: 'brand',
  BRAND: 'default',
  CATEGORY: 'outline',
  LANDING: 'default',
};

function loadCampaigns(): Campaign[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveCampaigns(campaigns: Campaign[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
  } catch {}
}

let nextId = 6;

function generateId(): string {
  return String(nextId++);
}

export default function AdminCampaignsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    const stored = loadCampaigns();
    if (stored.length === 0) {
      saveCampaigns(SEED_CAMPAIGNS);
      setCampaigns(SEED_CAMPAIGNS);
    } else {
      setCampaigns(stored);
    }
    setLoading(false);
  }, [user, router]);

  const filtered = typeFilter === 'ALL'
    ? campaigns
    : campaigns.filter((c) => c.type === typeFilter);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      type: c.type,
      description: c.description,
      startDate: c.startDate,
      endDate: c.endDate,
      priority: c.priority,
      status: c.status,
      discountPercentage: c.discountPercentage,
      minPurchase: c.minPurchase,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function handleSave() {
    setFormError(null);
    if (!form.name.trim()) { setFormError('Campaign name is required'); return; }
    if (!form.type) { setFormError('Campaign type is required'); return; }
    if (!form.startDate) { setFormError('Start date is required'); return; }
    if (!form.endDate) { setFormError('End date is required'); return; }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setFormError('End date must be after start date');
      return;
    }
    if (form.discountPercentage < 0 || form.discountPercentage > 100) {
      setFormError('Discount must be between 0 and 100');
      return;
    }

    setSaving(true);
    setCampaigns((prev) => {
      const now = new Date().toISOString();
      if (editingId) {
        const updated = prev.map((c) =>
          c.id === editingId
            ? { ...c, ...form, type: form.type as CampaignType, createdAt: c.createdAt }
            : c,
        );
        saveCampaigns(updated);
        return updated;
      }
      const created: Campaign = {
        id: generateId(),
        ...form,
        type: form.type as CampaignType,
        createdAt: now,
      };
      const next = [...prev, created];
      saveCampaigns(next);
      return next;
    });
    setSaving(false);
    closeDialog();
  }

  function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    setCampaigns((prev) => {
      const next = prev.filter((c) => c.id !== deleteId);
      saveCampaigns(next);
      return next;
    });
    setDeleting(false);
    setDeleteId(null);
  }

  function resetSeed() {
    saveCampaigns(SEED_CAMPAIGNS);
    setCampaigns(SEED_CAMPAIGNS);
  }

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Megaphone className="h-6 w-6 text-brand-600" />
            Campaign Management
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {campaigns.length} campaigns &middot;{' '}
            {campaigns.filter((c) => getComputedStatus(c) === 'active').length} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetSeed}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Reset Data
          </Button>
          <Button variant="brand" size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
              typeFilter === t
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-ink-100 text-ink-600 hover:bg-ink-200',
            )}
          >
            {t === 'ALL' ? 'ALL' : t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Megaphone className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No campaigns found</p>
          <p className="mt-1 text-sm text-ink-400">
            {typeFilter !== 'ALL'
              ? 'No campaigns match the selected type'
              : 'Create your first marketing campaign'}
          </p>
          {typeFilter === 'ALL' && (
            <Button variant="brand" size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Campaign
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/50">
                  <th className="px-4 py-3 font-medium text-ink-600">Campaign</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Type</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Duration</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Discount</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Priority</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Status</th>
                  <th className="w-24 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {filtered.map((c) => {
                  const computed = getComputedStatus(c);
                  const cfg = statusConfig[computed];
                  return (
                    <tr key={c.id} className="transition hover:bg-ink-50/50">
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium text-ink-900">{c.name}</span>
                          {c.description && (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-ink-400">
                              {c.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={typeVariantMap[c.type]}>
                          {c.type.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-ink-600">
                          <Calendar className="h-3.5 w-3.5 text-ink-400" />
                          <span>
                            {new Date(c.startDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                            {' — '}
                            {new Date(c.endDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-ink-900">
                          <Percent className="h-3.5 w-3.5 text-ink-400" />
                          {c.discountPercentage}%
                        </span>
                        {c.minPurchase > 0 && (
                          <span className="ml-2 text-xs text-ink-400">
                            min <IndianRupee className="inline h-3 w-3" />
                            {c.minPurchase}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <GripVertical className="h-3.5 w-3.5 text-ink-300" />
                          <span
                            className={cn(
                              'font-semibold',
                              c.priority >= 8
                                ? 'text-red-600'
                                : c.priority >= 5
                                  ? 'text-amber-600'
                                  : 'text-ink-500',
                            )}
                          >
                            {c.priority}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                            cfg.className,
                          )}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(c.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((c) => {
              const computed = getComputedStatus(c);
              const cfg = statusConfig[computed];
              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-ink-900">{c.name}</span>
                        <Badge variant={typeVariantMap[c.type]} className="text-[10px]">
                          {c.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      {c.description && (
                        <p className="mt-0.5 text-xs text-ink-400 line-clamp-2">
                          {c.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(c.startDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {' — '}
                          {new Date(c.endDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          {c.discountPercentage}% off
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <GripVertical className="h-3 w-3" />
                          Priority {c.priority}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          cfg.className,
                        )}
                      >
                        {cfg.label}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(c.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog}>
        <DialogHeader>{editingId ? 'Edit Campaign' : 'Create Campaign'}</DialogHeader>
        <DialogBody className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Campaign Name</label>
            <Input
              placeholder="e.g. Summer Fest Sale"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Type</label>
            <Select
              options={CAMPAIGN_TYPES}
              placeholder="Select campaign type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as CampaignType })}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Description</label>
            <Textarea
              placeholder="Brief description of the campaign"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Start Date</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">End Date</label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                Discount %
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="e.g. 30"
                value={form.discountPercentage}
                onChange={(e) =>
                  setForm({ ...form, discountPercentage: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                Min. Purchase (₹)
              </label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 499"
                value={form.minPurchase}
                onChange={(e) =>
                  setForm({ ...form, minPurchase: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                Priority (1-10)
              </label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Status</label>
              <Select
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'active', label: 'Active' },
                ]}
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as CampaignStatus })
                }
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button variant="brand" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update Campaign' : 'Create Campaign'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => { if (!deleting) setDeleteId(null); }}>
        <DialogHeader>Delete Campaign</DialogHeader>
        <DialogBody>
          <p className="text-sm text-ink-700">
            Are you sure you want to delete{' '}
            <span className="font-medium text-ink-900">
              {campaigns.find((c) => c.id === deleteId)?.name}
            </span>
            ? This action cannot be undone.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setDeleteId(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
