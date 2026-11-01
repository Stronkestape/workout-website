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
    // Fast-path: Anonymous traffic on public routes (e.g. /, /calendar, /instructors) skips Supabase auth entirely (0ms overhead)
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

  // Refresh and validate session only when auth cookies are present
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect logged-in users away from auth pages
  if ((pathname.startsWith('/login') || pathname.startsWith('/register')) && user) {
    return NextResponse.redirect(new URL('/calendar', request.url));
  }

  // Protect /profile and /bookings
  if (
    (pathname.startsWith('/profile') || pathname.startsWith('/bookings')) &&
    !user
  ) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protect /admin routes - check if user is admin or instructor
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('user_tier')
      .eq('id', user.id)
      .single();

    if (
      error ||
      !profile ||
      !['admin', 'instructor'].includes(profile.user_tier)
    ) {
      return NextResponse.redirect(new URL('/', request.url));
    }
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
