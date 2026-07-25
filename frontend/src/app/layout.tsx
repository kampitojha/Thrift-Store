import type { Metadata, Viewport } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from '@/components/shared/providers';

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

export const metadata: Metadata = {
  title: {
    default: 'Reloom — Premium Thrift Marketplace',
    template: '%s · Reloom',
  },
  description:
    'Buy and sell pre-loved fashion, sneakers, luxury, electronics and more. Second chances. First-class finds.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    siteName: 'Reloom',
    title: 'Reloom — Premium Thrift Marketplace',
    description: 'India\'s premium thrift marketplace.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reloom',
    description: 'Second chances. First-class finds.',
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
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </body>
    </html>
  );
}
