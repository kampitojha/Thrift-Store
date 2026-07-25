import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { BrowsePage } from './browse-content';

function BrowseFallback() {
  return (
    <div className="container-page py-8">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/5] rounded-2xl" />
            <Skeleton className="h-4 w-1/3 rounded-lg" />
            <Skeleton className="h-4 w-2/3 rounded-lg" />
            <Skeleton className="h-5 w-1/4 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BrowsePageWrapper() {
  return (
    <Suspense fallback={<BrowseFallback />}>
      <BrowsePage />
    </Suspense>
  );
}
