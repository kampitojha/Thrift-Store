import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Calendar, Shield, BadgeCheck, Star, Package } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { formatINR } from '@/lib/utils';
import { StoreFollowButton } from './store-follow-button';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const store = await getStore(slug);
    return {
      title: `${store.storeName} · Thrift Store`,
      description: store.storeDescription || `Shop from ${store.storeName} on Thrift Store.`,
    };
  } catch {
    return { title: 'Store · Thrift Store' };
  }
}

async function getStore(slug: string) {
  const res = await fetch(
    `${process.env.API_URL || 'http://localhost:4000'}/api/v1/sellers/store/${slug}`,
    { next: { revalidate: 30 } },
  );
  if (!res.ok) return null;
  return res.json().then((r: any) => r.data || r);
}

async function getStoreListings(slug: string, page = 1) {
  const res = await fetch(
    `${process.env.API_URL || 'http://localhost:4000'}/api/v1/sellers/store/${slug}/listings?page=${page}&limit=24`,
    { next: { revalidate: 30 } },
  );
  if (!res.ok) return { data: [], meta: null };
  return res.json().then((r: any) => r.data || r);
}

export default async function StorePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Number(pageStr) || 1;

  const store = await getStore(slug);
  if (!store) notFound();

  const user = store.user || store;
  const profile = user.profile || {};
  const sellerProfile = store;

  const listings = await getStoreListings(slug, page);
  const items = listings?.data || [];
  const meta = listings?.meta;

  const joinedDate = new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long',
  });

  return (
    <div>
      {/* Store Header */}
      <div className="bg-gradient-to-b from-brand-50 to-white">
        <div className="container-page py-10">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-ink-100 text-2xl font-bold text-ink-700 shadow-soft">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                (sellerProfile.storeName || user.username || 'S').slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">
                  {sellerProfile.storeName || user.displayName || user.username}
                </h1>
                {user.isVerified && <BadgeCheck className="h-6 w-6 text-brand-600" />}
              </div>
              {sellerProfile.storeDescription && (
                <p className="mt-2 text-sm text-ink-500 max-w-xl">
                  {sellerProfile.storeDescription}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-ink-400 sm:justify-start">
                {sellerProfile.rating ? (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    {sellerProfile.rating.toFixed(1)}
                  </span>
                ) : null}
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  {sellerProfile.totalSales || profile.itemsSold || 0} sales
                </span>
                {user.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {user.city}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {joinedDate}
                </span>
                <span>{user._count?.followers || 0} followers</span>
              </div>
            </div>
            <StoreFollowButton storeSlug={slug} />
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="border-b border-ink-100 bg-white">
        <div className="container-page flex flex-wrap justify-center gap-6 py-3 text-xs text-ink-500 sm:justify-start">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-600" />
            Verified seller
          </span>
          {sellerProfile.verificationStatus === 'APPROVED' && (
            <span className="flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-brand-600" />
              Identity verified
            </span>
          )}
          <span className="text-ink-300">|</span>
          <span>Response rate: ~100%</span>
        </div>
      </div>

      {/* Listings */}
      <div className="container-page py-8">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink-900">
          Listings
          {meta ? <span className="text-sm font-normal text-ink-400"> ({meta.total})</span> : null}
        </h2>

        {items.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-ink-200 py-20 text-center">
            <p className="text-ink-600">No listings yet</p>
            <p className="mt-1 text-sm text-ink-400">Check back soon for new arrivals.</p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((p: any) => (
                <Link key={p.id} href={`/product/${p.slug}`} className="group">
                  <article>
                    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-ink-100">
                      <img
                        src={p.thumbnailUrl || 'https://placehold.co/600x750/f2e8db/5d362a?text=TS'}
                        alt={p.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      {p.originalPricePaise && p.originalPricePaise > p.pricePaise && (
                        <span className="absolute left-2 top-2 rounded-full bg-ink-900/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {Math.round(((p.originalPricePaise - p.pricePaise) / p.originalPricePaise) * 100)}% off
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 space-y-1 px-0.5">
                      {p.brandName && (
                        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">
                          {p.brandName}
                        </p>
                      )}
                      <h3 className="line-clamp-2 text-sm font-medium text-ink-900">{p.title}</h3>
                      <p className="text-sm font-semibold">{formatINR(p.pricePaise)}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="mt-10 text-center">
                {meta.hasPrev && (
                  <Link
                    href={`/store/${slug}?page=${page - 1}`}
                    className="rounded-full bg-ink-100 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-200"
                  >
                    Previous page
                  </Link>
                )}
                <span className="mx-4 text-sm text-ink-400">
                  Page {meta.page} of {meta.totalPages}
                </span>
                {meta.hasNext && (
                  <Link
                    href={`/store/${slug}?page=${page + 1}`}
                    className="rounded-full bg-ink-100 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-200"
                  >
                    Next page
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
