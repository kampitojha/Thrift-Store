'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search as SearchIcon,
  Users,
  Package,
  ShoppingCart,
  Store,
  ExternalLink,
  Loader2,
  SearchX,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

type SearchResultUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
};

type SearchResultProduct = {
  id: string;
  title: string;
  slug: string;
  pricePaise: number;
  status: string;
  seller?: { username: string };
};

type SearchResultOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalPaise: number;
  createdAt: string;
};

type SearchResultSeller = {
  id: string;
  storeName: string;
  username: string;
  isVerified: boolean;
  productCount?: number;
};

type SearchResponse = {
  users: SearchResultUser[];
  products: SearchResultProduct[];
  orders: SearchResultOrder[];
  sellers: SearchResultSeller[];
};

const SECTION_CONFIG = [
  { key: 'users' as const, label: 'Users', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'products' as const, label: 'Products', icon: Package, color: 'text-brand-600', bg: 'bg-brand-50' },
  { key: 'orders' as const, label: 'Orders', icon: ShoppingCart, color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'sellers' as const, label: 'Sellers', icon: Store, color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

export default function AdminSearchPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    inputRef.current?.focus();
  }, [user, router]);

  const performSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({ q: trimmed });
      const res = await apiClient.get<SearchResponse>(`/admin/search?${params}`);
      setResults(res);
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      performSearch(query);
    }
  };

  const totalResults = results
    ? results.users.length + results.products.length + results.orders.length + results.sellers.length
    : 0;

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
          <SearchIcon className="h-6 w-6 text-brand-600" />
          Global Search
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Search across users, products, orders, and sellers
        </p>
      </div>

      {/* Search input */}
      <div className="mb-8 flex items-center gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            ref={inputRef}
            placeholder="Search users, products, orders, sellers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-11"
          />
        </div>
        <button
          onClick={() => performSearch(query)}
          disabled={!query.trim() || loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 text-sm font-medium text-white shadow-soft transition-all hover:bg-brand-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
          Search
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-6">
          {SECTION_CONFIG.map((section) => (
            <div key={section.key} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-red-200 bg-red-50 py-24 text-center">
          <SearchX className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-medium text-red-800">{error}</p>
        </div>
      ) : !hasSearched ? (
        /* Empty state - no query yet */
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <SearchIcon className="mx-auto h-16 w-16 text-ink-200" />
          <p className="mt-6 text-lg font-medium text-ink-800">Start typing to search</p>
          <p className="mt-1 text-sm text-ink-500">
            Search for users, products, orders, or sellers across the platform
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {['user@example.com', 'Nike', 'ORD-1234', 'thriftshop'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => { setQuery(suggestion); performSearch(suggestion); }}
                className="rounded-full border border-ink-200 bg-white px-4 py-1.5 text-sm text-ink-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : totalResults === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <SearchX className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No results found</p>
          <p className="text-sm text-ink-500">Try a different search term</p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-ink-500">
            Found <span className="font-semibold text-ink-900">{totalResults}</span> result{totalResults !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>

          {SECTION_CONFIG.map((section) => {
            const items = results?.[section.key] ?? [];
            if (items.length === 0) return null;
            const Icon = section.icon;

            return (
              <div key={section.key} className="rounded-2xl border border-ink-100 bg-white shadow-soft overflow-hidden">
                <div className="flex items-center gap-3 border-b border-ink-100 bg-ink-50 px-6 py-3">
                  <Icon className={cn('h-4 w-4', section.color)} />
                  <h2 className="font-display text-sm font-semibold text-ink-900">{section.label}</h2>
                  <span className="rounded-full bg-ink-200 px-2 py-0.5 text-xs font-bold text-ink-700">
                    {items.length}
                  </span>
                </div>
                <div className="divide-y divide-ink-100">
                  {section.key === 'users' && (results?.users ?? []).map((u) => (
                    <Link
                      key={u.id}
                      href={`/admin/users/${u.id}`}
                      className="flex items-center justify-between gap-3 px-6 py-3 transition hover:bg-ink-50/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink-900">{u.username}</span>
                          <Badge variant="outline">{u.role}</Badge>
                        </div>
                        <p className="text-sm text-ink-500">{u.email}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-ink-400" />
                    </Link>
                  ))}

                  {section.key === 'products' && (results?.products ?? []).map((p) => (
                    <Link
                      key={p.id}
                      href={`/admin/products/${p.id}`}
                      className="flex items-center justify-between gap-3 px-6 py-3 transition hover:bg-ink-50/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink-900 truncate">{p.title}</span>
                          <Badge variant={p.status === 'ACTIVE' ? 'success' : 'outline'}>{p.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-ink-500">
                          <span className="font-semibold text-ink-800">{formatINR(p.pricePaise)}</span>
                          {p.seller && <span>by @{p.seller.username}</span>}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-ink-400" />
                    </Link>
                  ))}

                  {section.key === 'orders' && (results?.orders ?? []).map((o) => (
                    <Link
                      key={o.id}
                      href={`/admin/orders/${o.id}`}
                      className="flex items-center justify-between gap-3 px-6 py-3 transition hover:bg-ink-50/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink-900">#{o.orderNumber}</span>
                          <Badge variant={o.status === 'DELIVERED' ? 'success' : o.status === 'CANCELLED' ? 'default' : 'brand'}>
                            {o.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-ink-500">
                          <span className="font-semibold text-ink-800">{formatINR(o.totalPaise)}</span>
                          <span>{new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-ink-400" />
                    </Link>
                  ))}

                  {section.key === 'sellers' && (results?.sellers ?? []).map((s) => (
                    <Link
                      key={s.id}
                      href={`/admin/sellers/${s.id}`}
                      className="flex items-center justify-between gap-3 px-6 py-3 transition hover:bg-ink-50/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink-900">{s.storeName}</span>
                          <span className="text-sm text-ink-400">@{s.username}</span>
                          {s.isVerified && <Badge variant="success">Verified</Badge>}
                        </div>
                        {s.productCount != null && (
                          <p className="text-sm text-ink-500">{s.productCount} listings</p>
                        )}
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-ink-400" />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
