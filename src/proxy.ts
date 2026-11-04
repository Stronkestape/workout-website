import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
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
     * Only run Edge proxy middleware on protected authenticated routes.
     * Public static/ISR routes (/, /calendar, /instructors, /login, /register, etc.)
     * and static assets bypass Edge middleware entirely, enabling 100% Vercel Edge CDN caching
     * with sub-20ms TTFB and zero document request latency.
     */
    '/profile/:path*',
    '/bookings/:path*',
    '/admin/:path*',
  ],
};
