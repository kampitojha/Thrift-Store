'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  Menu,
  X,
  MessageCircle,
  Store,
  Settings,
  Bell,
  Package,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { Button } from '@/components/ui/button';
import { apiClient, ProductLike } from '@/lib/api';
import { cn, formatINR } from '@/lib/utils';

const NAV = [
  { href: '/browse', label: 'Shop' },
  { href: '/browse?sort=trending', label: 'Trending' },
  { href: '/browse?category=luxury', label: 'Luxury' },
  { href: '/browse?category=vintage', label: 'Vintage' },
  { href: '/sell', label: 'Sell' },
];

export function Header() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const itemCount = useCartStore((s) => s.itemCount);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductLike[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!user) return;
    apiClient
      .get<{ data: { id: string }[]; meta: { total: number } }>('/notifications?limit=1')
      .then((res) => setNotifCount(res.meta?.total || 0))
      .catch(() => {});
  }, [user]);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) { setSuggestions([]); return; }
    try {
      const res = await apiClient.get<{ data: ProductLike[] }>(
        `/products?q=${encodeURIComponent(query.trim())}&limit=5&sort=trending`,
        { revalidate: 10 },
      );
      setSuggestions(res.data);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const onSearchInput = (value: string) => {
    setQ(value);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 250);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/browse?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
    setShowSuggestions(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100/80 glass">
      <div className="container-page">
        <div className="flex h-16 items-center gap-4 lg:h-[4.25rem]">
          <button
            type="button"
            className="lg:hidden rounded-full p-2 hover:bg-ink-100"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 text-sm font-bold tracking-tight text-white">
              R
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-ink-900">
              Reloom
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div ref={searchRef} className="relative mx-auto hidden max-w-md flex-1 md:block lg:mx-8">
            <form onSubmit={onSearch}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  value={q}
                  onChange={(e) => onSearchInput(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search thrift, brands, vintage..."
                  className="h-11 w-full rounded-full border border-ink-200 bg-ink-50/80 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-200"
                />
              </div>
            </form>

            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-lift">
                <div className="p-2">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Suggestions
                  </p>
                  {suggestions.map((p) => (
                    <Link
                      key={p.id}
                      href={`/product/${p.slug}`}
                      onClick={() => setShowSuggestions(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-ink-50"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                        <img
                          src={p.thumbnailUrl || 'https://placehold.co/100x100/f2e8db/5d362a?text=R'}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-900">{p.title}</p>
                        <p className="text-xs text-ink-500">{formatINR(p.pricePaise)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link
                  href={`/browse?q=${encodeURIComponent(q)}`}
                  onClick={() => setShowSuggestions(false)}
                  className="flex items-center justify-center gap-2 border-t border-ink-100 px-4 py-3 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
                >
                  <Search className="h-4 w-4" />
                  View all results for &ldquo;{q}&rdquo;
                </Link>
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link
              href="/wishlist"
              className="hidden rounded-full p-2.5 text-ink-700 hover:bg-ink-100 sm:flex"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
            </Link>
            {user && (
              <>
                <Link
                  href="/notifications"
                  className="relative hidden rounded-full p-2.5 text-ink-700 hover:bg-ink-100 sm:flex"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {notifCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-brand-600 px-1 text-[8px] font-bold text-white">
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/messages"
                  className="hidden rounded-full p-2.5 text-ink-700 hover:bg-ink-100 sm:flex"
                  aria-label="Messages"
                >
                  <MessageCircle className="h-5 w-5" />
                </Link>
              </>
            )}
            <Link
              href="/cart"
              className="relative rounded-full p-2.5 text-ink-700 hover:bg-ink-100"
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-1">
                <Link
                  href="/seller/dashboard"
                  className="hidden rounded-full p-2.5 text-ink-700 hover:bg-ink-100 md:flex"
                  aria-label="Seller dashboard"
                >
                  <Store className="h-5 w-5" />
                </Link>
                <Link
                  href="/settings"
                  className="hidden rounded-full p-2.5 text-ink-700 hover:bg-ink-100 sm:flex"
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5" />
                </Link>
                <Link
                  href={`/profile/${user.username}`}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-ink-200 text-sm font-semibold text-ink-800"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    user.username.slice(0, 1).toUpperCase()
                  )}
                </Link>
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="sm" variant="brand">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}

            {!user && (
              <Link href="/sign-in" className="rounded-full p-2.5 sm:hidden" aria-label="Account">
                <User className="h-5 w-5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile panel */}
      <div
        className={cn(
          'border-t border-ink-100 bg-white lg:hidden',
          open ? 'block' : 'hidden',
        )}
      >
        <div className="container-page space-y-3 py-4">
          <form onSubmit={onSearch}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={q}
                onChange={(e) => onSearchInput(e.target.value)}
                placeholder="Search..."
                className="h-11 w-full rounded-full border border-ink-200 bg-ink-50 pl-10 pr-4 text-sm outline-none"
              />
            </div>
          </form>
          <nav className="flex flex-col">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-ink-800 hover:bg-ink-50"
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <>
                <Link
                  href="/orders"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-medium text-ink-800 hover:bg-ink-50"
                >
                  <Package className="mr-2 inline h-4 w-4" />
                  Orders
                </Link>
                <Link
                  href="/notifications"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-medium text-ink-800 hover:bg-ink-50"
                >
                  <Bell className="mr-2 inline h-4 w-4" />
                  Notifications
                  {notifCount > 0 && (
                    <span className="ml-2 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] text-white">{notifCount}</span>
                  )}
                </Link>
                <Link
                  href="/listings"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-medium text-ink-800 hover:bg-ink-50"
                >
                  My listings
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-medium text-ink-800 hover:bg-ink-50"
                >
                  Settings
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
