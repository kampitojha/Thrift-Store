import { Hero } from '@/components/home/hero';
import { CategoryRail } from '@/components/home/category-rail';
import { ProductGridSection } from '@/components/home/product-grid-section';
import { fetchHome, fetchProducts } from '@/lib/api';

export const revalidate = 60;

export default async function HomePage() {
  let home: Awaited<ReturnType<typeof fetchHome>> | null = null;
  let products: Awaited<ReturnType<typeof fetchProducts>> | null = null;

  try {
    [home, products] = await Promise.all([
      fetchHome().catch(() => null),
      fetchProducts({ sort: 'newest', limit: 8 }).catch(() => null),
    ]);
  } catch {
    /* API offline — show marketing shell */
  }

  const featured = home?.featured?.length
    ? home.featured
    : products?.data || DEMO_PRODUCTS;
  const trending = home?.trending?.length ? home.trending : DEMO_PRODUCTS.slice().reverse();

  return (
    <>
      <Hero />
      <CategoryRail categories={home?.categories} />
      <ProductGridSection
        title="Just dropped"
        subtitle="Fresh listings from the community"
        products={featured}
        href="/browse?sort=newest"
      />
      <section className="container-page py-6">
        <div className="overflow-hidden rounded-3xl bg-ink-900 px-8 py-12 text-center text-white sm:px-14 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
            Sell with Reloom
          </p>
          <h2 className="mx-auto mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            List in minutes. Get paid securely.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-ink-300">
            AI titles & pricing, verified buyers, and wallet payouts — built for serious sellers.
          </p>
          <a
            href="/sell"
            className="mt-8 inline-flex h-12 items-center rounded-full bg-white px-8 text-sm font-semibold text-ink-900 transition hover:bg-brand-100"
          >
            Open seller dashboard
          </a>
        </div>
      </section>
      <ProductGridSection
        title="Trending now"
        subtitle="What everyone is viewing"
        products={trending}
        href="/browse?sort=trending"
      />
    </>
  );
}

const DEMO_PRODUCTS = [
  {
    id: 'd1',
    title: 'Nike Air Force 1 Low White — Size UK 9',
    slug: 'nike-air-force-1-low-white-uk9',
    pricePaise: 549900,
    originalPricePaise: 899900,
    brandName: 'Nike',
    city: 'Mumbai',
    thumbnailUrl: 'https://placehold.co/600x750/1a1a1a/fff?text=Nike+AF1',
    seller: { id: 's1', username: 'vintage_vault', isVerified: true },
  },
  {
    id: 'd2',
    title: "Vintage Levi's 501 Denim Jacket — M",
    slug: 'vintage-levis-501-denim-jacket-m',
    pricePaise: 249900,
    originalPricePaise: 499900,
    brandName: "Levi's",
    city: 'Delhi',
    thumbnailUrl: 'https://placehold.co/600x750/2c3e50/fff?text=Levis',
    seller: { id: 's1', username: 'vintage_vault', isVerified: true },
  },
  {
    id: 'd3',
    title: 'Zara Oversized Blazer — Black — S',
    slug: 'zara-oversized-blazer-black-s',
    pricePaise: 189900,
    originalPricePaise: 399900,
    brandName: 'Zara',
    city: 'Bangalore',
    thumbnailUrl: 'https://placehold.co/600x750/111/fff?text=Zara',
    seller: { id: 's2', username: 'style_edit', isVerified: false },
  },
  {
    id: 'd4',
    title: 'Casio Vintage Digital Watch A168',
    slug: 'casio-vintage-a168',
    pricePaise: 299900,
    originalPricePaise: 449900,
    brandName: 'Casio',
    city: 'Pune',
    thumbnailUrl: 'https://placehold.co/600x750/333/fff?text=Casio',
    seller: { id: 's3', username: 'timepiece_in', isVerified: true },
  },
];
