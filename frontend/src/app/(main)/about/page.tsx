import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About · Thrift Store',
  description: 'Learn more about Thrift Store — the premium thrift marketplace.',
};

export default function AboutPage() {
  return (
    <div className="container-page py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">About</h1>
      <p className="mt-4 text-ink-600">Coming soon.</p>
    </div>
  );
}
