import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service · Thrift Store',
  description: 'Terms and conditions for using Thrift Store.',
};

export default function TermsPage() {
  return (
    <div className="container-page py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-4 text-ink-600">Coming soon.</p>
    </div>
  );
}
