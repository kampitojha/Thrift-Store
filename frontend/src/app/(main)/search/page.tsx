import { redirect } from 'next/navigation';

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  redirect(`/browse?q=${encodeURIComponent(q || '')}`);
}
