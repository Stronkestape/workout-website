import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Fast-path user retrieval that checks for the presence of Supabase auth cookies
 * before initiating an external WAN network request to Supabase Auth.
 */
export async function getSafeUser() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const hasToken = allCookies.some(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
  );

  if (!hasToken) {
    return { user: null, supabase: null };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, supabase };
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if proxy is refreshing user sessions.
          }
        },
      },
    }
  );
}
