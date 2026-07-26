'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Star, Loader2, MessageSquare, ThumbsUp, Search, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';

type Review = {
  id: string; rating: number; title?: string; body?: string; mediaUrls: string[];
  isVerifiedPurchase: boolean; helpfulCount: number; createdAt: string;
  author: { id: string; username: string; avatarUrl?: string; isVerified: boolean };
  product?: { id: string; title: string; slug: string; images: string[] };
};

type ReviewsResponse = {
  data: Review[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

type DashboardData = {
  store: { slug: string; storeName: string };
  rating: number;
  totalSales: number;
};

export default function ReviewsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [ratingFilter, setRatingFilter] = useState('');
  const [replyDialog, setReplyDialog] = useState<{ open: boolean; reviewId: string; reviewTitle?: string }>({ open: false, reviewId: '', reviewTitle: '' });
  const [replyText, setReplyText] = useState('');
  const [replySaving, setReplySaving] = useState(false);
  const [storeProducts, setStoreProducts] = useState<string[]>([]);
  const [productReviewsCache, setProductReviewsCache] = useState<Record<string, Review[]>>({});

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const dash = await apiClient.get<DashboardData>('/sellers/dashboard');
      setDashboard(dash);

      const listingsParams = new URLSearchParams();
      listingsParams.set('page', '1');
      listingsParams.set('limit', '50');
      const listingsRes = await apiClient.get<{ data: { id: string; slug: string; title: string }[] }>(`/sellers/store/${dash.store.slug}/listings?${listingsParams}`);
      const listingsData = listingsRes.data ?? [];
      const productIds = listingsData.map((p: { id: string }) => p.id);
      setStoreProducts(productIds);

      const allReviews: Review[] = [];
      for (const pid of productIds) {
        try {
          const res = await apiClient.get<ReviewsResponse>(`/reviews/product/${pid}?page=1&limit=20`);
              const listing = listingsData.find((p) => p.id === pid);
              allReviews.push(...(res.data ?? []).map((r) => ({
                ...r,
                product: listing ? { ...listing, images: [] as string[] } : undefined,
              })));
        } catch {}
      }
      allReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReviews(allReviews);
      setTotal(allReviews.length);
      setTotalPages(Math.ceil(allReviews.length / 20));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchReviews();
  }, [user, fetchReviews, router]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setReplySaving(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setReplyDialog({ open: false, reviewId: '', reviewTitle: '' });
      setReplyText('');
    } catch {
      setError('Failed to send reply');
    } finally {
      setReplySaving(false);
    }
  };

  const filtered = ratingFilter
    ? reviews.filter((r) => r.rating === parseInt(ratingFilter, 10))
    : reviews;
  const paginated = filtered.slice((page - 1) * 20, page * 20);

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Reviews</h1>
          <p className="text-sm text-ink-500">{total} review{total !== 1 ? 's' : ''}{dashboard ? ` · ${dashboard.rating.toFixed(1)} avg rating` : ''}</p>
        </div>
      </div>

      {dashboard && (
        <div className="mb-6 rounded-2xl border border-ink-100 bg-white p-5">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <p className="font-display text-4xl font-bold text-ink-900">{dashboard.rating.toFixed(1)}</p>
              <div className="flex items-center gap-0.5 mt-1 justify-center">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={cn('h-3.5 w-3.5', s <= Math.round(dashboard.rating) ? 'fill-amber-400 text-amber-400' : 'text-ink-200')} />
                ))}
              </div>
              <p className="text-xs text-ink-500 mt-1">{dashboard.totalSales} sales</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((s) => {
                const count = reviews.filter((r) => r.rating === s).length;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={s} className="flex items-center gap-2 text-sm">
                    <span className="text-ink-500 w-4">{s}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <div className="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-ink-400 w-8 text-right text-xs">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reviews..." className="pl-9 h-10" />
        </div>
        <Select options={[
          { value: '', label: 'All ratings' },
          { value: '5', label: '5 stars' },
          { value: '4', label: '4 stars' },
          { value: '3', label: '3 stars' },
          { value: '2', label: '2 stars' },
          { value: '1', label: '1 star' },
        ]} value={ratingFilter} onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }} />
      </div>

      {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-ink-100 animate-pulse" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-16 text-center">
          <Star className="mx-auto h-12 w-12 text-ink-300" />
          <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">No reviews yet</h3>
          <p className="mt-2 text-sm text-ink-500">Reviews from buyers will appear here.</p>
          <Link href="/seller/inventory"><Button variant="brand" className="mt-6">View your inventory</Button></Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map((r) => (
              <div key={r.id} className="rounded-2xl border border-ink-100 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-ink-100 flex items-center justify-center text-sm font-semibold text-ink-600 shrink-0">
                      {r.author.username?.slice(0, 2).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-ink-900">{r.author.username}</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={cn('h-3 w-3', s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-200')} />
                          ))}
                        </div>
                        {r.isVerifiedPurchase && <Badge variant="success">Verified</Badge>}
                      </div>
                      {r.product && (
                        <Link href={`/products/${r.product.slug}`} className="text-xs text-brand-600 hover:underline mt-0.5 block">
                          on {r.product.title}
                        </Link>
                      )}
                      {r.title && <p className="text-sm font-medium text-ink-900 mt-1">{r.title}</p>}
                      {r.body && <p className="text-sm text-ink-600 mt-0.5">{r.body}</p>}
                      {r.mediaUrls?.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {r.mediaUrls.slice(0, 4).map((url, i) => (
                            <div key={i} className="h-14 w-14 rounded-lg bg-ink-100 overflow-hidden">
                              <img src={url} alt="" className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-xs text-ink-400">{new Date(r.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                        <button className="flex items-center gap-1 text-xs text-ink-400 hover:text-ink-700">
                          <ThumbsUp className="h-3 w-3" />{r.helpfulCount}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setReplyDialog({ open: true, reviewId: r.id, reviewTitle: r.title })}>
                      <MessageSquare className="h-3.5 w-3.5" />Reply
                    </Button>
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

      <Dialog open={replyDialog.open} onClose={() => setReplyDialog({ open: false, reviewId: '', reviewTitle: '' })}>
        <DialogHeader><h2 className="font-display text-lg font-semibold">Reply to review</h2></DialogHeader>
        <DialogBody>
          {replyDialog.reviewTitle && <p className="text-sm text-ink-500 mb-3">Re: &ldquo;{replyDialog.reviewTitle}&rdquo;</p>}
          <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write your reply..." rows={4} />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setReplyDialog({ open: false, reviewId: '', reviewTitle: '' })}>Cancel</Button>
          <Button variant="brand" onClick={handleReply} disabled={replySaving || !replyText.trim()}>
            {replySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send reply
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
