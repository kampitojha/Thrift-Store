import { cn } from '@/lib/utils';

export function Progress({
  value,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: number }) {
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-ink-100', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className="h-full rounded-full bg-brand-600 transition-all duration-300"
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}
