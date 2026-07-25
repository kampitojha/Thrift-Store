'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  totalPaise: number;
  subtotalPaise: number;
  shippingPaise: number;
  discountPaise: number;
  createdAt: string;
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unitPricePaise: number;
    totalPaise: number;
    thumbnailUrl?: string;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    method: string;
    status: string;
    amountPaise: number;
  }>;
  shippingAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  timeline: Array<{
    id: string;
    status: string;
    note?: string;
    createdAt: string;
  }>;
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const success = searchParams.get('success');

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    apiClient.get<OrderDetail>(`/orders/${id}`).then(setOrder).catch(() => router.push('/'));
  }, [id, user, router]);

  if (!order) return <div className="container-page py-24 text-center text-ink-500">Loading…</div>;

  return (
    <div className="container-page max-w-2xl py-10">
      {success && (
        <div className="mb-8 rounded-2xl bg-green-50 border border-green-200 p-6 text-center">
          <p className="text-2xl">🎉</p>
          <h2 className="mt-2 font-display text-xl font-semibold text-green-900">Payment successful!</h2>
          <p className="mt-1 text-sm text-green-700">Your order has been placed.</p>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Order</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
          order.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
          order.status === 'PLACED' ? 'bg-blue-100 text-blue-800' :
          'bg-ink-100 text-ink-600'
        }`}>{order.status}</span>
      </div>

      <div className="mt-8 space-y-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-4 rounded-xl border border-ink-100 bg-white p-4">
            <div className="h-20 w-16 shrink-0 rounded-lg bg-ink-100" />
            <div>
              <p className="font-medium text-ink-900">{item.title}</p>
              <p className="text-sm text-ink-500">Qty {item.quantity} × {formatINR(item.unitPricePaise)}</p>
              <p className="text-sm font-semibold">{formatINR(item.totalPaise)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <h3 className="font-semibold">Payment</h3>
        {order.payments.map((p) => (
          <div key={p.id} className="mt-2 flex justify-between text-sm">
            <span className="text-ink-500">{p.provider} ({p.method})</span>
            <span className={p.status === 'CAPTURED' ? 'text-green-700 font-medium' : 'text-ink-500'}>
              {p.status} — {formatINR(p.amountPaise)}
            </span>
          </div>
        ))}
        <div className="mt-4 flex justify-between border-t border-ink-100 pt-4 text-base font-bold">
          <span>Total</span>
          <span>{formatINR(order.totalPaise)}</span>
        </div>
      </div>

      {order.shippingAddress && (
        <div className="mt-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h3 className="font-semibold">Shipping to</h3>
          <p className="mt-2 text-sm text-ink-700">{order.shippingAddress.fullName}</p>
          <p className="text-sm text-ink-500">{order.shippingAddress.line1}</p>
          {order.shippingAddress.line2 && <p className="text-sm text-ink-500">{order.shippingAddress.line2}</p>}
          <p className="text-sm text-ink-500">{order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.postalCode}</p>
          <p className="text-sm text-ink-500">{order.shippingAddress.phone}</p>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <h3 className="font-semibold">Timeline</h3>
        <ul className="mt-4 space-y-3">
          {order.timeline.map((t) => (
            <li key={t.id} className="flex items-start gap-3 text-sm">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
              <div>
                <p className="font-medium text-ink-900">{t.status}</p>
                {t.note && <p className="text-ink-500">{t.note}</p>}
                <p className="text-xs text-ink-400">{new Date(t.createdAt).toLocaleString()}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 text-center">
        <Link href="/"><Button variant="outline">Continue shopping</Button></Link>
      </div>
    </div>
  );
}
