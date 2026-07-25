'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tag, Percent, IndianRupee, Loader2, CheckCircle } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type AvailableCoupon = {
  id: string; code: string; type: string; value: number;
  discountPaise: number; minOrderPaise: number | null; maxDiscountPaise: number | null;
};

export default function CouponsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [coupons, setCoupons] = useState<AvailableCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    setLoading(false);
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="container-page py-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Coupons & Offers</h1>
        <p className="mt-1 text-sm text-ink-500">Apply coupon codes to get discounts on your purchases</p>
      </div>

      {/* Apply Coupon */}
      <div className="mb-8 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <h2 className="font-semibold text-ink-900 mb-4">Have a coupon code?</h2>
        <div className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code" className="flex-1 uppercase" />
          <Button variant="brand" onClick={async () => {
            if (!code.trim()) return;
            setApplying(true); setApplyResult(null);
            try {
              await apiClient.post('/checkout/apply-coupon', { code: code.trim() });
              setApplyResult({ success: true, message: 'Coupon applied! Go to checkout to see your discount.' });
              setCode('');
            } catch (e) {
              setApplyResult({ success: false, message: e instanceof ApiError ? e.message : 'Invalid coupon' });
            } finally { setApplying(false); }
          }} disabled={applying || !code.trim()}>
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
          </Button>
        </div>
        {applyResult && (
          <div className={cn('mt-3 rounded-xl p-3 text-sm', applyResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800')}>
            <CheckCircle className={cn('mr-1 inline h-4 w-4', applyResult.success ? 'text-emerald-600' : 'text-red-600')} />
            {applyResult.message}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-ink-100 bg-ink-50 p-6">
        <h2 className="font-semibold text-ink-900 mb-3">How coupons work</h2>
        <ul className="space-y-2 text-sm text-ink-600">
          <li className="flex items-start gap-2">
            <Tag className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
            <span>Enter a coupon code during checkout to get discounts</span>
          </li>
          <li className="flex items-start gap-2">
            <Percent className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
            <span>Discounts can be percentage-based or fixed amount</span>
          </li>
          <li className="flex items-start gap-2">
            <IndianRupee className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
            <span>Some coupons have minimum purchase or maximum discount limits</span>
          </li>
        </ul>
        <div className="mt-6">
          <Link href="/checkout"><Button variant="brand">Go to Checkout</Button></Link>
        </div>
      </div>
    </div>
  );
}
