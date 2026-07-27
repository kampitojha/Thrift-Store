import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Press · Thrift Store',
  description: 'Press resources for Thrift Store.',
};

export default function PressPage() {
  return (
    <div className="container-page py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Press</h1>
      <p className="mt-4 text-ink-600">Coming soon.</p>
    </div>
  );
}
