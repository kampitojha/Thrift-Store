import { cn } from '@/lib/utils';

export function Badge({
  className,
  children,
  variant = 'default',
}: {
  className?: string;
  children: React.ReactNode;
  variant?: 'default' | 'brand' | 'outline' | 'success';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-ink-100 text-ink-800',
        variant === 'brand' && 'bg-brand-100 text-brand-800',
        variant === 'outline' && 'border border-ink-200 text-ink-700',
        variant === 'success' && 'bg-emerald-100 text-emerald-800',
        className,
      )}
    >
      {children}
    </span>
  );
}
