'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Edit3, Trash2, Copy, Eye,
  EyeOff, CheckCircle, Archive, RotateCcw, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { apiClient, ProductLike, PaginationMeta } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_REVIEW', label: 'Pending review' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'REJECTED', label: 'Rejected' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
];

export default function ListingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [listings, setListings] = useState<ProductLike[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchListings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        limit: 24,
        sort,
      };
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get<{ data: ProductLike[]; meta: PaginationMeta }>(
        `/products/me/listings?${new URLSearchParams(
          Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]),
        ).toString()}`,
      );
      setListings(res.data);
      setMeta(res.meta);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [user, page, sort, statusFilter]);

  useEffect(() => { if (user) fetchListings(); }, [user, fetchListings]);

  useEffect(() => { if (!user) router.push('/sign-in'); }, [user, router]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/products/${deleteId}`);
      setDeleteId(null);
      fetchListings();
    } catch { /* ignore */ } finally { setDeleting(false); }
  };

  const handleDuplicate = async (id: string) => {
    await apiClient.post(`/products/${id}/duplicate`);
    fetchListings();
  };

  const handlePublishToggle = async (id: string, currentStatus: string) => {
    const publish = currentStatus === 'DRAFT' || currentStatus === 'ARCHIVED';
    await apiClient.post(`/products/${id}/publish`, { publish });
    fetchListings();
  };

  const handleMarkSold = async (id: string) => {
    await apiClient.post(`/products/${id}/mark-sold`);
    fetchListings();
  };

  const handleRestore = async (id: string) => {
    await apiClient.post(`/products/${id}/restore`);
    fetchListings();
  };

  if (!user) return null;

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Seller hub</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">My listings</h1>
          <p className="mt-1 text-sm text-ink-500">
            {meta ? `${meta.total} listing${meta.total !== 1 ? 's' : ''}` : 'Manage your inventory'}
          </p>
        </div>
        <Link href="/sell">
          <Button variant="brand">
            <Plus className="mr-2 h-4 w-4" />
            New listing
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings…"
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          options={STATUS_OPTIONS}
          className="w-40"
        />
        <Select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          options={SORT_OPTIONS}
          className="w-36"
        />
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="mt-16 rounded-3xl border border-dashed border-ink-200 py-20 text-center">
          <p className="text-lg font-medium text-ink-800">No listings yet</p>
          <p className="mt-2 text-sm text-ink-500">Create your first listing to start selling.</p>
          <Link href="/sell">
            <Button variant="brand" className="mt-6">
              <Plus className="mr-2 h-4 w-4" />
              Create listing
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings
              .filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()))
              .map((product) => (
                <div
                  key={product.id}
                  className="group relative rounded-2xl border border-ink-100 bg-white shadow-soft transition hover:shadow-lift"
                >
                  <Link href={`/product/${product.slug}`} className="block">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-t-2xl bg-ink-100">
                      <img
                        src={product.thumbnailUrl || 'https://placehold.co/600x750/f2e8db/5d362a?text=Reloom'}
                        alt={product.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                  </Link>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-900">{product.title}</p>
                        <p className="mt-1 text-sm font-semibold text-ink-900">
                          {formatINR(product.pricePaise)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          product.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : product.status === 'DRAFT'
                              ? 'bg-ink-100 text-ink-600'
                              : product.status === 'SOLD'
                                ? 'bg-blue-100 text-blue-800'
                                : product.status === 'RESERVED'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-ink-100 text-ink-500'
                        }`}
                      >
                        {product.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {product.status !== 'SOLD' && product.status !== 'ARCHIVED' && (
                        <button
                          type="button"
                          onClick={() => handlePublishToggle(product.id, product.status || 'DRAFT')}
                          className="rounded-lg bg-ink-100 p-1.5 text-ink-500 hover:bg-ink-200 hover:text-ink-800"
                          aria-label={product.status === 'ACTIVE' ? 'Unpublish' : 'Publish'}
                        >
                          {product.status === 'ACTIVE' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <Link
                        href={`/listings/${product.id}/edit`}
                        className="rounded-lg bg-ink-100 p-1.5 text-ink-500 hover:bg-ink-200 hover:text-ink-800"
                        aria-label="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(product.id)}
                        className="rounded-lg bg-ink-100 p-1.5 text-ink-500 hover:bg-ink-200 hover:text-ink-800"
                        aria-label="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {product.status === 'ACTIVE' && (
                        <button
                          type="button"
                          onClick={() => handleMarkSold(product.id)}
                          className="rounded-lg bg-ink-100 p-1.5 text-ink-500 hover:bg-ink-200 hover:text-ink-800"
                          aria-label="Mark sold"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {product.status === 'ARCHIVED' && (
                        <button
                          type="button"
                          onClick={() => handleRestore(product.id)}
                          className="rounded-lg bg-ink-100 p-1.5 text-ink-500 hover:bg-ink-200 hover:text-ink-800"
                          aria-label="Restore"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteId(product.id)}
                        className="rounded-lg bg-ink-100 p-1.5 text-ink-500 hover:bg-red-100 hover:text-red-600"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={!meta.hasPrev}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-ink-500">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={!meta.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogHeader>Delete listing</DialogHeader>
        <DialogBody>
          <p className="text-sm text-ink-600">
            Are you sure? This will archive the listing. Buyers will no longer see it.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
