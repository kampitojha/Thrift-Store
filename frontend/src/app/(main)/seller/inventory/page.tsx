'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, Package, Filter, SlidersHorizontal, ChevronDown, Loader2, MoreHorizontal, Edit, Copy, Archive, Trash2, Eye, EyeOff, Upload, Download, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type Product = {
  id: string; title: string; slug: string; pricePaise: number; originalPricePaise?: number | null;
  condition: string; status: string; quantity: number; size?: string; color?: string; city?: string;
  favoriteCount: number; viewCount: number; thumbnailUrl?: string | null; brandName?: string | null;
  createdAt: string;
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_REVIEW', label: 'Pending review' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const STATUS_BADGES: Record<string, string> = {
  ACTIVE: 'success', DRAFT: 'default', PENDING_REVIEW: 'brand', RESERVED: 'default',
  SOLD: 'default', ARCHIVED: 'outline', REJECTED: 'default',
};

export default function InventoryPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [conditionFilter, setConditionFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '24');
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('sort', sortBy);
      const res = await apiClient.get<{ data: Product[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(`/products/me/listings?${params}`);
      setProducts(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sortBy]);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchProducts();
  }, [user, fetchProducts, router]);

  const handleBulkAction = async () => {
    if (!selected.length || !bulkAction) return;
    setBulkProcessing(true);
    try {
      const actions: Record<string, string> = {
        delete: 'DELETE', archive: 'ARCHIVE', activate: 'ACTIVE', draft: 'DRAFT',
      };
      await Promise.all(selected.map((id) => {
        switch (bulkAction) {
          case 'delete': return apiClient.delete(`/products/${id}`).catch(() => {});
          case 'archive': return apiClient.post(`/products/${id}/publish`, { publish: false }).catch(() => {});
          case 'activate': return apiClient.post(`/products/${id}/publish`, { publish: true }).catch(() => {});
          case 'draft': return apiClient.post(`/products/${id}/publish`, { publish: false }).catch(() => {});
          default: return Promise.resolve();
        }
      }));
      setSelected([]);
      setBulkAction('');
      fetchProducts();
    } catch { /* ignore */ }
    setBulkProcessing(false);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selected.length === products.length) setSelected([]);
    else setSelected(products.map((p) => p.id));
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Inventory</h1>
          <p className="text-sm text-ink-500">{total} product{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/seller/reports?tab=inventory"><Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Export</Button></Link>
          <Link href="/sell"><Button variant="brand" size="sm"><Plus className="mr-2 h-4 w-4" />New product</Button></Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search products..." className="pl-9 h-10" />
        </div>
        <Select options={STATUS_OPTIONS} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} />
        <Select options={[{ value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }, { value: 'price_asc', label: 'Price: Low to High' }, { value: 'price_desc', label: 'Price: High to Low' }, { value: 'popular', label: 'Most Popular' }]}
          value={sortBy} onChange={(e) => setSortBy(e.target.value)} />
        <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}><Filter className="mr-2 h-4 w-4" />Filters</Button>
        {selected.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-ink-500">{selected.length} selected</span>
            <Select options={[{ value: '', label: 'Bulk actions' }, { value: 'delete', label: 'Delete' }, { value: 'archive', label: 'Archive' }, { value: 'activate', label: 'Activate' }, { value: 'draft', label: 'Move to draft' }]}
              value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} />
            <Button variant="brand" size="sm" onClick={handleBulkAction} disabled={!bulkAction || bulkProcessing}>
              {bulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
            </Button>
          </div>
        )}
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="mb-4 p-4 rounded-2xl border border-ink-100 bg-white flex flex-wrap gap-4">
          <Select options={[{ value: '', label: 'All conditions' }, { value: 'NEW_WITH_TAGS', label: 'New with tags' }, { value: 'NEW_WITHOUT_TAGS', label: 'New without tags' }, { value: 'LIKE_NEW', label: 'Like new' }, { value: 'GOOD', label: 'Good' }, { value: 'FAIR', label: 'Fair' }, { value: 'POOR', label: 'Poor' }]}
            value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} />
          <Input type="number" placeholder="Min price" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-28 h-10" />
          <Input type="number" placeholder="Max price" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-28 h-10" />
        </div>
      )}

      {/* Error state */}
      {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {/* Empty state */}
      {!loading && products.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-16 text-center">
          <Package className="mx-auto h-12 w-12 text-ink-300" />
          <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">No products yet</h3>
          <p className="mt-2 text-sm text-ink-500">List your first item to start selling.</p>
          <Link href="/sell"><Button variant="brand" className="mt-6"><Plus className="mr-2 h-4 w-4" />List your first product</Button></Link>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 animate-pulse">
              <div className="h-16 w-16 rounded-xl bg-ink-100" />
              <div className="flex-1 space-y-2"><div className="h-4 w-48 rounded bg-ink-100" /><div className="h-3 w-32 rounded bg-ink-100" /></div>
              <div className="h-4 w-20 rounded bg-ink-100" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-2xl border border-ink-100 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/50">
                    <th className="w-10 px-4 py-3"><input type="checkbox" checked={selected.length === products.length && products.length > 0} onChange={toggleSelectAll} className="h-4 w-4 rounded border-ink-300" /></th>
                    <th className="text-left px-4 py-3 font-medium text-ink-600">Product</th>
                    <th className="text-left px-4 py-3 font-medium text-ink-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-ink-600">Price</th>
                    <th className="text-left px-4 py-3 font-medium text-ink-600">Qty</th>
                    <th className="text-left px-4 py-3 font-medium text-ink-600">Views</th>
                    <th className="text-left px-4 py-3 font-medium text-ink-600">Favs</th>
                    <th className="w-20 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-ink-50 hover:bg-ink-50/50 transition">
                      <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} className="h-4 w-4 rounded border-ink-300" /></td>
                      <td className="px-4 py-3">
                        <Link href={`/product/${p.slug}`} className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                            {p.thumbnailUrl ? <img src={p.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-ink-400">No img</div>}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-ink-900 truncate max-w-[200px]">{p.title}</p>
                            <p className="text-xs text-ink-500">{p.brandName || 'No brand'} · {p.condition?.replace(/_/g, ' ')}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3"><Badge variant={(STATUS_BADGES[p.status] || 'default') as any}>{p.status.replace(/_/g, ' ')}</Badge></td>
                      <td className="px-4 py-3 font-medium text-ink-900">{formatINR(p.pricePaise)}</td>
                      <td className="px-4 py-3">
                        <span className={cn(p.quantity <= 5 && p.quantity > 0 ? 'text-amber-700 font-medium' : p.quantity === 0 ? 'text-red-700 font-medium' : '')}>
                          {p.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-500">{p.viewCount}</td>
                      <td className="px-4 py-3 text-ink-500">{p.favoriteCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/edit/${p.id}`} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><Edit className="h-4 w-4" /></Link>
                          <button onClick={() => { apiClient.post(`/products/${p.id}/duplicate`).then(fetchProducts).catch(() => {}); }} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><Copy className="h-4 w-4" /></button>
                          <button onClick={() => { apiClient.delete(`/products/${p.id}`).then(fetchProducts).catch(() => {}); }} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
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
    </div>
  );
}
