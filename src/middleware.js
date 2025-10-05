// src/middleware.js
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect logged in users away from login
  if (request.nextUrl.pathname.startsWith('/login') && user) {
    return NextResponse.redirect(new URL('/calendar', request.url));
  }

  // Protect /admin routes - check if user is admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Not logged in - redirect to login
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Logged in - check if admin
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('user_tier')
      .eq('id', user.id)
      .single();

    // If query failed or user is not admin - redirect to home
    if (error || !profile || profile.user_tier !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // User is admin - allow access
  }

  // Protect /profile route - must be logged in
  if (request.nextUrl.pathname.startsWith('/profile') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',    // Protect all admin routes
    '/profile/:path*',  // Protect profile routes
    '/login',           // Handle login redirect
  ],
};