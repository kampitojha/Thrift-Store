'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Users, ShoppingCart, ScrollText, Server, Settings, Bug, FileText, ArrowRight, Clock, RefreshCcw, Filter, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type SearchResults = {
  results: Array<{
    type: string;
    id: string;
    label: string;
    description?: string;
    url?: string;
    score?: number;
  }>;
  total: number;
  query: string;
};

const TYPE_CONFIG = [
  { key: 'users', label: 'Users', icon: Users },
  { key: 'orders', label: 'Orders', icon: ShoppingCart },
  { key: 'logs', label: 'Logs', icon: ScrollText },
  { key: 'jobs', label: 'Jobs', icon: Server },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  users: <Users className="h-4 w-4" />,
  orders: <ShoppingCart className="h-4 w-4" />,
  logs: <ScrollText className="h-4 w-4" />,
  jobs: <Server className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  users: 'User',
  orders: 'Order',
  logs: 'Log',
  jobs: 'Job',
  settings: 'Setting',
};

function getBadgeVariant(type: string, value?: string): 'default' | 'brand' | 'outline' | 'success' {
  if (type === 'users') return value === 'ADMIN' || value === 'SUPER_ADMIN' ? 'brand' : 'outline';
  if (type === 'orders') {
    if (value === 'DELIVERED' || value === 'COMPLETED') return 'success';
    if (value === 'CANCELLED' || value === 'REFUNDED') return 'default';
    return 'brand';
  }
  if (type === 'logs') {
    if (value === 'error' || value === 'ERROR') return 'default';
    if (value === 'warn' || value === 'WARN') return 'brand';
    return 'outline';
  }
  if (type === 'jobs') {
    if (value === 'completed' || value === 'COMPLETED') return 'success';
    if (value === 'failed' || value === 'FAILED') return 'default';
    return 'brand';
  }
  return 'outline';
}

export default function GlobalSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [types, setTypes] = useState<string[]>(['users', 'orders', 'logs', 'jobs', 'settings']);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [debouncedQuery, types]);

  const performSearch = useCallback(async (q: string, activeTypes: string[]) => {
    const trimmed = q.trim();
    if (!trimmed || activeTypes.length === 0) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<SearchResults>(
        '/admin/platform/global-search?q=' + encodeURIComponent(trimmed) + '&types=' + activeTypes.join(',')
      );
      setResults(res);
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    performSearch(debouncedQuery, types);
  }, [debouncedQuery, types, performSearch]);

  const toggleType = (key: string) => {
    setTypes((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const flattenedResults = useMemo(() => {
    if (!results) return [];
    return results.results;
  }, [results]);

  const groupedResults = useMemo(() => {
    if (!results) return TYPE_CONFIG.map((t) => ({ ...t, items: [] }));
    return TYPE_CONFIG.map((t) => ({
      ...t,
      items: results.results.filter((r) => r.type === t.key),
    })).filter((g) => g.items.length > 0);
  }, [results]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = flattenedResults;
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const item = items[selectedIndex];
      if (item.url) {
        router.push(item.url);
      }
    }
  };

  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const hasActiveSearch = debouncedQuery.trim().length > 0;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
          <Search className="h-6 w-6 text-brand-600" />
          Global Search
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Search across users, orders, logs, jobs, and settings
        </p>
      </div>

      <div className="space-y-6">
        <div className="relative" role="combobox" aria-expanded={hasActiveSearch && flattenedResults.length > 0} aria-haspopup="listbox" aria-label="Global search">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <input
              ref={inputRef}
              type="text"
              role="searchbox"
              aria-label="Search query"
              placeholder="Search users, orders, logs, jobs, settings..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-14 w-full rounded-2xl border border-ink-200 bg-white pl-12 pr-12 text-base text-ink-900 shadow-soft placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setDebouncedQuery(''); inputRef.current?.focus(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Search type filters">
          <Filter className="h-4 w-4 text-ink-400" />
          {TYPE_CONFIG.map((t) => {
            const active = types.includes(t.key);
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => toggleType(t.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  active
                    ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                    : 'bg-ink-50 text-ink-500 ring-1 ring-ink-200 hover:bg-ink-100',
                )}
                aria-pressed={active}
                aria-label={`Filter ${t.label}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-4" aria-label="Search results loading">
            {TYPE_CONFIG.filter((t) => types.includes(t.key)).map((t) => (
              <div key={t.key} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
                <Skeleton className="h-5 w-32 mb-4" />
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full mb-3" />
                ))}
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-dashed border-red-200 bg-red-50 py-24 text-center">
            <Bug className="mx-auto h-12 w-12 text-red-400" />
            <p className="mt-4 text-lg font-medium text-red-800">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => performSearch(debouncedQuery, types)}>
              <RefreshCcw className="mr-1.5 h-4 w-4" />Retry
            </Button>
          </div>
        ) : !hasActiveSearch ? (
          <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
            <Search className="mx-auto h-16 w-16 text-ink-200" />
            <p className="mt-6 text-lg font-medium text-ink-800">Start typing to search</p>
            <p className="mt-1 text-sm text-ink-500">
              Search across users, orders, logs, jobs, and settings
            </p>
          </div>
        ) : results && results.total === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
            <FileText className="mx-auto h-12 w-12 text-ink-300" />
            <p className="mt-4 text-lg font-medium text-ink-800">No results found</p>
            <p className="text-sm text-ink-500">
              No results found for &ldquo;{debouncedQuery}&rdquo;. Try a different search term or adjust your type filters.
            </p>
          </div>
        ) : results ? (
          <div>
            <p className="mb-4 text-sm text-ink-500">
              Found <span className="font-semibold text-ink-900">{results.total}</span> result{results.total !== 1 ? 's' : ''} for
              &ldquo;{results.query}&rdquo;
            </p>
            <div ref={listRef} role="listbox" aria-label="Search results" className="space-y-6">
              {groupedResults.map((group) => (
                <div key={group.key} className="rounded-2xl border border-ink-100 bg-white shadow-soft overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-ink-100 bg-ink-50 px-6 py-3">
                    <group.icon className="h-4 w-4 text-ink-500" />
                    <h2 className="font-display text-sm font-semibold text-ink-900">{group.label}</h2>
                    <span className="rounded-full bg-ink-200 px-2 py-0.5 text-xs font-bold text-ink-700">
                      {group.items.length}
                    </span>
                  </div>
                  <div className="divide-y divide-ink-100">
                    {group.items.map((item, idx) => {
                      const globalIndex = flattenedResults.indexOf(item);
                      const IconComponent = TYPE_ICONS[item.type] || <FileText className="h-4 w-4" />;
                      const label = TYPE_LABELS[item.type] || item.type;
                      return (
                        <Link
                          key={item.id}
                          href={item.url || '#'}
                          role="option"
                          aria-selected={selectedIndex === globalIndex}
                          data-index={globalIndex}
                          className={cn(
                            'flex items-center justify-between gap-4 px-6 py-3.5 transition',
                            selectedIndex === globalIndex ? 'bg-brand-50/50' : 'hover:bg-ink-50/50',
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                              item.type === 'users' && 'bg-blue-50 text-blue-600',
                              item.type === 'orders' && 'bg-amber-50 text-amber-600',
                              item.type === 'logs' && 'bg-violet-50 text-violet-600',
                              item.type === 'jobs' && 'bg-emerald-50 text-emerald-600',
                              item.type === 'settings' && 'bg-ink-100 text-ink-600',
                            )}>
                              {IconComponent}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-ink-900 truncate">{item.label}</span>
                                <Badge variant={getBadgeVariant(item.type, item.label)} className="shrink-0">
                                  {label}
                                </Badge>
                              </div>
                              {item.description && (
                                <p className="text-sm text-ink-500 truncate">{item.description}</p>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-ink-400" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
