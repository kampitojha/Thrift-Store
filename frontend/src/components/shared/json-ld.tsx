const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Thrift Store',
  url: appUrl,
  description: 'India\'s premium thrift marketplace for pre-loved fashion, sneakers, luxury, electronics and more.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${appUrl}/browse?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
