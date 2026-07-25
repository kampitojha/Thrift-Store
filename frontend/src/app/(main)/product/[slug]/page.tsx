import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shield, Truck, MapPin, Package, RotateCcw } from 'lucide-react';
import { fetchProduct } from '@/lib/api';
import { formatINR, discountPct } from '@/lib/utils';
import { ProductGallery } from '@/components/product/product-gallery';
import { ProductActions } from './product-actions';
import { SellerCard } from '@/components/product/seller-card';
import { WishlistButton } from '@/components/product/wishlist-button';
import { ShareButton } from '@/components/product/share-button';
import { ReportButton } from '@/components/product/report-button';
import { ReviewsList } from '@/components/product/reviews-list';
import { RecentlyViewedTracker } from '@/components/product/recently-viewed-tracker';

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
        description: p.description?.slice(0, 160),
        images: p.media?.[0]?.url ? [{ url: p.media[0].url }] : [],
      },
    };
  } catch {
    return { title: 'Product · Reloom' };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  let product: Awaited<ReturnType<typeof fetchProduct>>;
  try {
    product = await fetchProduct(slug);
  } catch {
    if (['nike', 'levis', 'zara', 'casio'].some((b) => slug.includes(b))) {
      product = DEMO(slug);
    } else {
      notFound();
    }
  }

  const pct = discountPct(product.pricePaise, product.originalPricePaise);
  const images = product.media?.length > 0
    ? product.media
    : [{ id: '1', url: product.thumbnailUrl || 'https://placehold.co/800x1000', isPrimary: true }];

  const productUrl = typeof window !== 'undefined'
    ? window.location.href
    : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/product/${product.slug}`;

  return (
    <div className="container-page py-8 lg:py-12">
      <RecentlyViewedTracker product={product} />
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        {/* Gallery */}
        <div>
          <ProductGallery images={images} title={product.title} />
        </div>

        {/* Details */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              {(product.brandName || product.brand?.name) && (
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
                  {product.brandName || product.brand?.name}
                </p>
              )}
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
                {product.title}
              </h1>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <WishlistButton productId={product.id} initialWishlisted={false} />
              <ShareButton title={product.title} url={productUrl} />
            </div>
          </div>

          {/* Price */}
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-ink-900">
              {formatINR(product.pricePaise)}
            </span>
            {product.originalPricePaise && product.originalPricePaise > product.pricePaise && (
              <>
                <span className="text-base text-ink-400 line-through">
                  {formatINR(product.originalPricePaise)}
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  {pct}% off
                </span>
              </>
            )}
          </div>

          {/* Condition & Details Tags */}
          <div className="mt-4 flex flex-wrap gap-2">
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
            {product.category && (
              <Link
                href={`/browse?category=${product.category.slug}`}
                className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
              >
                {product.category.name}
              </Link>
            )}
          </div>

          <ProductActions productId={product.id} slug={product.slug} />

          {/* Trust Badges */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2.5 rounded-2xl border border-ink-100 bg-white px-4 py-3">
              <Shield className="h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <p className="text-xs font-medium text-ink-900">Buyer protection</p>
                <p className="text-[11px] text-ink-400">Secure payments & dispute support</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl border border-ink-100 bg-white px-4 py-3">
              <Truck className="h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <p className="text-xs font-medium text-ink-900">Tracked shipping</p>
                <p className="text-[11px] text-ink-400">{product.city || 'Pan-India delivery'}</p>
              </div>
            </div>
          </div>

          {/* Shipping & Returns Info */}
          <div className="mt-4 rounded-2xl border border-ink-100 bg-white p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-ink-600">
                <Package className="h-4 w-4" />
                <span>Shipping</span>
              </div>
              <span className="font-medium text-ink-900">Calculated at checkout</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-ink-600">
                <RotateCcw className="h-4 w-4" />
                <span>Returns</span>
              </div>
              <span className="font-medium text-ink-900">7 days</span>
            </div>
          </div>

          {/* Description */}
          <div className="mt-8 border-t border-ink-100 pt-8">
            <h2 className="text-sm font-semibold text-ink-900">Description</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-600">
              {product.description}
            </p>
          </div>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/browse?q=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-ink-50 px-3 py-1 text-xs text-ink-500 hover:bg-ink-100 hover:text-ink-700"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Seller Card */}
          <div className="mt-6">
            <SellerCard seller={product.seller ?? null} />
          </div>

          {/* Reviews */}
          <div className="mt-8 border-t border-ink-100 pt-8">
            <h2 className="font-display text-xl font-semibold text-ink-900">Reviews</h2>
            <div className="mt-4">
              <ReviewsList productId={product.id} />
            </div>
          </div>

          {/* Report */}
          <div className="mt-4 flex justify-end">
            <ReportButton productId={product.id} />
          </div>
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
    category: { id: 'cat1', name: 'Clothing', slug: 'clothing' },
    tags: ['thrift', 'preloved', 'vintage'],
    media: [{ id: '1', url: 'https://placehold.co/800x1000/1a1a1a/fff?text=Reloom', isPrimary: true }],
    seller: {
      id: 's1',
      username: 'vintage_vault',
      displayName: 'Vintage Vault',
      isVerified: true,
      city: 'Mumbai',
      bio: 'Curating the best vintage finds since 2024.',
      profile: { averageRating: 4.8, itemsSold: 42, totalReviews: 28 },
      sellerProfile: { storeName: 'Vintage Vault', storeSlug: 'vintage-vault', verificationStatus: 'APPROVED', rating: 4.8, totalSales: 42 },
    },
  } as any;
}
