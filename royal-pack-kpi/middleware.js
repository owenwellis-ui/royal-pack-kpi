import { NextResponse } from 'next/server';
import { makeAuthToken, AUTH_COOKIE_NAME } from './lib/auth';

export async function middleware(request) {
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const expected = await makeAuthToken(process.env.APP_PASSWORD, process.env.AUTH_SALT);

  if (cookie === expected) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|api/login).*)'],
};
