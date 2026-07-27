import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center · Thrift Store',
  description: 'Get help with your Thrift Store experience.',
};

export default function HelpPage() {
  return (
    <div className="container-page py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Help Center</h1>
      <p className="mt-4 text-ink-600">Coming soon.</p>
    </div>
  );
}
