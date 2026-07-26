'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  AlertTriangle,
  Users,
  Package,
  RefreshCw,
  ExternalLink,
  UserX,
  Store,
  ListChecks,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

type SuspiciousAccount = {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
  flags: string[];
};

type InactiveVerifiedSeller = {
  id: string;
  userId: string;
  storeName: string;
  username: string;
  verifiedAt?: string;
  lastActiveAt?: string;
  activeListings: number;
};

type BulkListing = {
  sellerId: string;
  storeName: string;
  username: string;
  listingsInLastHour: number;
  listingsInLastDay: number;
  totalActiveListings: number;
};

type FraudData = {
  suspiciousAccounts: SuspiciousAccount[];
  inactiveVerifiedSellers: InactiveVerifiedSeller[];
  bulkListings: BulkListing[];
};

export default function AdminFraudPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<FraudData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<FraudData>('/admin/fraud');
      setData(res);
    } catch {
      setError('Failed to load fraud detection data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    fetchData();
  }, [user, router, fetchData]);

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            Fraud Detection Center
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Monitor suspicious activity and flagged accounts across the platform
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData()}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-16 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-red-200 bg-red-50 py-24 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-medium text-red-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchData()}>
            Try Again
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Suspicious Accounts */}
          <FraudSection
            title="Suspicious Accounts"
            icon={<UserX className="h-5 w-5 text-red-500" />}
            count={data?.suspiciousAccounts.length ?? 0}
            emptyMessage="No suspicious accounts detected"
            alertColor="red"
          >
            {(data?.suspiciousAccounts ?? []).map((account) => (
              <Link
                key={account.id}
                href={`/admin/users/${account.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/50 p-4 transition hover:border-red-200 hover:bg-red-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-900">{account.username}</span>
                    <Badge variant="outline">{account.role}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-500">{account.email}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {account.flags.map((flag) => (
                      <span
                        key={flag}
                        className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-ink-400">
                    Joined {new Date(account.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {account.lastLoginAt && (
                      <> &middot; Last login {new Date(account.lastLoginAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</>
                    )}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-ink-400" />
              </Link>
            ))}
          </FraudSection>

          {/* Inactive Verified Sellers */}
          <FraudSection
            title="Inactive Verified Sellers"
            icon={<Store className="h-5 w-5 text-amber-500" />}
            count={data?.inactiveVerifiedSellers.length ?? 0}
            emptyMessage="No inactive verified sellers found"
            alertColor="amber"
          >
            {(data?.inactiveVerifiedSellers ?? []).map((seller) => (
              <Link
                key={seller.id}
                href={`/admin/sellers/${seller.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4 transition hover:border-amber-200 hover:bg-amber-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-900">{seller.storeName}</span>
                    <span className="text-sm text-ink-400">@{seller.username}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
                    <span>{seller.activeListings} active listings</span>
                    {seller.verifiedAt && (
                      <span>Verified {new Date(seller.verifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    )}
                    {seller.lastActiveAt && (
                      <span>Last active {new Date(seller.lastActiveAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    )}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-ink-400" />
              </Link>
            ))}
          </FraudSection>

          {/* Bulk Listings */}
          <FraudSection
            title="Bulk Listings"
            icon={<ListChecks className="h-5 w-5 text-orange-500" />}
            count={data?.bulkListings.length ?? 0}
            emptyMessage="No bulk listing activity detected"
            alertColor="orange"
          >
            {(data?.bulkListings ?? []).map((item) => (
              <Link
                key={item.sellerId}
                href={`/admin/sellers/${item.sellerId}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-100 bg-orange-50/50 p-4 transition hover:border-orange-200 hover:bg-orange-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-900">{item.storeName}</span>
                    <span className="text-sm text-ink-400">@{item.username}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-sm">
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 font-medium text-orange-700">
                      {item.listingsInLastHour} / hr
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 font-medium text-orange-700">
                      {item.listingsInLastDay} / day
                    </span>
                    <span className="text-ink-500">
                      {item.totalActiveListings} total active
                    </span>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-ink-400" />
              </Link>
            ))}
          </FraudSection>
        </div>
      )}
    </div>
  );
}

function FraudSection({
  title,
  icon,
  count,
  emptyMessage,
  alertColor,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  emptyMessage: string;
  alertColor: 'red' | 'amber' | 'orange';
  children: React.ReactNode;
}) {
  const borderMap = {
    red: 'border-red-200',
    amber: 'border-amber-200',
    orange: 'border-orange-200',
  };

  const bgMap = {
    red: 'bg-red-50',
    amber: 'bg-amber-50',
    orange: 'bg-orange-50',
  };

  return (
    <div className={cn('rounded-2xl border bg-white shadow-soft', borderMap[alertColor])}>
      <div className={cn('flex items-center justify-between rounded-t-2xl border-b px-6 py-4', borderMap[alertColor], bgMap[alertColor])}>
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
          {count > 0 && (
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold text-white', alertColor === 'red' && 'bg-red-500', alertColor === 'amber' && 'bg-amber-500', alertColor === 'orange' && 'bg-orange-500')}>
              {count}
            </span>
          )}
        </div>
      </div>
      <div className="divide-y divide-ink-100">
        {count === 0 ? (
          <div className="py-12 text-center text-sm text-ink-400">{emptyMessage}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
