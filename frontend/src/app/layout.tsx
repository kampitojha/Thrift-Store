import type { Metadata, Viewport } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from '@/components/shared/providers';
import { JsonLd } from '@/components/shared/json-ld';

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: {
    default: 'Thrift Store — Premium Thrift Marketplace',
    template: '%s · Thrift Store',
  },
  description:
    'Buy and sell pre-loved fashion, sneakers, luxury, electronics and more. Second chances. First-class finds.',
  metadataBase: new URL(appUrl),
  openGraph: {
    type: 'website',
    siteName: 'Thrift Store',
    title: 'Thrift Store — Premium Thrift Marketplace',
    description: 'India\'s premium thrift marketplace.',
    url: appUrl,
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Thrift Store' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Thrift Store',
    description: 'Second chances. First-class finds.',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: '/favicon.svg',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#faf6f1',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen font-sans" suppressHydrationWarning>
        <JsonLd />
        <script dangerouslySetInnerHTML={{ __html: 'var o=new MutationObserver(function(){document.querySelectorAll("[bis_skin_checked]").forEach(function(e){e.removeAttribute("bis_skin_checked")})});o.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:["bis_skin_checked"]})' }} />
        <Providers>{children}</Providers>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </body>
    </html>
  );
}
