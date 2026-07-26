'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  LayoutGrid,
  List,
  Star,
  Tag,
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

type AdminProduct = {
  id: string;
  title: string;
  slug: string;
  pricePaise: number;
  originalPricePaise?: number | null;
  status: string;
  condition?: string;
  thumbnailUrl?: string | null;
  category?: { id: string; name: string } | null;
  seller?: {
    id: string;
    username: string;
    displayName?: string | null;
    isVerified?: boolean;
  };
  createdAt: string;
  _count?: {
    reviews?: number;
  };
};

type ProductsResponse = {
  data: AdminProduct[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'HIDDEN', label: 'Hidden' },
  { value: 'SOLD', label: 'Sold' },
];

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PENDING_REVIEW: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-red-100 text-red-800',
  HIDDEN: 'bg-ink-100 text-ink-600',
  SOLD: 'bg-brand-100 text-brand-800',
};

export default function AdminProductsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkConfirmDialog, setShowBulkConfirmDialog] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchProducts = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (search) params.set('search', search);
        if (statusFilter) params.set('status', statusFilter);
        const res = await apiClient.get<ProductsResponse>(`/admin/products?${params}`);
        setProducts(res.data);
        setMeta(res.meta);
      } catch {
        setError('Failed to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter],
  );

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    fetchProducts();
  }, [user, router, fetchProducts]);

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
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  };

  const executeBulkAction = async () => {
    if (!bulkAction) return;
    setBulkLoading(true);
    try {
      await apiClient.post('/admin/products/bulk', {
        productIds: Array.from(selected),
        action: bulkAction,
      });
      setSelected(new Set());
      setBulkAction('');
      setShowBulkConfirmDialog(false);
      await fetchProducts(meta.page);
    } catch { /* ignore */ } finally { setBulkLoading(false); }
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Product Management</h1>
          <p className="mt-1 text-sm text-ink-500">
            {meta.total} products on the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setView('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            placeholder="Search products..."
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
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-auto min-w-[160px]"
        />
        <Button variant="outline" size="sm" onClick={() => fetchProducts(meta.page)}>
          Refresh
        </Button>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
          <CheckSquare className="h-4 w-4 text-brand-600" />
          <span className="text-sm font-medium text-brand-700">
            {selected.size} product{selected.size > 1 ? 's' : ''} selected
          </span>
          <Select
            options={[
              { value: 'approve', label: 'Approve' },
              { value: 'reject', label: 'Reject' },
              { value: 'hide', label: 'Hide' },
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
        view === 'list' ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-ink-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-ink-100 animate-pulse" />
            ))}
          </div>
        )
      ) : products.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Package className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No products found</p>
          <p className="mt-1 text-sm text-ink-400">Try adjusting your search or filters</p>
        </div>
      ) : view === 'list' ? (
        <>
          {/* List view */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/50">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === products.length && products.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-ink-300 accent-brand-600"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-ink-600">Product</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Price</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Seller</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Category</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Status</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className={cn(
                      'border-b border-ink-50 transition hover:bg-ink-50/50 cursor-pointer',
                      selected.has(product.id) && 'bg-brand-50/30',
                    )}
                    onClick={() => router.push(`/admin/products/${product.id}`)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="h-4 w-4 rounded border-ink-300 accent-brand-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                          {product.thumbnailUrl ? (
                            <img src={product.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-4 w-4 text-ink-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-ink-900 truncate max-w-[250px]">{product.title}</p>
                          {product.condition && (
                            <p className="text-xs text-ink-400">{product.condition}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-semibold text-ink-900">{formatINR(product.pricePaise)}</span>
                        {product.originalPricePaise && product.originalPricePaise > product.pricePaise && (
                          <span className="ml-1.5 text-xs text-ink-400 line-through">{formatINR(product.originalPricePaise)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-ink-900">{product.seller?.displayName || product.seller?.username || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {product.category?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[product.status] || 'bg-ink-100 text-ink-600')}>
                        {product.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/admin/products/${product.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="space-y-3 md:hidden">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}`}
                className="block rounded-2xl border border-ink-100 bg-white p-4 shadow-soft transition hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                    {product.thumbnailUrl ? (
                      <img src={product.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-5 w-5 text-ink-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink-900 truncate">{product.title}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink-900">{formatINR(product.pricePaise)}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_STYLES[product.status] || 'bg-ink-100 text-ink-600')}>
                        {product.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-ink-400 mt-0.5">{product.seller?.displayName || product.seller?.username || '—'}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Grid view */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}`}
                className="group rounded-2xl border border-ink-100 bg-white shadow-soft overflow-hidden transition hover:shadow-md"
              >
                <div className="aspect-[4/5] overflow-hidden bg-ink-100">
                  {product.thumbnailUrl ? (
                    <img
                      src={product.thumbnailUrl}
                      alt={product.title}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-10 w-10 text-ink-300" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-ink-900 truncate">{product.title}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-sm font-bold text-ink-900">{formatINR(product.pricePaise)}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_STYLES[product.status] || 'bg-ink-100 text-ink-600')}>
                      {product.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-ink-400">
                    <span className="truncate">{product.seller?.displayName || product.seller?.username || '—'}</span>
                    {product.category && <span className="truncate">{product.category.name}</span>}
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
            onClick={() => fetchProducts(meta.page - 1)}
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
            onClick={() => fetchProducts(meta.page + 1)}
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
                  Are you sure you want to delete {selected.size} product{selected.size > 1 ? 's' : ''}?
                </p>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowBulkConfirmDialog(false)}>Cancel</Button>
          <Button variant="destructive" onClick={executeBulkAction} disabled={bulkLoading}>
            {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Delete {selected.size} product{selected.size > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
