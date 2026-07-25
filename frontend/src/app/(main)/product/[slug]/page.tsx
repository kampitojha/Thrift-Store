import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, MapPin, Shield, Truck } from 'lucide-react';
import { fetchProduct } from '@/lib/api';
import { formatINR, discountPct } from '@/lib/utils';
import { ProductActions } from './product-actions';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await fetchProduct(slug);
    return {
      title: p.title,
      description: p.description?.slice(0, 160),
      openGraph: {
        title: p.title,
        images: p.media?.[0]?.url ? [p.media[0].url] : [],
      },
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  let product: Awaited<ReturnType<typeof fetchProduct>>;

  try {
    product = await fetchProduct(slug);
  } catch {
    // Demo fallback for offline API
    if (slug.includes('nike') || slug.includes('levis') || slug.includes('zara') || slug.includes('casio')) {
      product = DEMO(slug);
    } else {
      notFound();
    }
  }

  const pct = discountPct(product.pricePaise, product.originalPricePaise);
  const images =
    product.media?.length > 0
      ? product.media
      : [{ id: '1', url: product.thumbnailUrl || 'https://placehold.co/800x1000', isPrimary: true }];

  return (
    <div className="container-page py-8 lg:py-12">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-ink-100">
            <Image
              src={images[0].url}
              alt={product.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            {pct > 0 && (
              <span className="absolute left-4 top-4 rounded-full bg-ink-900/90 px-3 py-1 text-xs font-semibold text-white">
                −{pct}% off
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.slice(0, 4).map((m, i) => (
                <div
                  key={'id' in m && m.id ? String(m.id) : m.url + i}
                  className="relative aspect-square overflow-hidden rounded-xl bg-ink-100"
                >
                  <Image src={m.url} alt="" fill className="object-cover" sizes="120px" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {(product.brandName || product.brand?.name) && (
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
              {product.brandName || product.brand?.name}
            </p>
          )}
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            {product.title}
          </h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-ink-900">
              {formatINR(product.pricePaise)}
            </span>
            {product.originalPricePaise && product.originalPricePaise > product.pricePaise && (
              <span className="text-base text-ink-400 line-through">
                {formatINR(product.originalPricePaise)}
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {product.condition && (
              <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-700">
                {product.condition.replace(/_/g, ' ')}
              </span>
            )}
            {product.size && (
              <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-700">
                Size {product.size}
              </span>
            )}
            {product.color && (
              <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-700">
                {product.color}
              </span>
            )}
          </div>

          <ProductActions productId={product.id} slug={product.slug} />

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Shield, label: 'Buyer protection' },
              { icon: Truck, label: 'Tracked shipping' },
              { icon: MapPin, label: product.city || 'Pan-India' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-3 py-3 text-xs font-medium text-ink-600"
              >
                <Icon className="h-4 w-4 text-brand-600" />
                {label}
              </div>
            ))}
          </div>

          <div className="mt-10 border-t border-ink-100 pt-8">
            <h2 className="text-sm font-semibold text-ink-900">Description</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-600">
              {product.description}
            </p>
          </div>

          {product.seller && (
            <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Seller</p>
              <Link
                href={`/profile/${product.seller.username}`}
                className="mt-3 flex items-center gap-3"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 font-semibold text-ink-700">
                  {product.seller.username.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-medium text-ink-900">
                    @{product.seller.username}
                    {product.seller.isVerified && (
                      <BadgeCheck className="h-4 w-4 text-brand-600" />
                    )}
                  </div>
                  <p className="text-xs text-ink-500">View profile & more listings</p>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DEMO(slug: string) {
  return {
    id: 'demo',
    title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    slug,
    description:
      'Authentic pre-loved item in excellent condition. Carefully stored and shipped with care. Message the seller for measurements or more photos.',
    pricePaise: 249900,
    originalPricePaise: 499900,
    condition: 'LIKE_NEW',
    size: 'M',
    color: 'Black',
    city: 'Mumbai',
    brandName: 'Brand',
    media: [{ id: '1', url: 'https://placehold.co/800x1000/1a1a1a/fff?text=Reloom', isPrimary: true }],
    seller: { id: 's1', username: 'vintage_vault', isVerified: true },
  };
}
