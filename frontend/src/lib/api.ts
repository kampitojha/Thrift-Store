/**
 * Frontend API client — talks ONLY to NestJS backend over HTTP.
 * Never imports backend source code.
 */

const API_BASE =
  typeof window === 'undefined'
    ? process.env.API_URL || 'http://localhost:4000'
    : '';

const API_PREFIX = '/api/v1';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  tags?: string[];
  revalidate?: number | false;
  cache?: RequestCache;
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('reloom_access_token');
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, tags, revalidate, cache } = opts;
  const auth = token === undefined ? getToken() : token;

  const headers: HeadersInit = {
    Accept: 'application/json',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) headers['Authorization'] = `Bearer ${auth}`;

  const url = path.startsWith('http') ? path : `${API_BASE}${API_PREFIX}${path}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache,
    next:
      typeof window === 'undefined'
        ? {
            tags,
            revalidate: revalidate === false ? undefined : (revalidate ?? 30),
          }
        : undefined,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (json as { message?: string }).message || res.statusText,
      json,
    );
  }

  // Nest interceptor wraps as { success, data }
  if (json && typeof json === 'object' && 'data' in json && 'success' in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export const apiClient = {
  get: <T>(path: string, opts?: RequestOptions) => api<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    api<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    api<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: RequestOptions) => api<T>(path, { ...opts, method: 'DELETE' }),
};

// ── Domain helpers ──────────────────────────────────────────────────────────

export async function fetchHome() {
  return apiClient.get<{
    banners: Array<{ id: string; title: string; subtitle?: string; imageUrl: string; linkUrl?: string }>;
    categories: Array<{ id: string; name: string; slug: string; imageUrl?: string }>;
    featured: ProductLike[];
    trending: ProductLike[];
  }>('/cms/home', { revalidate: 60, tags: ['home'] });
}

export async function fetchProducts(params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  return apiClient.get<{ data: ProductLike[]; meta: PaginationMeta }>(
    `/products?${qs.toString()}`,
    { revalidate: 30 },
  );
}

export async function fetchProduct(slug: string) {
  return apiClient.get<ProductDetail>(`/products/${slug}`, { revalidate: 60 });
}

export async function fetchCategories() {
  return apiClient.get<CategoryTree[]>('/categories', { revalidate: 3600, tags: ['categories'] });
}

export type ProductLike = {
  id: string;
  title: string;
  slug: string;
  pricePaise: number;
  originalPricePaise?: number | null;
  condition?: string;
  thumbnailUrl?: string | null;
  brandName?: string | null;
  brand?: { name: string } | null;
  media?: Array<{ url: string }>;
  seller?: { id: string; username: string; avatarUrl?: string | null; isVerified?: boolean };
  favoriteCount?: number;
  city?: string | null;
  createdAt?: string;
};

export type ProductDetail = ProductLike & {
  description: string;
  size?: string | null;
  color?: string | null;
  tags?: string[];
  viewCount?: number;
  category?: { id: string; name: string; slug: string };
  media: Array<{ id: string; url: string; isPrimary: boolean; altText?: string | null }>;
};

export type CategoryTree = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  children?: CategoryTree[];
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};
