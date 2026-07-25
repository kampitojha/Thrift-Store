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
  skipRefresh?: boolean;
};

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('reloom_access_token');
    return raw;
  } catch { return null; }
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('reloom_refresh_token');
  } catch { return null; }
}

function setTokens(access: string, refresh: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('reloom_access_token', access);
  localStorage.setItem('reloom_refresh_token', refresh);
}

function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('reloom_access_token');
  localStorage.removeItem('reloom_refresh_token');
}

let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

async function attemptRefresh(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const rt = getRefreshToken();
  if (!rt) return null;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}${API_PREFIX}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) {
        clearTokens();
        return null;
      }
      const json = await res.json();
      const data = json?.data || json;
      if (data.accessToken && data.refreshToken) {
        setTokens(data.accessToken, data.refreshToken);
        return data;
      }
      clearTokens();
      return null;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, tags, revalidate, cache, skipRefresh } = opts;
  const auth = token === undefined ? getAccessToken() : token;

  const headers: HeadersInit = {
    Accept: 'application/json',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) headers['Authorization'] = `Bearer ${auth}`;

  const url = path.startsWith('http') ? path : `${API_BASE}${API_PREFIX}${path}`;

  let res = await fetch(url, {
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

  if (res.status === 401 && !skipRefresh && typeof window !== 'undefined') {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${refreshed.accessToken}`;
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache,
      });
    } else {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (json as { message?: string }).message || res.statusText,
      json,
    );
  }

  if (json && typeof json === 'object' && 'data' in json && 'success' in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export const apiClient = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'DELETE' }),
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
};

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
  status?: string;
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
