import { NextResponse } from 'next/server';
import { makeAuthToken, AUTH_COOKIE_NAME } from '../../../lib/auth';

export async function POST(request) {
  const { password } = await request.json();

  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const token = await makeAuthToken(process.env.APP_PASSWORD, process.env.AUTH_SALT);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
  return response;
}
