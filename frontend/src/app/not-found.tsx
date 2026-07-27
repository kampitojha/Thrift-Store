import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <p className="mb-4 font-display text-7xl font-semibold tracking-tight text-ink-200">
          404
        </p>
        <h1 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink-900">
          Page not found
        </h1>
        <p className="mb-8 text-sm text-ink-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-medium text-white shadow-soft hover:bg-brand-700 transition"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
