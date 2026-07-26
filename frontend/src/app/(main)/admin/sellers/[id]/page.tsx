'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Package,
  DollarSign,
  Wallet,
  Star,
  Shield,
  Clock,
  Loader2,
  AlertTriangle,
  ExternalLink,
  TrendingUp,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/tabs';

type SellerDetail = {
  id: string;
  storeName: string;
  storeDescription?: string;
  storeLogoUrl?: string | null;
  storeBannerUrl?: string | null;
  isVerified: boolean;
  verificationStatus: string;
  verifiedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  owner: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    email: string;
    role: string;
    createdAt: string;
  };
  stats?: {
    totalOrders: number;
    totalRevenue: number;
    totalEarnings: number;
    commissionRate: number;
    pendingPayouts: number;
  };
  wallet?: {
    balancePaise: number;
    totalWithdrawnPaise: number;
    pendingPayoutPaise: number;
  };
  recentProducts?: Array<{
    id: string;
    title: string;
    pricePaise: number;
    status: string;
    createdAt: string;
    thumbnailUrl?: string;
  }>;
  verificationHistory?: Array<{
    id: string;
    status: string;
    reason?: string;
    createdAt: string;
    reviewedBy?: { displayName?: string; username: string };
  }>;
};

const VERIFICATION_STYLES: Record<string, string> = {
  UNVERIFIED: 'bg-ink-100 text-ink-600',
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const PRODUCT_STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PENDING_REVIEW: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-red-100 text-red-800',
  HIDDEN: 'bg-ink-100 text-ink-600',
  SOLD: 'bg-brand-100 text-brand-800',
};

export default function AdminSellerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sellerId = params.id as string;
  const currentUser = useAuthStore((s) => s.user);

  const [seller, setSeller] = useState<SellerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('products');
  const [actionLoading, setActionLoading] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchSeller = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<SellerDetail>(`/admin/sellers/${sellerId}`);
      setSeller(res);
    } catch {
      setError('Failed to load seller details.');
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    if (!currentUser || !['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
      router.push('/');
      return;
    }
    fetchSeller();
  }, [currentUser, router, fetchSeller]);

  const approveVerification = async () => {
    setActionLoading('approve');
    try {
      await apiClient.patch(`/admin/sellers/${sellerId}/verification`, { status: 'APPROVED' });
      await fetchSeller();
    } catch { /* ignore */ } finally { setActionLoading(''); }
  };

  const rejectVerification = async () => {
    setActionLoading('reject');
    try {
      await apiClient.patch(`/admin/sellers/${sellerId}/verification`, {
        status: 'REJECTED',
        reason: rejectReason,
      });
      setShowRejectDialog(false);
      setRejectReason('');
      await fetchSeller();
    } catch { /* ignore */ } finally { setActionLoading(''); }
  };

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error || 'Seller not found'}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/sellers')}>
            Back to Sellers
          </Button>
        </div>
      </div>
    );
  }

  const stats = seller.stats;
  const wallet = seller.wallet;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/sellers')} className="mb-4">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Sellers
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-ink-100">
              {seller.storeLogoUrl ? (
                <img src={seller.storeLogoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-ink-500">
                  {seller.storeName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-semibold text-ink-900">{seller.storeName}</h1>
                {seller.isVerified && <Badge variant="success">Verified</Badge>}
              </div>
              <p className="mt-0.5 text-sm text-ink-500">
                Owner: {seller.owner.displayName || seller.owner.username} ({seller.owner.email})
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', VERIFICATION_STYLES[seller.verificationStatus] || 'bg-ink-100 text-ink-600')}>
                  {seller.verificationStatus}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {seller.verificationStatus === 'PENDING' && (
              <>
                <Button
                  variant="brand"
                  size="sm"
                  onClick={approveVerification}
                  disabled={actionLoading === 'approve'}
                >
                  {actionLoading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1.5 h-4 w-4" />}
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={actionLoading === 'reject'}
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
            <Link href={`/admin/users/${seller.owner.id}`}>
              <Button variant="outline" size="sm">
                View Owner <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2 text-ink-400">
            <Package className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Orders</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-ink-900">{stats?.totalOrders || 0}</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2 text-ink-400">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Revenue</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-ink-900">{formatINR(stats?.totalRevenue || 0)}</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2 text-ink-400">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Earnings</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-brand-700">{formatINR(stats?.totalEarnings || 0)}</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2 text-ink-400">
            <Shield className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Commission</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-ink-900">{stats?.commissionRate || 0}%</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
          <div className="flex items-center gap-2 text-brand-500">
            <Wallet className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Wallet</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-brand-700">{formatINR(wallet?.balancePaise || 0)}</p>
        </div>
      </div>

      {/* Store & Owner Info */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <h3 className="mb-3 font-semibold text-ink-900">Store Information</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Store Name</dt>
              <dd className="font-medium text-ink-900">{seller.storeName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Description</dt>
              <dd className="max-w-xs text-right font-medium text-ink-900 truncate">{seller.storeDescription || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Verification</dt>
              <dd>
                <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', VERIFICATION_STYLES[seller.verificationStatus])}>
                  {seller.verificationStatus}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Registered</dt>
              <dd className="font-medium text-ink-900">
                {new Date(seller.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </dd>
            </div>
            {seller.rejectedReason && (
              <div className="flex justify-between">
                <dt className="text-ink-500">Rejection Reason</dt>
                <dd className="max-w-xs text-right text-sm text-red-600">{seller.rejectedReason}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <h3 className="mb-3 font-semibold text-ink-900">Wallet Details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Current Balance</dt>
              <dd className="font-semibold text-brand-700">{formatINR(wallet?.balancePaise || 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Total Withdrawn</dt>
              <dd className="font-medium text-ink-900">{formatINR(wallet?.totalWithdrawnPaise || 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Pending Payouts</dt>
              <dd className="font-medium text-amber-600">{formatINR(wallet?.pendingPayoutPaise || 0)}</dd>
            </div>
            {stats && (
              <>
                <div className="border-t border-ink-100 pt-2 mt-2">
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Commission Rate</dt>
                    <dd className="font-medium text-ink-900">{stats.commissionRate}%</dd>
                  </div>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
        <div className="p-4">
          <Tabs value={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab value="products">Recent Products</Tab>
              <Tab value="history">Verification History</Tab>
            </TabList>

            <TabPanel value="products">
              {!seller.recentProducts?.length ? (
                <p className="py-8 text-center text-sm text-ink-400">No products yet</p>
              ) : (
                <div className="space-y-2">
                  {seller.recentProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={`/admin/products/${product.id}`}
                      className="flex items-center gap-3 rounded-xl border border-ink-50 p-3 transition hover:bg-ink-50/50"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                        {product.thumbnailUrl && (
                          <img src={product.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-900 truncate">{product.title}</p>
                        <p className="text-xs text-ink-400">
                          {new Date(product.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-ink-900">{formatINR(product.pricePaise)}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', PRODUCT_STATUS_STYLES[product.status] || 'bg-ink-100 text-ink-600')}>
                          {product.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabPanel>

            <TabPanel value="history">
              {!seller.verificationHistory?.length ? (
                <p className="py-8 text-center text-sm text-ink-400">No verification history</p>
              ) : (
                <div className="space-y-2">
                  {seller.verificationHistory.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-ink-50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', VERIFICATION_STYLES[entry.status] || 'bg-ink-100 text-ink-600')}>
                            {entry.status}
                          </span>
                          {entry.reviewedBy && (
                            <span className="text-xs text-ink-400">
                              by {entry.reviewedBy.displayName || entry.reviewedBy.username}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-ink-400">
                          {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {entry.reason && (
                        <p className="mt-1.5 text-sm text-ink-600">{entry.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabPanel>
          </Tabs>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)}>
        <DialogHeader>Reject Verification</DialogHeader>
        <DialogBody>
          <p className="mb-4 text-sm text-ink-600">
            Provide a reason for rejecting the verification request for <strong>{seller.storeName}</strong>.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            className="flex min-h-[100px] w-full rounded-xl border border-input bg-white px-4 py-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectReason(''); }}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={rejectVerification}
            disabled={actionLoading === 'reject' || !rejectReason.trim()}
          >
            {actionLoading === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Reject
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
