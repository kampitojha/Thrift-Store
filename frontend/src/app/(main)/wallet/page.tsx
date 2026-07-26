'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, ArrowUpRight, ArrowDownLeft, History, Loader2, Copy, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type WalletData = {
  id: string; balancePaise: string; heldPaise: string; currency: string;
};

type Txn = {
  id: string; type: string; amountPaise: string; balanceAfter: string;
  description: string; reference: string; createdAt: string;
};

type PaginationMeta = { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };

const TXN_ICONS: Record<string, React.ElementType> = {
  CREDIT: ArrowDownLeft, DEBIT: ArrowUpRight, PAYOUT: ArrowUpRight,
  HOLD: ArrowUpRight, RELEASE: ArrowDownLeft, REFUND: ArrowDownLeft,
  COMMISSION: ArrowDownLeft, CASHBACK: ArrowDownLeft, REWARD: ArrowDownLeft,
};

const TXN_COLORS: Record<string, string> = {
  CREDIT: 'text-emerald-600 bg-emerald-50', DEBIT: 'text-red-600 bg-red-50',
  PAYOUT: 'text-red-600 bg-red-50', HOLD: 'text-amber-600 bg-amber-50',
  RELEASE: 'text-emerald-600 bg-emerald-50', REFUND: 'text-emerald-600 bg-emerald-50',
  CASHBACK: 'text-emerald-600 bg-emerald-50', REWARD: 'text-purple-600 bg-purple-50',
};

export default function WalletPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [walletRes, txnRes] = await Promise.all([
        apiClient.get<WalletData>('/wallet'),
        apiClient.get<{ data: Txn[]; meta: PaginationMeta }>(`/wallet/transactions?page=${page}&limit=20`),
      ]);
      setWallet(walletRes);
      setTxns(txnRes.data ?? []);
      setMeta(txnRes.meta);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [page]);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchData();
  }, [user, router, fetchData]);

  if (!user) return null;

  const balance = wallet ? parseInt(wallet.balancePaise) : 0;
  const held = wallet ? parseInt(wallet.heldPaise) : 0;

  return (
    <div className="container-page py-10 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Wallet</h1>
        <p className="mt-1 text-sm text-ink-500">Manage your funds and view transaction history</p>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Available</p>
          <p className="mt-2 font-display text-3xl font-bold text-ink-900">{formatINR(balance)}</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-400">On Hold</p>
          <p className="mt-2 font-display text-3xl font-bold text-amber-600">{formatINR(held)}</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-ink-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Total</p>
          <p className="mt-2 font-display text-3xl font-bold text-ink-900">{formatINR(balance + held)}</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <h2 className="font-semibold text-ink-900"><History className="mr-2 inline h-4 w-4 text-ink-400" />Transaction History</h2>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-ink-100 animate-pulse" />
            ))}
          </div>
        ) : txns.length === 0 ? (
          <div className="p-16 text-center">
            <Wallet className="mx-auto h-10 w-10 text-ink-300" />
            <p className="mt-3 text-sm font-medium text-ink-600">No transactions yet</p>
            <p className="text-xs text-ink-400">Your wallet activity will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-ink-50">
            {txns.map((txn) => {
              const Icon = TXN_ICONS[txn.type] || History;
              const color = TXN_COLORS[txn.type] || 'text-ink-600 bg-ink-50';
              const isCredit = ['CREDIT', 'RELEASE', 'REFUND', 'CASHBACK', 'REWARD'].includes(txn.type);
              return (
                <div key={txn.id} className="flex items-center justify-between px-6 py-4 hover:bg-ink-50/50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900">{txn.description || txn.type}</p>
                      <p className="text-xs text-ink-400">
                        {new Date(txn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className={cn('text-sm font-semibold shrink-0', isCredit ? 'text-emerald-600' : 'text-red-600')}>
                    {isCredit ? '+' : '-'}{formatINR(parseInt(txn.amountPaise))}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-ink-100 px-6 py-4">
            <p className="text-xs text-ink-400">Page {meta.page} of {meta.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!meta.hasPrev} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={!meta.hasNext} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-ink-100 bg-ink-50 p-5">
        <div className="flex items-start gap-3">
          <Copy className="h-5 w-5 text-ink-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-ink-900">About your wallet</p>
            <ul className="mt-2 space-y-1 text-xs text-ink-500">
              <li>• Earnings from sales are credited to your wallet after delivery</li>
              <li>• Funds on hold are pending dispute/return resolution</li>
              <li>• Minimum withdrawal: ₹100</li>
              <li>• Withdrawals are processed within 3-5 business days</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
