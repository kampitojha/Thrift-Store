import { PrismaClient, ProductCondition, ProductStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { MeiliSearch } from 'meilisearch';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Reloom@123';

const CATEGORIES = [
  { name: 'Clothing', slug: 'clothing', children: ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Ethnic Wear'] },
  { name: 'Shoes', slug: 'shoes', children: ['Sneakers', 'Boots', 'Heels', 'Flats', 'Sandals'] },
  { name: 'Bags', slug: 'bags', children: ['Handbags', 'Backpacks', 'Totes', 'Clutches', 'Luggage'] },
  { name: 'Watches', slug: 'watches', children: ['Luxury', 'Smartwatches', 'Vintage', 'Casual'] },
  { name: 'Electronics', slug: 'electronics', children: ['Phones', 'Laptops', 'Audio', 'Cameras', 'Accessories'] },
  { name: 'Furniture', slug: 'furniture', children: ['Living Room', 'Bedroom', 'Office', 'Outdoor'] },
  { name: 'Books', slug: 'books', children: ['Fiction', 'Non-Fiction', 'Comics', 'Textbooks'] },
  { name: 'Gaming', slug: 'gaming', children: ['Consoles', 'Games', 'Controllers', 'Accessories'] },
  { name: 'Vintage', slug: 'vintage', children: ['Apparel', 'Home', 'Collectibles'] },
  { name: 'Collectibles', slug: 'collectibles', children: ['Art', 'Memorabilia', 'Toys'] },
  { name: 'Handmade', slug: 'handmade', children: ['Jewelry', 'Crafts', 'Home Decor'] },
  { name: 'Luxury', slug: 'luxury', children: ['Designer Apparel', 'Accessories', 'Shoes', 'Bags'] },
  { name: 'Accessories', slug: 'accessories', children: ['Jewelry', 'Belts', 'Hats', 'Scarves', 'Sunglasses'] },
];

const BRANDS = [
  'Nike', 'Adidas', 'Zara', 'H&M', 'Levi\'s', 'Gucci', 'Louis Vuitton', 'Chanel',
  'Apple', 'Samsung', 'Sony', 'Puma', 'Uniqlo', 'Ralph Lauren', 'Rolex', 'Casio',
  'IKEA', 'Vintage', 'Handmade', 'Other',
];

async function main() {
  console.log('🌱 Seeding Reloom database...');

  for (const cat of CATEGORIES) {
    const parent = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        description: `${cat.name} on Reloom`,
        isActive: true,
      },
    });

    for (let i = 0; i < cat.children.length; i++) {
      const childName = cat.children[i];
      const childSlug = `${cat.slug}-${childName.toLowerCase().replace(/\s+/g, '-')}`;
      await prisma.category.upsert({
        where: { slug: childSlug },
        update: {},
        create: {
          name: childName,
          slug: childSlug,
          parentId: parent.id,
          sortOrder: i,
          isActive: true,
        },
      });
    }
  }

  for (const name of BRANDS) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await prisma.brand.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        isLuxury: ['Gucci', 'Louis Vuitton', 'Chanel', 'Rolex'].includes(name),
      },
    });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@reloom.com' },
    update: { passwordHash },
    create: {
      email: 'admin@reloom.com',
      username: 'reloom_admin',
      displayName: 'Reloom Admin',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      emailVerifiedAt: new Date(),
      isVerified: true,
      status: 'ACTIVE',
      profile: { create: {} },
      wallet: { create: {} },
      loyaltyAccount: { create: { points: 0, level: 1 } },
    },
  });

  const demoSeller = await prisma.user.upsert({
    where: { email: 'seller@reloom.com' },
    update: { passwordHash },
    create: {
      email: 'seller@reloom.com',
      username: 'vintage_vault',
      displayName: 'Vintage Vault',
      passwordHash,
      bio: 'Curated thrift & luxury finds. Ships pan-India.',
      role: UserRole.VERIFIED_SELLER,
      emailVerifiedAt: new Date(),
      isVerified: true,
      status: 'ACTIVE',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'IN',
      profile: { create: { itemsSold: 42, averageRating: 4.8, totalReviews: 38 } },
      wallet: { create: { balancePaise: 1250000n } },
      loyaltyAccount: { create: { points: 500, level: 3, badges: ['early_seller'] } },
      sellerProfile: {
        create: {
          storeName: 'Vintage Vault',
          storeSlug: 'vintage-vault',
          storeDescription: 'Premium pre-loved fashion & collectibles.',
          businessType: 'professional',
          verificationStatus: 'APPROVED',
          identityVerified: true,
          bankVerified: true,
          rating: 4.8,
          totalSales: 42,
        },
      },
    },
    include: { sellerProfile: true },
  });

  const clothing = await prisma.category.findFirst({ where: { slug: 'clothing' } });
  const nike = await prisma.brand.findFirst({ where: { slug: 'nike' } });

  if (clothing && demoSeller) {
    const sampleProducts = [
      {
        title: 'Nike Air Force 1 Low White — Size UK 9',
        slug: 'nike-air-force-1-low-white-uk9',
        description:
          'Authentic Nike AF1 in excellent condition. Minimal creasing, clean sole. Comes with original box.',
        pricePaise: 549900,
        originalPricePaise: 899900,
        condition: ProductCondition.LIKE_NEW,
        size: 'UK 9',
        color: 'White',
        tags: ['nike', 'sneakers', 'af1', 'streetwear'],
      },
      {
        title: 'Vintage Levi\'s 501 Denim Jacket — M',
        slug: 'vintage-levis-501-denim-jacket-m',
        description: 'Classic 90s Levi\'s trucker jacket. Soft fade, no tears. Perfect thrift piece.',
        pricePaise: 249900,
        originalPricePaise: 499900,
        condition: ProductCondition.GOOD,
        size: 'M',
        color: 'Indigo',
        tags: ['levis', 'denim', 'vintage', 'jacket'],
      },
      {
        title: 'Zara Oversized Blazer — Black — S',
        slug: 'zara-oversized-blazer-black-s',
        description: 'Worn twice. Structured shoulders, fully lined. Dry cleaned.',
        pricePaise: 189900,
        originalPricePaise: 399900,
        condition: ProductCondition.LIKE_NEW,
        size: 'S',
        color: 'Black',
        tags: ['zara', 'blazer', 'workwear', 'women'],
      },
    ];

    for (const p of sampleProducts) {
      await prisma.product.upsert({
        where: { slug: p.slug },
        update: {},
        create: {
          ...p,
          sellerId: demoSeller.id,
          categoryId: clothing.id,
          brandId: nike?.id,
          gender: 'UNISEX',
          status: ProductStatus.ACTIVE,
          publishedAt: new Date(),
          allowsShipping: true,
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'IN',
          returnPolicyDays: 7,
          media: {
            create: [
              {
                url: `https://placehold.co/800x1000/1a1a1a/fff?text=${encodeURIComponent(p.title.slice(0, 20))}`,
                isPrimary: true,
                sortOrder: 0,
                altText: p.title,
              },
            ],
          },
        },
      });
    }
  }

  // Reindex products in Meilisearch
  try {
    const meiliHost = process.env.MEILI_HOST || 'http://localhost:7700';
    const meiliKey = process.env.MEILI_MASTER_KEY || '';
    const client = new MeiliSearch({ host: meiliHost, apiKey: meiliKey });
    const index = client.index(process.env.MEILI_INDEX_PRODUCTS || 'products');

    const activeProducts = await prisma.product.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      include: {
        brand: true,
        category: true,
        media: { where: { isPrimary: true }, take: 1 },
        seller: { select: { id: true, username: true, avatarUrl: true, isVerified: true } },
      },
    });

    const documents = activeProducts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description.slice(0, 500),
      pricePaise: p.pricePaise,
      originalPricePaise: p.originalPricePaise,
      condition: p.condition,
      status: p.status,
      gender: p.gender,
      color: p.color,
      size: p.size,
      city: p.city,
      tags: p.tags,
      brandName: p.brand?.name,
      brandSlug: p.brand?.slug,
      categoryName: p.category.name,
      categorySlug: p.category.slug,
      sellerId: p.sellerId,
      sellerUsername: p.seller.username,
      seller: p.seller,
      thumbnailUrl: p.media[0]?.url ?? null,
      viewCount: p.viewCount,
      favoriteCount: p.favoriteCount,
      publishedAt: p.publishedAt?.getTime() ?? p.createdAt.getTime(),
      createdAt: p.createdAt.toISOString(),
    }));

    if (documents.length) {
      await index.addDocuments(documents);
      console.log(`   Indexed ${documents.length} products in Meilisearch`);
    }
  } catch (e) {
    console.warn('   Meilisearch reindex skipped:', (e as Error).message);
  }

  await prisma.featureFlag.createMany({
    data: [
      { key: 'ai_listing', description: 'AI title/description generation', enabled: true },
      { key: 'cod', description: 'Cash on delivery', enabled: true },
      { key: 'offers', description: 'Buyer-seller offers', enabled: true },
      { key: 'live_chat', description: 'Realtime messaging', enabled: true },
      { key: 'gift_cards', description: 'Gift card checkout', enabled: false, rolloutPct: 0 },
    ],
    skipDuplicates: true,
  });

  await prisma.staticPage.createMany({
    data: [
      {
        slug: 'terms',
        title: 'Terms of Service',
        content: '# Terms of Service\n\nWelcome to Reloom...',
      },
      {
        slug: 'privacy',
        title: 'Privacy Policy',
        content: '# Privacy Policy\n\nWe respect your privacy...',
      },
    ],
    skipDuplicates: true,
  });

  await prisma.faq.createMany({
    data: [
      {
        question: 'How does selling on Reloom work?',
        answer: 'Create a seller profile, list your items with photos, and ship when you get an order. We handle payments securely.',
        category: 'selling',
        sortOrder: 1,
      },
      {
        question: 'What is the platform commission?',
        answer: 'Reloom charges a competitive commission on each successful sale. Verified sellers may get reduced rates.',
        category: 'selling',
        sortOrder: 2,
      },
      {
        question: 'How do refunds work?',
        answer: 'If an item is not as described, open a dispute within the return window. Approved refunds go to your wallet or original payment method.',
        category: 'buying',
        sortOrder: 1,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seed complete');
  console.log(`   Admin:  admin@reloom.com / ${DEMO_PASSWORD}`);
  console.log(`   Seller: seller@reloom.com / ${DEMO_PASSWORD}`);
  console.log(`   Admin id: ${admin.id}`);
  console.log(`   Seller id: ${demoSeller.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
