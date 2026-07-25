'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Dashboard = {
  store: { storeName: string; storeSlug: string; totalSales: number; rating: number };
  wallet: { balancePaise: string } | null;
  viewsLast30d: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalPaise: number;
    createdAt: string;
  }>;
  productsByStatus: Array<{ status: string; _count: number }>;
  ordersByStatus: Array<{ status: string; _count: number; _sum: { totalPaise: number | null } }>;
};

export default function SellerDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/sign-in');
      return;
    }
    apiClient
      .get<Dashboard>('/sellers/dashboard')
      .then(setData)
      .catch((e) => setError(e.message));
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Seller hub</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {data?.store.storeName || 'Dashboard'}
          </h1>
        </div>
        <Link href="/sell">
          <Button variant="brand">New listing</Button>
        </Link>
      </div>

      {error && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-medium text-amber-900">Become a seller to unlock the dashboard</p>
          <p className="mt-1 text-sm text-amber-800">{error}</p>
          <Link href="/sell" className="mt-4 inline-block">
            <Button size="sm" variant="outline">
              Create your first listing
            </Button>
          </Link>
        </div>
      )}

      {data && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Wallet balance"
              value={formatINR(Number(data.wallet?.balancePaise || 0))}
            />
            <Stat label="Total sales" value={String(data.store.totalSales)} />
            <Stat label="Store rating" value={data.store.rating.toFixed(1)} />
            <Stat label="Views (30d)" value={String(data.viewsLast30d)} />
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
              <h2 className="font-semibold">Inventory by status</h2>
              <ul className="mt-4 space-y-2">
                {data.productsByStatus.map((p) => (
                  <li key={p.status} className="flex justify-between text-sm">
                    <span className="text-ink-500">{p.status}</span>
                    <span className="font-medium">{p._count}</span>
                  </li>
                ))}
                {!data.productsByStatus.length && (
                  <li className="text-sm text-ink-400">No products yet</li>
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
              <h2 className="font-semibold">Recent orders</h2>
              <ul className="mt-4 space-y-3">
                {data.recentOrders.map((o) => (
                  <li key={o.id} className="flex justify-between text-sm">
                    <span className="font-medium text-ink-800">{o.orderNumber}</span>
                    <span className="text-ink-500">{o.status}</span>
                  </li>
                ))}
                {!data.recentOrders.length && (
                  <li className="text-sm text-ink-400">No orders yet</li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">{value}</p>
    </div>
  );
}
