import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="relative overflow-hidden gradient-mesh">
      <div className="container-page relative py-16 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-brand-800 shadow-soft backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            India&apos;s premium thrift marketplace
          </div>

          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink-900 text-balance sm:text-5xl lg:text-6xl">
            Discover pre-loved pieces with{' '}
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              first-class taste
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-500 sm:text-lg">
            Shop clothing, sneakers, luxury, vintage & more from trusted sellers.
            Sell in minutes with AI-powered listings.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/browse">
              <Button size="lg" variant="brand" className="min-w-[160px]">
                Start shopping
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sell">
              <Button size="lg" variant="outline" className="min-w-[160px]">
                Sell an item
              </Button>
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium uppercase tracking-wider text-ink-400">
            <span>Buyer protection</span>
            <span className="hidden h-1 w-1 rounded-full bg-ink-300 sm:block" />
            <span>Secure payouts</span>
            <span className="hidden h-1 w-1 rounded-full bg-ink-300 sm:block" />
            <span>AI listing tools</span>
            <span className="hidden h-1 w-1 rounded-full bg-ink-300 sm:block" />
            <span>Verified sellers</span>
          </div>
        </div>
      </div>
    </section>
  );
}
