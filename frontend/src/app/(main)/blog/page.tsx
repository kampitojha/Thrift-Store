import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog · Thrift Store',
  description: 'Read the latest from Thrift Store.',
};

export default function BlogPage() {
  return (
    <div className="container-page py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Blog</h1>
      <p className="mt-4 text-ink-600">Coming soon.</p>
    </div>
  );
}
