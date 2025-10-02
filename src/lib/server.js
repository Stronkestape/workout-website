import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          // In server components, we can't modify cookies
          // This will be handled by the client or middleware
        },
        remove(name, options) {
          // In server components, we can't modify cookies
          // This will be handled by the client or middleware
        },
      },
    }
  );
}