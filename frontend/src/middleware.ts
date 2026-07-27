import { NextRequest, NextResponse } from 'next/server';

const publicPaths = new Set([
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/',
  '/browse',
  '/categories',
  '/_next',
  '/favicon',
  '/images',
]);

const exactPublicPaths = new Set([
  '/',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
]);

const prefixPublicPaths = [
  '/browse',
  '/categories',
  '/_next',
  '/favicon',
  '/images',
];

function isPublicPath(pathname: string): boolean {
  if (exactPublicPaths.has(pathname)) return true;
  return prefixPublicPaths.some((p) => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('reloom_access_token')?.value
    || request.headers.get('authorization')?.replace('Bearer ', '')
    || '';

  // Protected paths require a token
  const protectedPaths = ['/settings', '/sell', '/orders', '/messages', '/wishlist', '/notifications', '/seller', '/admin', '/checkout'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !accessToken) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
