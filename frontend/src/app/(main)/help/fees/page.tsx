import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fees · Thrift Store',
  description: 'Learn about selling fees on Thrift Store.',
};

export default function FeesPage() {
  return (
    <div className="container-page py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Fees</h1>
      <p className="mt-4 text-ink-600">Coming soon.</p>
    </div>
  );
}
