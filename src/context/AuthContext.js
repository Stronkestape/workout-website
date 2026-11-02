'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabaseBrowser } from '@/lib/browser';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch full user profile from database
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    try {
      const { data, error } = await supabaseBrowser
        .from('user_profiles')
        .select('id, username, full_name, user_tier, email')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
        return data;
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
    return null;
  }, []);

  // Explicitly refresh profile data (e.g. after profile edit)
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      return await fetchProfile(user.id);
    }
    return null;
  }, [user?.id, fetchProfile]);

  // Synchronize auth state on mount and subscribe to changes
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const {
          data: { session },
        } = await supabaseBrowser.auth.getSession();

        if (!isMounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Error initializing auth state:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (event === 'SIGNED_OUT' || !currentUser) {
        setProfile(null);
        setIsLoading(false);
      } else if (currentUser) {
        await fetchProfile(currentUser.id);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  // Clean sign-out handler
  const signOut = useCallback(async () => {
    try {
      await supabaseBrowser.auth.signOut();
    } finally {
      setUser(null);
      setProfile(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      username: profile?.username || user?.user_metadata?.username || null,
      userTier: profile?.user_tier || 'regular',
      isLoading,
      isAuthenticated: !!user,
      refreshProfile,
      signOut,
    }),
    [user, profile, isLoading, refreshProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
