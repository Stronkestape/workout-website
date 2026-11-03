import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Extracts the unverified user UUID from the Supabase auth cookie synchronously (0 ms)
 * so Server Components can launch their database queries in parallel with `supabase.auth.getUser()`.
 */
export function getCookieUserId(cookieStore) {
  try {
    const allCookies = cookieStore.getAll();
    const authCookies = allCookies.filter(
      (c) =>
        c.name.startsWith('sb-') &&
        c.name.includes('-auth-token') &&
        !c.name.includes('-code-verifier')
    );

    if (authCookies.length === 0) return null;

    let rawValue = '';
    const exactMatch = authCookies.find((c) => c.name.endsWith('-auth-token'));
    if (exactMatch) {
      rawValue = exactMatch.value;
    } else {
      const sortedChunks = [...authCookies].sort((a, b) => {
        const idxA = parseInt(a.name.split('.').pop(), 10) || 0;
        const idxB = parseInt(b.name.split('.').pop(), 10) || 0;
        return idxA - idxB;
      });
      rawValue = sortedChunks.map((c) => c.value).join('');
    }

    if (!rawValue) return null;

    let jsonStr = rawValue;
    if (jsonStr.startsWith('base64-')) {
      jsonStr = Buffer.from(jsonStr.slice(7), 'base64url').toString('utf8');
    } else if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
      try {
        const decoded = decodeURIComponent(jsonStr);
        if (decoded.startsWith('base64-')) {
          jsonStr = Buffer.from(decoded.slice(7), 'base64url').toString('utf8');
        } else {
          jsonStr = decoded;
        }
      } catch {
        // Ignore URI decode error
      }
    }

    const sessionObj = JSON.parse(jsonStr);
    let candidateId = sessionObj?.user?.id || null;

    if (!candidateId && typeof sessionObj?.access_token === 'string') {
      const parts = sessionObj.access_token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64url').toString('utf8')
        );
        candidateId = payload?.sub || null;
      }
    }

    if (typeof candidateId === 'string' && UUID_REGEX.test(candidateId)) {
      return candidateId;
    }
    return null;
  } catch {
    return null;
  }
}

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

  const supabase = await createSupabaseServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, supabase };
}

export async function createSupabaseServerClient(existingCookieStore = null) {
  const cookieStore = existingCookieStore || (await cookies());

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
