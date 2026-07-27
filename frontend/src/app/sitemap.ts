import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const apiBase = process.env.API_URL || 'http://localhost:4000';

  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: `${base}/browse`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/sell`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ];

  try {
    const catRes = await fetch(`${apiBase}/api/v1/categories`, { next: { revalidate: 3600 } });
    if (catRes.ok) {
      const catJson = await catRes.json();
      const categories = catJson?.data || catJson;
      if (Array.isArray(categories)) {
        for (const cat of categories) {
          entries.push({
            url: `${base}/browse?category=${cat.slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
          });
        }
      }
    }
  } catch {}

  try {
    const prodRes = await fetch(`${apiBase}/api/v1/products?limit=100&page=1`, { next: { revalidate: 3600 } });
    if (prodRes.ok) {
      const prodJson = await prodRes.json();
      const products = prodJson?.data || prodJson?.products || [];
      if (Array.isArray(products)) {
        for (const product of products) {
          if (product.slug) {
            entries.push({
              url: `${base}/product/${product.slug}`,
              lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
              changeFrequency: 'weekly',
              priority: 0.6,
            });
          }
        }
      }
    }
  } catch {}

  return entries;
}
