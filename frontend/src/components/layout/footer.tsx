import Link from 'next/link';

const COLS = [
  {
    title: 'Shop',
    links: [
      { href: '/browse', label: 'All items' },
      { href: '/browse?category=clothing', label: 'Clothing' },
      { href: '/browse?category=sneakers', label: 'Sneakers' },
      { href: '/browse?category=luxury', label: 'Luxury' },
    ],
  },
  {
    title: 'Sell',
    links: [
      { href: '/sell', label: 'Start selling' },
      { href: '/seller/dashboard', label: 'Seller hub' },
      { href: '/help/fees', label: 'Fees' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/blog', label: 'Blog' },
      { href: '/careers', label: 'Careers' },
      { href: '/press', label: 'Press' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/help', label: 'Help Center' },
      { href: '/help/safety', label: 'Buyer protection' },
      { href: '/pages/terms', label: 'Terms' },
      { href: '/pages/privacy', label: 'Privacy' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink-100 bg-ink-950 text-ink-300">
      <div className="container-page py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-ink-900">
                T
              </span>
              <span className="text-lg font-semibold text-white">Thrift Store</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-400">
              Second chances. First-class finds. The premium thrift marketplace for modern India.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-ink-400 transition hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-ink-800 pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-ink-500">© {new Date().getFullYear()} Thrift Store. All rights reserved.</p>
          <p className="text-xs text-ink-500">Built for scale · Secure payments · Buyer protection</p>
        </div>
      </div>
    </footer>
  );
}
