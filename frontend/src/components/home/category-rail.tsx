import Link from 'next/link';
import type { CategoryTree } from '@/lib/api';

const FALLBACK: CategoryTree[] = [
  { id: '1', name: 'Clothing', slug: 'clothing' },
  { id: '2', name: 'Shoes', slug: 'shoes' },
  { id: '3', name: 'Bags', slug: 'bags' },
  { id: '4', name: 'Watches', slug: 'watches' },
  { id: '5', name: 'Electronics', slug: 'electronics' },
  { id: '6', name: 'Luxury', slug: 'luxury' },
  { id: '7', name: 'Vintage', slug: 'vintage' },
  { id: '8', name: 'Gaming', slug: 'gaming' },
];

export function CategoryRail({ categories }: { categories?: CategoryTree[] }) {
  const items = categories?.length ? categories : FALLBACK;

  return (
    <section className="container-page py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900">
            Shop by category
          </h2>
          <p className="mt-1 text-sm text-ink-500">Everything thrift, nothing ordinary</p>
        </div>
        <Link href="/browse" className="text-sm font-medium text-brand-700 hover:underline">
          View all
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {items.map((cat) => (
          <Link
            key={cat.id}
            href={`/browse?category=${cat.slug}`}
            className="group flex min-w-[120px] flex-col items-center gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 text-lg font-semibold text-brand-800 transition group-hover:from-brand-200">
              {cat.name.slice(0, 1)}
            </span>
            <span className="text-center text-xs font-medium text-ink-800">{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
