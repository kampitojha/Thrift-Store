'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Download, Loader2, ChevronRight, Search } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

type Invoice = {
  id: string; invoiceNumber: string; amountPaise: number; taxPaise: number;
  issuedAt: string; order: { orderNumber: string; status: string; totalPaise: number; createdAt: string };
};

type PaginationMeta = { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };

export default function InvoicesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: Invoice[]; meta: PaginationMeta }>(`/invoices?page=${page}&limit=20`);
      setInvoices(res.data);
      setMeta(res.meta);
    } catch { setInvoices([]); } finally { setLoading(false); }
  }, [page]);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchInvoices();
  }, [user, router, fetchInvoices]);

  if (!user) return null;

  const filtered = search
    ? invoices.filter((inv) =>
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.order.orderNumber.toLowerCase().includes(search.toLowerCase()))
    : invoices;

  return (
    <div className="container-page py-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Invoices</h1>
        <p className="mt-1 text-sm text-ink-500">{meta ? `${meta.total} invoice${meta.total !== 1 ? 's' : ''}` : 'Download invoices and receipts'}</p>
      </div>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..." className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <FileText className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">{search ? 'No matching invoices' : 'No invoices yet'}</p>
          <p className="mt-2 text-sm text-ink-500">Invoices are generated when you place an order.</p>
          <Link href="/browse"><Button variant="brand" className="mt-6">Start shopping</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-ink-400 shrink-0" />
                  <span className="font-medium text-ink-900">{inv.invoiceNumber}</span>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-600">{inv.order.status}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-ink-500">
                  <span>Order {inv.order.orderNumber}</span>
                  <span>{formatINR(inv.amountPaise)}</span>
                  <span>{new Date(inv.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
                <ChevronRight className="h-5 w-5 text-ink-300" />
              </div>
            </div>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button variant="ghost" size="sm" disabled={!meta.hasPrev} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm text-ink-500">Page {meta.page} of {meta.totalPages}</span>
          <Button variant="ghost" size="sm" disabled={!meta.hasNext} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
