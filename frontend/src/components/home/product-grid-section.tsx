import Link from 'next/link';
import type { ProductLike } from '@/lib/api';
import { ProductCard } from '@/components/product/product-card';

export function ProductGridSection({
  title,
  subtitle,
  products,
  href = '/browse',
}: {
  title: string;
  subtitle?: string;
  products: ProductLike[];
  href?: string;
}) {
  if (!products?.length) return null;

  return (
    <section className="container-page py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
        </div>
        <Link href={href} className="shrink-0 text-sm font-medium text-brand-700 hover:underline">
          See more
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={normalize(p)} index={i} />
        ))}
      </div>
    </section>
  );
}

function normalize(p: ProductLike): ProductLike {
  return {
    ...p,
    thumbnailUrl: p.thumbnailUrl || p.media?.[0]?.url || null,
    brandName: p.brandName || p.brand?.name || null,
  };
}
