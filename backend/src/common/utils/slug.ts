export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function uniqueSlug(base: string, suffix?: string): string {
  const s = slugify(base);
  const extra = suffix ?? Math.random().toString(36).slice(2, 8);
  return `${s}-${extra}`;
}
