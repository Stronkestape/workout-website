// src/proxy.js
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

function hasSupabaseAuthCookie(request) {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
}

export async function proxy(request) {
  const pathname = request.nextUrl.pathname;
  const hasAuthCookie = hasSupabaseAuthCookie(request);

  // Fast-path: Unauthenticated requests on protected routes redirect immediately without WAN overhead
  if (!hasAuthCookie) {
    if (
      pathname.startsWith('/profile') ||
      pathname.startsWith('/bookings') ||
      pathname.startsWith('/admin')
    ) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Fast-path: Anonymous traffic on public routes skips Supabase auth entirely (0ms overhead)
    return NextResponse.next();
  }

  // Only perform a Supabase Auth check in proxy when an authenticated cookie holder visits /login or /register
  // Protected routes (/bookings, /profile, /admin) verify auth in parallel with their DB queries inside Server Components.
  if (!pathname.startsWith('/login') && !pathname.startsWith('/register')) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return NextResponse.redirect(new URL('/calendar', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _vercel (Vercel Speed Insights vitals & scripts)
     * - favicon.ico (favicon file)
     * - public images/assets
     */
    '/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
