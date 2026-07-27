import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Buyer Protection · Thrift Store',
  description: 'Learn about buyer protection on Thrift Store.',
};

export default function SafetyPage() {
  return (
    <div className="container-page py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Buyer Protection</h1>
      <p className="mt-4 text-ink-600">Coming soon.</p>
    </div>
  );
}
