export interface PaginatedResult<T> {
  data: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
}

export interface PaginationArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  limit?: number;
}

export function encodeCursor(id: string, sortValue: string | number | Date): string {
  const payload = JSON.stringify({ id, sortValue: sortValue instanceof Date ? sortValue.toISOString() : sortValue });
  return Buffer.from(payload).toString('base64url');
}

export function decodeCursor(cursor: string): { id: string; sortValue: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function buildPaginationQuery(
  args: PaginationArgs,
  defaultLimit = 20,
  maxLimit = 100,
): {
  take: number;
  skip: number;
  cursor?: { id: string };
  orderBy: Record<string, 'asc' | 'desc'>;
  direction: 'forward' | 'backward';
} {
  const limit = Math.min(args.first || args.last || args.limit || defaultLimit, maxLimit);
  const forward = args.after !== undefined || (args.first !== undefined && !args.before);
  const backward = args.before !== undefined || (args.last !== undefined && !args.after);

  if (forward || (!forward && !backward)) {
    const cursor = args.after ? decodeCursor(args.after) : null;
    return {
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor.id } : undefined,
      orderBy: { createdAt: 'desc' },
      direction: 'forward',
    };
  }

  const cursor = args.before ? decodeCursor(args.before) : null;
  return {
    take: -(limit + 1),
    skip: cursor ? 0 : 0,
    cursor: cursor ? { id: cursor.id } : undefined,
    orderBy: { createdAt: 'desc' },
    direction: 'backward',
  };
}

export function paginateResult<T extends { id: string }>(
  items: T[],
  query: { take: number; direction: 'forward' | 'backward' },
  getSortValue: (item: T) => string | number | Date,
): PaginatedResult<T> {
  const take = Math.abs(query.take);
  const hasExtra = items.length > take - 1;
  const results = hasExtra ? items.slice(0, take - 1) : items;

  if (query.direction === 'backward') {
    results.reverse();
  }

  return {
    data: results,
    pageInfo: {
      hasNextPage: query.direction === 'forward' ? hasExtra : false,
      hasPreviousPage: query.direction === 'backward' ? hasExtra : false,
      startCursor: results.length > 0 ? encodeCursor(results[0].id, getSortValue(results[0])) : null,
      endCursor: results.length > 0
        ? encodeCursor(results[results.length - 1].id, getSortValue(results[results.length - 1]))
        : null,
    },
  };
}
