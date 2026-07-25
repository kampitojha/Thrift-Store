import type { Metadata } from 'next';
import { ProductCard } from '@/components/product/product-card';
import { fetchProducts, fetchCategories } from '@/lib/api';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Browse',
  description: 'Browse thrift fashion, sneakers, luxury and more on Reloom.',
};

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function BrowsePage({ searchParams }: Props) {
  const params = await searchParams;
  let products: Awaited<ReturnType<typeof fetchProducts>> | null = null;
  let categories: Awaited<ReturnType<typeof fetchCategories>> | null = null;

  try {
    [products, categories] = await Promise.all([
      fetchProducts({
        q: params.q,
        category: params.category,
        sort: params.sort || 'newest',
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        condition: params.condition,
        page: params.page || '1',
        limit: 24,
      }),
      fetchCategories().catch(() => null),
    ]);
  } catch {
    products = { data: [], meta: { page: 1, limit: 24, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  }

  const items = products?.data ?? [];
  const meta = products?.meta;

  return (
    <div className="container-page py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">
          {params.category
            ? params.category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            : params.q
              ? `Results for “${params.q}”`
              : 'Browse marketplace'}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {meta?.total != null ? `${meta.total} items` : 'Discover pre-loved finds'}
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="w-full shrink-0 space-y-6 lg:w-56">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">Sort</h3>
            <div className="mt-3 flex flex-wrap gap-2 lg:flex-col">
              {[
                ['newest', 'Newest'],
                ['price_asc', 'Price ↑'],
                ['price_desc', 'Price ↓'],
                ['trending', 'Trending'],
                ['popular', 'Most loved'],
              ].map(([value, label]) => (
                <Link
                  key={value}
                  href={`/browse?${new URLSearchParams({ ...params, sort: value } as Record<string, string>).toString()}`}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    (params.sort || 'newest') === value
                      ? 'bg-ink-900 text-white'
                      : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {categories && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                Categories
              </h3>
              <ul className="mt-3 space-y-1">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/browse?category=${c.slug}`}
                      className={`block rounded-lg px-2 py-1.5 text-sm ${
                        params.category === c.slug
                          ? 'bg-brand-50 font-medium text-brand-800'
                          : 'text-ink-600 hover:bg-ink-50'
                      }`}
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <div className="min-w-0 flex-1">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink-200 bg-white py-24 text-center">
              <p className="text-lg font-medium text-ink-800">No items found</p>
              <p className="mt-2 text-sm text-ink-500">Try a different filter or check back soon.</p>
              <Link href="/browse" className="mt-6 inline-block text-sm font-medium text-brand-700">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {items.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
