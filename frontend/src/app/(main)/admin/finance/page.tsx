'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, TrendingUp, Percent, RefreshCw, IndianRupee, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type PayoutSummary = { pending: number; processing: number; completed: number; failed: number; totalAmountPaise: string };
type RefundSummary = { totalRefunds: number; totalAmountPaise: string; pending: number };

export default function AdminFinancePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(null);
  const [refundSummary, setRefundSummary] = useState<RefundSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) { router.push('/'); return; }
    Promise.all([
      apiClient.get<PayoutSummary>('/payouts/admin/summary').catch(() => null),
      apiClient.get<RefundSummary>('/refunds/admin/summary').catch(() => null),
    ]).then(([p, r]) => {
      setPayoutSummary(p);
      setRefundSummary(r);
    }).finally(() => setLoading(false));
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink-900">Financial Overview</h1>
        <p className="text-sm text-ink-500 mt-1">Platform revenue, payouts, refunds, and commissions</p>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-ink-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Payout Summary */}
          <div className="mb-8">
            <h2 className="font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-ink-400" /> Payouts
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                <p className="text-xs text-ink-400 uppercase tracking-wider">Pending</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">{payoutSummary?.pending || 0}</p>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                <p className="text-xs text-ink-400 uppercase tracking-wider">Processing</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">{payoutSummary?.processing || 0}</p>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                <p className="text-xs text-ink-400 uppercase tracking-wider">Completed</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{payoutSummary?.completed || 0}</p>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                <p className="text-xs text-ink-400 uppercase tracking-wider">Failed</p>
                <p className="mt-1 text-2xl font-bold text-red-600">{payoutSummary?.failed || 0}</p>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-brand-50 p-4">
                <p className="text-xs text-brand-600 uppercase tracking-wider">Total Paid</p>
                <p className="mt-1 text-2xl font-bold text-brand-700">
                  {formatINR(payoutSummary?.totalAmountPaise ? parseInt(payoutSummary.totalAmountPaise) : 0)}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Link href="/admin/payouts"><Button variant="outline" size="sm">Manage Payouts</Button></Link>
            </div>
          </div>

          {/* Refund Summary */}
          <div className="mb-8">
            <h2 className="font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-ink-400" /> Refunds
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                <p className="text-xs text-ink-400 uppercase tracking-wider">Total Refunds</p>
                <p className="mt-1 text-2xl font-bold text-ink-900">{refundSummary?.totalRefunds || 0}</p>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                <p className="text-xs text-ink-400 uppercase tracking-wider">Pending</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">{refundSummary?.pending || 0}</p>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-red-50 p-4">
                <p className="text-xs text-red-600 uppercase tracking-wider">Total Refunded</p>
                <p className="mt-1 text-2xl font-bold text-red-700">
                  {formatINR(refundSummary?.totalAmountPaise ? parseInt(refundSummary.totalAmountPaise) : 0)}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Link href="/admin/refunds"><Button variant="outline" size="sm">Manage Refunds</Button></Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-semibold text-ink-900 mb-4">Quick Actions</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/admin/payouts" className="rounded-xl border border-ink-100 p-4 hover:border-brand-200 hover:bg-brand-50/30 transition text-center">
                <ArrowUpRight className="mx-auto h-6 w-6 text-ink-400" />
                <p className="mt-2 text-sm font-medium text-ink-700">Review Payouts</p>
              </Link>
              <Link href="/admin/refunds" className="rounded-xl border border-ink-100 p-4 hover:border-brand-200 hover:bg-brand-50/30 transition text-center">
                <RefreshCw className="mx-auto h-6 w-6 text-ink-400" />
                <p className="mt-2 text-sm font-medium text-ink-700">Review Refunds</p>
              </Link>
              <Link href="/admin/orders" className="rounded-xl border border-ink-100 p-4 hover:border-brand-200 hover:bg-brand-50/30 transition text-center">
                <TrendingUp className="mx-auto h-6 w-6 text-ink-400" />
                <p className="mt-2 text-sm font-medium text-ink-700">Order Reports</p>
              </Link>
              <Link href="/admin/users" className="rounded-xl border border-ink-100 p-4 hover:border-brand-200 hover:bg-brand-50/30 transition text-center">
                <IndianRupee className="mx-auto h-6 w-6 text-ink-400" />
                <p className="mt-2 text-sm font-medium text-ink-700">Commission Reports</p>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
