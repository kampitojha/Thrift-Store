'use client';

import Link from 'next/link';
import { useState } from 'react';
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
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
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

          <form onSubmit={onSearch} className="mx-auto hidden max-w-md flex-1 md:block lg:mx-8">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search thrift, brands, vintage..."
                className="h-11 w-full rounded-full border border-ink-200 bg-ink-50/80 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link
              href="/wishlist"
              className="hidden rounded-full p-2.5 text-ink-700 hover:bg-ink-100 sm:flex"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
            </Link>
            {user && (
              <Link
                href="/messages"
                className="hidden rounded-full p-2.5 text-ink-700 hover:bg-ink-100 sm:flex"
                aria-label="Messages"
              >
                <MessageCircle className="h-5 w-5" />
              </Link>
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
                  href={`/profile/${user.username}`}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-ink-200 text-sm font-semibold text-ink-800"
                >
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
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
                onChange={(e) => setQ(e.target.value)}
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
          </nav>
        </div>
      </div>
    </header>
  );
}
