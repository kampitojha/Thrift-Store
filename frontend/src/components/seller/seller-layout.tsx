'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart3, Wallet, Tag, Star, Heart, MessageSquare, Settings, FileText, ChevronLeft, ChevronRight, Store, Plus, Bell, LogOut, RotateCcw, Shield, Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/seller/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/seller/inventory', label: 'Inventory', icon: Package },
  { href: '/seller/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/seller/shipping', label: 'Shipping', icon: Truck },
  { href: '/seller/customers', label: 'Customers', icon: Users },
  { href: '/seller/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/seller/payouts', label: 'Payouts', icon: Wallet },
  { href: '/seller/coupons', label: 'Coupons', icon: Tag },
  { href: '/seller/reviews', label: 'Reviews', icon: Star },
  { href: '/seller/followers', label: 'Followers', icon: Heart },
  { href: '/seller/inbox', label: 'Inbox', icon: MessageSquare },
  { href: '/seller/returns', label: 'Returns', icon: RotateCcw },
  { href: '/seller/disputes', label: 'Disputes', icon: Shield },
  { href: '/seller/reports', label: 'Reports', icon: FileText },
  { href: '/seller/settings', label: 'Store Settings', icon: Settings },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [collapsed, setCollapsed] = useState(false);
  const [storeName, setStoreName] = useState('');

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    apiClient.get<{ store: { storeName: string } }>('/sellers/dashboard')
      .then((d) => setStoreName(d.store?.storeName || ''))
      .catch(() => {});
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-ink-50/50">
      {/* Sidebar */}
      <aside className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-ink-100 bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}>
        <div className="flex h-16 items-center justify-between border-b border-ink-100 px-4">
          {!collapsed && (
            <Link href="/seller/dashboard" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-xs font-bold text-white">S</span>
              <span className="font-display text-sm font-semibold text-ink-900 truncate">{storeName || 'Seller'}</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/seller/dashboard" className="mx-auto">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-xs font-bold text-white">S</span>
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-ink-100 p-2">
          <Link href="/sell" className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50 transition',
            collapsed && 'justify-center',
          )}>
            <Plus className="h-4.5 w-4.5 shrink-0" />
            {!collapsed && <span>New listing</span>}
          </Link>
          <Link href="/" className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-500 hover:bg-ink-50 transition mt-1',
            collapsed && 'justify-center',
          )}>
            <Store className="h-4.5 w-4.5 shrink-0" />
            {!collapsed && <span>View store</span>}
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className={cn('flex-1 transition-all duration-200', collapsed ? 'ml-16' : 'ml-60')}>
        {children}
      </div>
    </div>
  );
}
