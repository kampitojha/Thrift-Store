'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Store,
  Star,
  Package,
  ExternalLink,
  CheckSquare,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';

type Seller = {
  id: string;
  storeName: string;
  storeDescription?: string;
  storeLogoUrl?: string | null;
  isVerified: boolean;
  verificationStatus: string;
  totalSales: number;
  totalEarnings: number;
  rating?: number;
  reviewCount?: number;
  _count?: {
    products?: number;
  };
  owner: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    email: string;
  };
  createdAt: string;
};

type SellersResponse = {
  data: Seller[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const VERIFICATION_OPTIONS = [
  { value: '', label: 'All Verification' },
  { value: 'UNVERIFIED', label: 'Unverified' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const VERIFICATION_STYLES: Record<string, string> = {
  UNVERIFIED: 'bg-ink-100 text-ink-600',
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function AdminSellersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkConfirmDialog, setShowBulkConfirmDialog] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchSellers = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (search) params.set('search', search);
        if (verificationFilter) params.set('verification', verificationFilter);
        const res = await apiClient.get<SellersResponse>(`/admin/sellers?${params}`);
        setSellers(res.data);
        setMeta(res.meta);
      } catch {
        setError('Failed to load sellers. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [search, verificationFilter],
  );

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    fetchSellers();
  }, [user, router, fetchSellers]);

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === sellers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sellers.map((s) => s.id)));
    }
  };

  const executeBulkAction = async () => {
    if (!bulkAction) return;
    setBulkLoading(true);
    try {
      await apiClient.post('/admin/sellers/bulk', {
        sellerIds: Array.from(selected),
        action: bulkAction,
      });
      setSelected(new Set());
      setBulkAction('');
      setShowBulkConfirmDialog(false);
      await fetchSellers(meta.page);
    } catch { /* ignore */ } finally { setBulkLoading(false); }
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Seller Management</h1>
          <p className="mt-1 text-sm text-ink-500">
            {meta.total} registered sellers on the platform
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            placeholder="Search by store name or owner..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          Search
        </Button>
        <Select
          options={VERIFICATION_OPTIONS}
          value={verificationFilter}
          onChange={(e) => setVerificationFilter(e.target.value)}
          className="w-auto min-w-[160px]"
        />
        <Button variant="outline" size="sm" onClick={() => fetchSellers(meta.page)}>
          Refresh
        </Button>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
          <CheckSquare className="h-4 w-4 text-brand-600" />
          <span className="text-sm font-medium text-brand-700">
            {selected.size} seller{selected.size > 1 ? 's' : ''} selected
          </span>
          <Select
            options={[
              { value: 'verify', label: 'Verify' },
              { value: 'suspend', label: 'Suspend' },
              { value: 'delete', label: 'Delete' },
            ]}
            placeholder="Bulk Actions"
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="w-auto min-w-[150px]"
          />
          <Button
            variant="brand"
            size="sm"
            disabled={!bulkAction || bulkLoading}
            onClick={() => {
              if (bulkAction === 'delete') {
                setShowBulkConfirmDialog(true);
              } else {
                executeBulkAction();
              }
            }}
          >
            {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Apply
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-ink-100 animate-pulse" />
          ))}
        </div>
      ) : sellers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Store className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No sellers found</p>
          <p className="mt-1 text-sm text-ink-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/50">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === sellers.length && sellers.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-ink-300 accent-brand-600"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-ink-600">Store</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Owner</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Verification</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Sales</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Rating</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Products</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sellers.map((seller) => (
                  <tr
                    key={seller.id}
                    className={cn(
                      'border-b border-ink-50 transition hover:bg-ink-50/50 cursor-pointer',
                      selected.has(seller.id) && 'bg-brand-50/30',
                    )}
                    onClick={() => router.push(`/admin/sellers/${seller.id}`)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(seller.id)}
                        onChange={() => toggleSelect(seller.id)}
                        className="h-4 w-4 rounded border-ink-300 accent-brand-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                          {seller.storeLogoUrl ? (
                            <img src={seller.storeLogoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-ink-500">
                              {seller.storeName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-ink-900 truncate">{seller.storeName}</p>
                          {seller.isVerified && (
                            <Badge variant="success" className="mt-0.5 text-[10px]">Verified</Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-ink-900">{seller.owner.displayName || seller.owner.username}</p>
                      <p className="text-xs text-ink-400">{seller.owner.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', VERIFICATION_STYLES[seller.verificationStatus] || 'bg-ink-100 text-ink-600')}>
                        {seller.verificationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-ink-900">
                      {formatINR(seller.totalSales)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-medium text-ink-900">
                          {seller.rating?.toFixed(1) || '—'}
                        </span>
                        {seller.reviewCount != null && (
                          <span className="text-xs text-ink-400">({seller.reviewCount})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-600">
                      {seller._count?.products || 0}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/admin/sellers/${seller.id}`}>
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {sellers.map((seller) => (
              <Link
                key={seller.id}
                href={`/admin/sellers/${seller.id}`}
                className="block rounded-2xl border border-ink-100 bg-white p-4 shadow-soft transition hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                    {seller.storeLogoUrl ? (
                      <img src={seller.storeLogoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-ink-500">
                        {seller.storeName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-ink-900 truncate">{seller.storeName}</p>
                      {seller.isVerified && (
                        <Badge variant="success" className="text-[10px]">Verified</Badge>
                      )}
                    </div>
                    <p className="text-xs text-ink-400 truncate">{seller.owner.displayName || seller.owner.username}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 font-medium', VERIFICATION_STYLES[seller.verificationStatus] || 'bg-ink-100 text-ink-600')}>
                    {seller.verificationStatus}
                  </span>
                  <div className="flex items-center gap-3 text-ink-500">
                    <span>{formatINR(seller.totalSales)} sales</span>
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {seller.rating?.toFixed(1) || '—'}
                    </span>
                    <span>{seller._count?.products || 0} items</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => fetchSellers(meta.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-ink-500">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page >= meta.totalPages}
            onClick={() => fetchSellers(meta.page + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Bulk Confirm Dialog */}
      <Dialog open={showBulkConfirmDialog} onClose={() => setShowBulkConfirmDialog(false)}>
        <DialogHeader>Confirm Bulk Action</DialogHeader>
        <DialogBody>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  This action cannot be undone
                </p>
                <p className="mt-1 text-sm text-red-700">
                  Are you sure you want to delete {selected.size} seller{selected.size > 1 ? 's' : ''}?
                </p>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowBulkConfirmDialog(false)}>Cancel</Button>
          <Button variant="destructive" onClick={executeBulkAction} disabled={bulkLoading}>
            {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Delete {selected.size} seller{selected.size > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
