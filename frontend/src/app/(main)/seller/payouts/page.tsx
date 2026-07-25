'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Loader2, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, Banknote, CreditCard } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';

type WalletData = {
  id: string; balancePaise: string; heldPaise: string; userId: string;
};

type Transaction = {
  id: string; type: string; amountPaise: string; balanceAfter: string;
  description?: string; reference?: string; status?: string; createdAt: string;
};

type TransactionsResponse = {
  data: Transaction[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

const TX_ICONS: Record<string, React.ElementType> = {
  SALE: ArrowUpRight, PAYOUT: ArrowDownLeft, REFUND: ArrowDownLeft, ADJUSTMENT: Wallet,
};

const TX_COLORS: Record<string, string> = {
  SALE: 'text-emerald-600', PAYOUT: 'text-red-500', REFUND: 'text-orange-500', ADJUSTMENT: 'text-blue-500',
};

export default function PayoutsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [w, t] = await Promise.all([
        apiClient.get<WalletData>('/wallet'),
        apiClient.get<TransactionsResponse>(`/wallet/transactions?page=${page}&limit=20`),
      ]);
      setWallet(w);
      setTransactions(t.data);
      setTotalPages(t.meta.totalPages);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchData();
  }, [user, fetchData, router]);

  const handlePayout = async () => {
    const amt = parseInt(payoutAmount, 10);
    if (isNaN(amt) || amt < 100) return;
    setPayoutLoading(true);
    try {
      await apiClient.post('/wallet/payout', { amountPaise: amt * 100 });
      setShowPayoutDialog(false);
      setPayoutAmount('');
      await fetchData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to request payout');
    } finally {
      setPayoutLoading(false);
    }
  };

  const balance = wallet ? parseInt(wallet.balancePaise, 10) : 0;
  const held = wallet ? parseInt(wallet.heldPaise, 10) : 0;

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Payouts</h1>
          <p className="text-sm text-ink-500">Manage your earnings and withdrawals</p>
        </div>
      </div>

      {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-ink-100 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-ink-100 animate-pulse" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-ink-100 bg-white p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400 mb-1">Available balance</p>
              <p className="font-display text-3xl font-semibold text-ink-900">{formatINR(balance)}</p>
              <Button variant="brand" size="sm" className="mt-4" onClick={() => setShowPayoutDialog(true)} disabled={balance < 10000}>
                <Banknote className="h-4 w-4" />Withdraw
              </Button>
              {balance < 10000 && <p className="text-xs text-ink-400 mt-2">Minimum withdrawal: ₹100</p>}
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400 mb-1">On hold</p>
              <p className="font-display text-3xl font-semibold text-ink-900">{formatINR(held)}</p>
              <p className="text-xs text-ink-500 mt-2">Funds from recent sales being verified</p>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400 mb-1">Total earned</p>
              <p className="font-display text-3xl font-semibold text-ink-900">{formatINR(balance + held)}</p>
              <p className="text-xs text-ink-500 mt-2">Lifetime earnings on Reloom</p>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white">
            <div className="px-6 py-4 border-b border-ink-100">
              <h2 className="font-display text-lg font-semibold text-ink-900">Transaction history</h2>
            </div>
            {transactions.length === 0 ? (
              <div className="p-12 text-center">
                <Wallet className="mx-auto h-10 w-10 text-ink-300" />
                <p className="mt-3 text-sm text-ink-500">No transactions yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-ink-50">
                {transactions.map((tx) => {
                  const Icon = TX_ICONS[tx.type] || Wallet;
                  return (
                    <div key={tx.id} className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', TX_COLORS[tx.type] || 'text-ink-400', 'bg-ink-50')}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink-900">{tx.description || tx.type.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-ink-500">{new Date(tx.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn('font-medium', tx.type === 'SALE' ? 'text-emerald-600' : 'text-ink-900')}>
                          {tx.type === 'SALE' ? '+' : '-'}{formatINR(parseInt(tx.amountPaise, 10))}
                        </p>
                        {tx.status && <Badge variant={tx.status === 'completed' ? 'success' : 'default'}>{tx.status}</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-ink-100">
                <p className="text-sm text-ink-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={showPayoutDialog} onClose={() => setShowPayoutDialog(false)}>
        <DialogHeader><h2 className="font-display text-lg font-semibold">Withdraw funds</h2></DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-ink-500 mb-1">Available balance: <span className="font-semibold text-ink-900">{formatINR(balance)}</span></p>
              <label className="block text-sm font-medium text-ink-700 mb-1">Amount (₹)</label>
              <Input type="number" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="Enter amount (min ₹100)" min={100} />
              <p className="text-xs text-ink-400 mt-1">Funds will be transferred to your linked bank account.</p>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>Cancel</Button>
          <Button variant="brand" onClick={handlePayout} disabled={payoutLoading || parseInt(payoutAmount, 10) < 100 || parseInt(payoutAmount, 10) > balance / 100}>
            {payoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Withdraw {payoutAmount ? `₹${parseInt(payoutAmount, 10).toLocaleString('en-IN')}` : ''}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
