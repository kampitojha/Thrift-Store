import Link from 'next/link';
import Image from 'next/image';
import { Heart, BadgeCheck } from 'lucide-react';
import type { ProductLike } from '@/lib/api';
import { cn, discountPct, formatINR } from '@/lib/utils';

function thumb(p: ProductLike) {
  return (
    p.thumbnailUrl ||
    p.media?.[0]?.url ||
    'https://placehold.co/600x750/f2e8db/5d362a?text=TS'
  );
}

function brand(p: ProductLike) {
  return p.brandName || p.brand?.name || null;
}

export function ProductCard({ product }: { product: ProductLike; index?: number }) {
  const pct = discountPct(product.pricePaise, product.originalPricePaise);
  const img = thumb(product);

  return (
    <article className="group relative">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-ink-100">
          <Image
            src={img}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized={img.includes('placehold.co')}
          />
          {pct > 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-ink-900/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
              −{pct}%
            </span>
          )}
          <span
            aria-hidden
            className={cn(
              'absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full',
              'bg-white/90 text-ink-700 opacity-0 shadow-soft backdrop-blur transition',
              'group-hover:opacity-100',
            )}
          >
            <Heart className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-3 space-y-1 px-0.5">
          <div className="flex items-center justify-between gap-2">
            {brand(product) ? (
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                {brand(product)}
              </p>
            ) : (
              <span />
            )}
            {product.seller?.isVerified && (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand-600" />
            )}
          </div>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink-900">
            {product.title}
          </h3>
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-[15px] font-semibold tracking-tight text-ink-900">
              {formatINR(product.pricePaise)}
            </span>
            {product.originalPricePaise &&
              product.originalPricePaise > product.pricePaise && (
                <span className="text-xs text-ink-400 line-through">
                  {formatINR(product.originalPricePaise)}
                </span>
              )}
          </div>
          {product.city && <p className="text-[11px] text-ink-400">{product.city}</p>}
        </div>
      </Link>
    </article>
  );
}
