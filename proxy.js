import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Storefront data the public site reads without logging in (GET only).
const PUBLIC_GET_ROUTES = new Set(['hero', 'products', 'promotions', 'modifiers', 'facebook-tracking']);

// Cron handlers that validate CRON_SECRET / EMPLOYEE_API_SECRET themselves.
const SELF_AUTH_CRON_ROUTES = new Set(['employee-schedule-notify', 'customer-marketing-automation']);

const CRON_ONLY_ROUTES = new Set(['shift4-sync']);

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const isOrdersList = pathname === '/api/orders' || pathname === '/api/orders/';
  const route = isOrdersList ? 'orders' : pathname.replace(/^\/api\/admin\/?/, '').split('/')[0];

  if (request.method === 'GET' && PUBLIC_GET_ROUTES.has(route)) {
    return NextResponse.next();
  }

  if (SELF_AUTH_CRON_ROUTES.has(route)) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (token) {
    return NextResponse.next();
  }

  if (CRON_ONLY_ROUTES.has(route)) {
    const cronSecret = process.env.CRON_SECRET;
    const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (cronSecret && bearer === cronSecret) {
      return NextResponse.next();
    }
  }

  return unauthorized();
}

export const config = {
  matcher: ['/api/admin/:path*', '/api/orders'],
};
