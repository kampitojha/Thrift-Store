'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, SlidersHorizontal, ChevronLeft, ChevronRight, Search, RotateCcw } from 'lucide-react';
import { ProductCard } from '@/components/product/product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient, ProductLike, PaginationMeta, CategoryTree } from '@/lib/api';
import { cn } from '@/lib/utils';

const CONDITIONS = [
  { value: 'NEW_WITH_TAGS', label: 'New with tags' },
  { value: 'NEW_WITHOUT_TAGS', label: 'New without tags' },
  { value: 'LIKE_NEW', label: 'Like new' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
];

const GENDERS = [
  { value: 'MEN', label: 'Men' },
  { value: 'WOMEN', label: 'Women' },
  { value: 'UNISEX', label: 'Unisex' },
  { value: 'KIDS', label: 'Kids' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'trending', label: 'Trending' },
  { value: 'popular', label: 'Most loved' },
  { value: 'rating', label: 'Top rated' },
];

const COLOR_OPTIONS = [
  { value: 'Black', label: 'Black' },
  { value: 'White', label: 'White' },
  { value: 'Gray', label: 'Gray' },
  { value: 'Red', label: 'Red' },
  { value: 'Blue', label: 'Blue' },
  { value: 'Green', label: 'Green' },
  { value: 'Yellow', label: 'Yellow' },
  { value: 'Pink', label: 'Pink' },
  { value: 'Purple', label: 'Purple' },
  { value: 'Orange', label: 'Orange' },
  { value: 'Brown', label: 'Brown' },
  { value: 'Beige', label: 'Beige' },
  { value: 'Navy', label: 'Navy' },
  { value: 'Gold', label: 'Gold' },
  { value: 'Silver', label: 'Silver' },
  { value: 'Multicolor', label: 'Multicolor' },
];

const SIZE_OPTIONS = [
  { value: 'XS', label: 'XS' },
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
  { value: 'XXL', label: 'XXL' },
  { value: '3XL', label: '3XL' },
  { value: '4XL', label: '4XL' },
  { value: '28', label: '28' },
  { value: '30', label: '30' },
  { value: '32', label: '32' },
  { value: '34', label: '34' },
  { value: '36', label: '36' },
  { value: '38', label: '38' },
  { value: '40', label: '40' },
  { value: '42', label: '42' },
  { value: '44', label: '44' },
  { value: 'One Size', label: 'One Size' },
];

type Filters = {
  q: string;
  category: string;
  brand: string;
  condition: string;
  gender: string;
  color: string;
  size: string;
  minPrice: string;
  maxPrice: string;
  city: string;
  sort: string;
};

const DEFAULT_FILTERS: Filters = {
  q: '',
  category: '',
  brand: '',
  condition: '',
  gender: '',
  color: '',
  size: '',
  minPrice: '',
  maxPrice: '',
  city: '',
  sort: 'newest',
};

export function BrowsePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<Filters>(() => ({
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    condition: searchParams.get('condition') || '',
    gender: searchParams.get('gender') || '',
    color: searchParams.get('color') || '',
    size: searchParams.get('size') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    city: searchParams.get('city') || '',
    sort: searchParams.get('sort') || 'newest',
  }));

  const [products, setProducts] = useState<ProductLike[]>([]);
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [page, setPage] = useState(() => parseInt(searchParams.get('page') || '1'));

  const hasActiveFilters = Object.entries(filters).some(
    ([k, v]) => k !== 'sort' && v !== '',
  );

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => k !== 'sort' && v !== '',
  ).length;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '24' };
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const res = await apiClient.get<{ data: ProductLike[]; meta: PaginationMeta }>(
        `/products?${new URLSearchParams(params).toString()}`,
        { revalidate: 30 },
      );
      setProducts(res.data ?? []);
      setMeta(res.meta);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v && k !== 'q') params.set(k, v);
    });
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(qs ? `/browse?${qs}` : '/browse', { scroll: false });
  }, [filters, page, router]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    apiClient
      .get<CategoryTree[]>('/categories', { revalidate: 3600, tags: ['categories'] })
      .then(setCategories)
      .catch(() => {});
  }, []);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const removeFilter = (key: keyof Filters) => {
    updateFilter(key, '');
  };

  const pageTitle = filters.category
    ? categories.find((c) => c.slug === filters.category)?.name ||
      filters.category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : filters.q
      ? `Results for "${filters.q}"`
      : 'Browse marketplace';

  return (
    <div className="min-h-screen bg-white">
      <div className="container-page py-8">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              {meta ? `${meta.total} item${meta.total !== 1 ? 's' : ''}` : 'Discover pre-loved finds'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileFiltersOpen(true)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Desktop Sidebar */}
          <aside className="hidden w-60 shrink-0 space-y-6 lg:block">
            <FilterSection
              categories={categories}
              filters={filters}
              updateFilter={updateFilter}
              clearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
              activeFilterCount={activeFilterCount}
            />
          </aside>

          {/* Main Content */}
          <div className="min-w-0 flex-1">
            {/* Active Filter Tags */}
            {hasActiveFilters && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {filters.category && (
                  <FilterTag label={filters.category.replace(/-/g, ' ')} onRemove={() => removeFilter('category')} />
                )}
                {filters.condition && (
                  <FilterTag label={CONDITIONS.find((c) => c.value === filters.condition)?.label || filters.condition} onRemove={() => removeFilter('condition')} />
                )}
                {filters.gender && (
                  <FilterTag label={GENDERS.find((g) => g.value === filters.gender)?.label || filters.gender} onRemove={() => removeFilter('gender')} />
                )}
                {filters.color && (
                  <FilterTag label={filters.color} onRemove={() => removeFilter('color')} />
                )}
                {filters.size && (
                  <FilterTag label={`Size ${filters.size}`} onRemove={() => removeFilter('size')} />
                )}
                {filters.brand && (
                  <FilterTag label={filters.brand} onRemove={() => removeFilter('brand')} />
                )}
                {filters.city && (
                  <FilterTag label={filters.city} onRemove={() => removeFilter('city')} />
                )}
                {filters.minPrice && (
                  <FilterTag label={`Min ₹${(+filters.minPrice / 100).toLocaleString('en-IN')}`} onRemove={() => removeFilter('minPrice')} />
                )}
                {filters.maxPrice && (
                  <FilterTag label={`Max ₹${(+filters.maxPrice / 100).toLocaleString('en-IN')}`} onRemove={() => removeFilter('maxPrice')} />
                )}
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-200"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear all
                </button>
              </div>
            )}

            {/* Sort Bar */}
            <div className="mb-6 flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Sort</span>
              <Select
                value={filters.sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                options={SORT_OPTIONS}
                className="w-48"
              />
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[4/5] rounded-2xl" />
                    <Skeleton className="h-4 w-1/3 rounded-lg" />
                    <Skeleton className="h-4 w-2/3 rounded-lg" />
                    <Skeleton className="h-5 w-1/4 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-ink-200 bg-white py-24 text-center">
                <Search className="mx-auto h-10 w-10 text-ink-300" />
                <p className="mt-4 text-lg font-medium text-ink-800">No items found</p>
                <p className="mt-2 text-sm text-ink-500">
                  Try adjusting your filters or search terms.
                </p>
                {hasActiveFilters && (
                  <Button variant="brand" size="sm" className="mt-6" onClick={clearFilters}>
                    Clear all filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {products.map((p, i) => (
                    <ProductCard key={p.id} product={p} index={i} />
                  ))}
                </div>

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!meta.hasPrev}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(meta.totalPages, 5) }).map((_, i) => {
                        let pageNum: number;
                        if (meta.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (meta.page <= 3) {
                          pageNum = i + 1;
                        } else if (meta.page >= meta.totalPages - 2) {
                          pageNum = meta.totalPages - 4 + i;
                        } else {
                          pageNum = meta.page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={cn(
                              'flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium transition',
                              meta.page === pageNum
                                ? 'bg-ink-900 text-white'
                                : 'text-ink-500 hover:bg-ink-100',
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!meta.hasNext}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Filters</h2>
              <button onClick={() => setMobileFiltersOpen(false)} className="rounded-full p-2 hover:bg-ink-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterSection
              categories={categories}
              filters={filters}
              updateFilter={updateFilter}
              clearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
              activeFilterCount={activeFilterCount}
              mobile
            />
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={clearFilters}>
                Clear
              </Button>
              <Button
                variant="brand"
                className="flex-1"
                onClick={() => setMobileFiltersOpen(false)}
              >
                Apply filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800">
      {label}
      <button onClick={onRemove} className="rounded-full p-0.5 hover:bg-brand-100" aria-label={`Remove ${label} filter`}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function FilterSection({
  categories,
  filters,
  updateFilter,
  clearFilters,
  hasActiveFilters,
  activeFilterCount,
  mobile,
}: {
  categories: CategoryTree[];
  filters: Filters;
  updateFilter: (key: keyof Filters, value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  mobile?: boolean;
}) {
  const sectionCss = mobile ? '' : 'space-y-6';

  return (
    <div className={sectionCss}>
      {/* Search */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Search</h3>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
            placeholder="Search items..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Category</h3>
          <div className="space-y-1">
            <button
              onClick={() => updateFilter('category', '')}
              className={cn(
                'block w-full rounded-lg px-3 py-1.5 text-left text-sm transition',
                !filters.category ? 'bg-brand-50 font-medium text-brand-800' : 'text-ink-600 hover:bg-ink-50',
              )}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => updateFilter('category', c.slug)}
                className={cn(
                  'block w-full rounded-lg px-3 py-1.5 text-left text-sm transition',
                  filters.category === c.slug ? 'bg-brand-50 font-medium text-brand-800' : 'text-ink-600 hover:bg-ink-50',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price Range */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Price range</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => updateFilter('minPrice', e.target.value ? String(+e.target.value * 100) : '')}
            className="w-full"
          />
          <span className="text-ink-300">–</span>
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => updateFilter('maxPrice', e.target.value ? String(+e.target.value * 100) : '')}
            className="w-full"
          />
        </div>
      </div>

      {/* Condition */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Condition</h3>
        <Select
          value={filters.condition}
          onChange={(e) => updateFilter('condition', e.target.value)}
          options={[{ value: '', label: 'Any condition' }, ...CONDITIONS]}
        />
      </div>

      {/* Gender */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Gender</h3>
        <Select
          value={filters.gender}
          onChange={(e) => updateFilter('gender', e.target.value)}
          options={[{ value: '', label: 'Any' }, ...GENDERS]}
        />
      </div>

      {/* Size */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Size</h3>
        <Select
          value={filters.size}
          onChange={(e) => updateFilter('size', e.target.value)}
          options={[{ value: '', label: 'Any size' }, ...SIZE_OPTIONS]}
        />
      </div>

      {/* Color */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Color</h3>
        <Select
          value={filters.color}
          onChange={(e) => updateFilter('color', e.target.value)}
          options={[{ value: '', label: 'Any color' }, ...COLOR_OPTIONS]}
        />
      </div>

      {/* Brand */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Brand</h3>
        <Input
          value={filters.brand}
          onChange={(e) => updateFilter('brand', e.target.value)}
          placeholder="e.g. Nike, Zara..."
        />
      </div>

      {/* Location */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Location</h3>
        <Input
          value={filters.city}
          onChange={(e) => updateFilter('city', e.target.value)}
          placeholder="City..."
        />
      </div>

      {/* Clear */}
      {hasActiveFilters && !mobile && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          <RotateCcw className="h-4 w-4" />
          Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}
