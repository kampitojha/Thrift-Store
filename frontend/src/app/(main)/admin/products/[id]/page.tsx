'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  EyeOff,
  Star,
  Trash2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Tag,
  Flag,
  Shield,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';

type ProductDetail = {
  id: string;
  title: string;
  slug: string;
  description: string;
  pricePaise: number;
  originalPricePaise?: number | null;
  status: string;
  condition?: string;
  size?: string | null;
  color?: string | null;
  isFeatured: boolean;
  viewCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; slug: string } | null;
  tags?: string[];
  media: Array<{ id: string; url: string; isPrimary: boolean; altText?: string | null }>;
  seller: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    isVerified?: boolean;
    email?: string;
  };
  reviews?: Array<{
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
    user: { id: string; username: string; displayName?: string | null; avatarUrl?: string | null };
  }>;
  reports?: Array<{
    id: string;
    reason: string;
    description?: string;
    status: string;
    createdAt: string;
    reporter?: { username: string; displayName?: string | null };
  }>;
  moderationNotes?: string;
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PENDING_REVIEW: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-red-100 text-red-800',
  HIDDEN: 'bg-ink-100 text-ink-600',
  SOLD: 'bg-brand-100 text-brand-800',
};

const REPORT_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  REVIEWED: 'bg-emerald-100 text-emerald-800',
  DISMISSED: 'bg-ink-100 text-ink-600',
};

export default function AdminProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const currentUser = useAuthStore((s) => s.user);

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [moderationNotes, setModerationNotes] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showFeatureDialog, setShowFeatureDialog] = useState(false);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<ProductDetail>(`/admin/products/${productId}`);
      setProduct(res);
      setModerationNotes(res.moderationNotes || '');
    } catch {
      setError('Failed to load product details.');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (!currentUser || !['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
      router.push('/');
      return;
    }
    fetchProduct();
  }, [currentUser, router, fetchProduct]);

  const moderate = async (action: string, body?: Record<string, unknown>) => {
    setActionLoading(action);
    try {
      await apiClient.patch(`/admin/products/${productId}/moderate`, {
        action,
        notes: moderationNotes,
        ...body,
      });
      await fetchProduct();
    } catch { /* ignore */ } finally { setActionLoading(''); }
  };

  const deleteProduct = async () => {
    setActionLoading('delete');
    try {
      await apiClient.delete(`/admin/products/${productId}`);
      router.push('/admin/products');
    } catch { /* ignore */ } finally { setActionLoading(''); }
  };

  const toggleFeature = async () => {
    setActionLoading('feature');
    try {
      await apiClient.patch(`/admin/products/${productId}/feature`, { isFeatured: !product?.isFeatured });
      await fetchProduct();
    } catch { /* ignore */ } finally { setActionLoading(''); }
  };

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-96 rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error || 'Product not found'}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/products')}>
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  const hasDiscount = product.originalPricePaise && product.originalPricePaise > product.pricePaise;
  const discountPct = hasDiscount
    ? Math.round(((product.originalPricePaise! - product.pricePaise) / product.originalPricePaise!) * 100)
    : 0;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/products')} className="mb-4">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Products
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900">{product.title}</h1>
            <div className="mt-1.5 flex items-center gap-2">
              <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[product.status] || 'bg-ink-100 text-ink-600')}>
                {product.status.replace(/_/g, ' ')}
              </span>
              {product.isFeatured && <Badge variant="brand">Featured</Badge>}
              {product.condition && <Badge variant="outline">{product.condition}</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {product.status !== 'ACTIVE' && (
              <Button
                variant="brand"
                size="sm"
                onClick={() => moderate('approve')}
                disabled={actionLoading === 'approve'}
              >
                {actionLoading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1.5 h-4 w-4" />}
                Approve
              </Button>
            )}
            {product.status !== 'REJECTED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectDialog(true)}
                disabled={actionLoading === 'reject'}
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Reject
              </Button>
            )}
            {product.status !== 'HIDDEN' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => moderate('hide')}
                disabled={actionLoading === 'hide'}
              >
                <EyeOff className="mr-1.5 h-4 w-4" />
                Hide
              </Button>
            )}
            <Button
              variant={product.isFeatured ? 'outline' : 'brand'}
              size="sm"
              onClick={toggleFeature}
              disabled={actionLoading === 'feature'}
            >
              {actionLoading === 'feature' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="mr-1.5 h-4 w-4" />}
              {product.isFeatured ? 'Unfeature' : 'Feature'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={actionLoading === 'delete'}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Images & Description */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
            <div className="aspect-[4/5] overflow-hidden rounded-xl bg-ink-100">
              {product.media.length > 0 ? (
                <img
                  src={product.media[selectedImage]?.url}
                  alt={product.media[selectedImage]?.altText || product.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-ink-300" />
                </div>
              )}
            </div>
            {product.media.length > 1 && (
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                {product.media.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(i)}
                    className={cn(
                      'h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition',
                      selectedImage === i ? 'border-brand-600' : 'border-transparent hover:border-ink-300',
                    )}
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <h3 className="mb-3 font-semibold text-ink-900">Description</h3>
            <p className="whitespace-pre-wrap text-sm text-ink-700 leading-relaxed">{product.description}</p>
          </div>

          {/* Moderation Notes */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <h3 className="mb-3 font-semibold text-ink-900">Moderation Notes</h3>
            <Textarea
              placeholder="Add internal moderation notes..."
              value={moderationNotes}
              onChange={(e) => setModerationNotes(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => moderate('addNote')}
                disabled={actionLoading === 'addNote'}
              >
                {actionLoading === 'addNote' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Notes
              </Button>
            </div>
          </div>

          {/* Reports */}
          {product.reports && product.reports.length > 0 && (
            <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-soft">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink-900">
                <Flag className="h-4 w-4 text-red-500" />
                Report Flags ({product.reports.length})
              </h3>
              <div className="space-y-2">
                {product.reports.map((report) => (
                  <div key={report.id} className="rounded-xl border border-ink-50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink-900">{report.reason}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', REPORT_STATUS_STYLES[report.status] || 'bg-ink-100 text-ink-600')}>
                          {report.status}
                        </span>
                      </div>
                      <span className="text-xs text-ink-400">
                        {new Date(report.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    {report.description && (
                      <p className="mt-1 text-xs text-ink-500">{report.description}</p>
                    )}
                    {report.reporter && (
                      <p className="mt-1 text-xs text-ink-400">
                        by {report.reporter.displayName || report.reporter.username}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <h3 className="mb-3 font-semibold text-ink-900">
              Reviews ({product.reviews?.length || 0})
            </h3>
            {!product.reviews?.length ? (
              <p className="py-4 text-center text-sm text-ink-400">No reviews yet</p>
            ) : (
              <div className="space-y-2">
                {product.reviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-ink-50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-ink-100">
                          {review.user.avatarUrl ? (
                            <img src={review.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-ink-500">
                              {(review.user.displayName || review.user.username).charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-medium text-ink-900">
                          {review.user.displayName || review.user.username}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn('h-3 w-3', i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-200')}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-ink-400">
                        {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm text-ink-600">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Info & Seller */}
        <div className="space-y-4">
          {/* Price & Status */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <h3 className="mb-3 font-semibold text-ink-900">Pricing</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Current Price</dt>
                <dd className="font-bold text-ink-900 text-lg">{formatINR(product.pricePaise)}</dd>
              </div>
              {hasDiscount && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Original Price</dt>
                    <dd className="text-ink-400 line-through">{formatINR(product.originalPricePaise!)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Discount</dt>
                    <dd className="font-medium text-emerald-600">{discountPct}% off</dd>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <h3 className="mb-3 font-semibold text-ink-900">Product Details</h3>
            <dl className="space-y-2 text-sm">
              {product.category && (
                <div className="flex justify-between">
                  <dt className="text-ink-500">Category</dt>
                  <dd className="font-medium text-ink-900">{product.category.name}</dd>
                </div>
              )}
              {product.condition && (
                <div className="flex justify-between">
                  <dt className="text-ink-500">Condition</dt>
                  <dd className="font-medium text-ink-900">{product.condition}</dd>
                </div>
              )}
              {product.size && (
                <div className="flex justify-between">
                  <dt className="text-ink-500">Size</dt>
                  <dd className="font-medium text-ink-900">{product.size}</dd>
                </div>
              )}
              {product.color && (
                <div className="flex justify-between">
                  <dt className="text-ink-500">Color</dt>
                  <dd className="font-medium text-ink-900">{product.color}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-500">Views</dt>
                <dd className="font-medium text-ink-900">{product.viewCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Favorites</dt>
                <dd className="font-medium text-ink-900">{product.favoriteCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Listed</dt>
                <dd className="font-medium text-ink-900">
                  {new Date(product.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </dd>
              </div>
            </dl>
          </div>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink-900">
                <Tag className="h-4 w-4 text-ink-400" /> Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Seller Info */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <h3 className="mb-3 font-semibold text-ink-900">Seller</h3>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-ink-100">
                {product.seller.avatarUrl ? (
                  <img src={product.seller.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-ink-500">
                    {(product.seller.displayName || product.seller.username).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">
                  {product.seller.displayName || product.seller.username}
                </p>
                <p className="text-xs text-ink-400">@{product.seller.username}</p>
              </div>
              {product.seller.isVerified && (
                <Badge variant="success" className="ml-auto">Verified</Badge>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Link href={`/admin/users/${product.seller.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  View User
                </Button>
              </Link>
              <Link href={`/admin/sellers/${product.seller.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  View Store
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)}>
        <DialogHeader>Reject Product</DialogHeader>
        <DialogBody>
          <p className="mb-4 text-sm text-ink-600">
            Provide a reason for rejecting <strong>{product.title}</strong>.
          </p>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectReason(''); }}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => { moderate('reject', { reason: rejectReason }); setShowRejectDialog(false); setRejectReason(''); }}
            disabled={actionLoading === 'reject' || !rejectReason.trim()}
          >
            {actionLoading === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Reject Product
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogHeader>Delete Product</DialogHeader>
        <DialogBody>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  This action cannot be undone
                </p>
                <p className="mt-1 text-sm text-red-700">
                  This will permanently delete <strong>{product.title}</strong> and all associated data.
                </p>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button variant="destructive" onClick={deleteProduct} disabled={actionLoading === 'delete'}>
            {actionLoading === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete Product
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
