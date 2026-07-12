import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface AppUser {
  id: string;
  email: string;
  user_metadata: {
    role: string;
    full_name: string;
    avatar_url?: string;
    role_fetched?: boolean;
  };
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAppUser(supabaseUser: any, overrideRole?: string, roleFetched = false): AppUser | null {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    user_metadata: {
      role: overrideRole ?? supabaseUser.user_metadata?.role ?? 'Student',
      full_name: supabaseUser.user_metadata?.full_name ?? '',
      avatar_url: supabaseUser.user_metadata?.avatar_url,
      role_fetched: roleFetched
    },
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Core auth initialization (guaranteed to not block)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(toAppUser(session?.user ?? null));
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAppUser(session?.user ?? null));
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch real role asynchronously when user logs in or app mounts
  useEffect(() => {
    if (user && !user.user_metadata.role_fetched) {
      supabase.from('profiles').select('role').eq('id', user.id).single()
        .then(({ data, error }) => {
          if (error) {
             if (error.code === 'PGRST116') {
                // Profile not found -> Admin deleted this user. Force logout.
                supabase.auth.signOut().then(() => {
                  setUser(null);
                  window.location.href = '/login?error=account_deleted';
                });
             } else {
                // Ignore other errors, just mark as fetched to avoid infinite loops
                setUser(prev => prev ? toAppUser(prev, undefined, true) : null);
             }
          } else if (data && data.role) {
            setUser(prev => prev ? toAppUser(prev, data.role, true) : null);
          }
        });
    }
  }, [user?.id, user?.user_metadata?.role_fetched]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    
    if (data.user) {
      setUser(toAppUser(data.user));
      
      // Fire-and-forget login history
      supabase.from('login_history').insert({
        user_id: data.user.id,
        email: email,
        action: 'Logged in'
      }).then(() => {});
    }
  };

  const signup = async (email: string, password: string, fullName: string, role: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });
    if (error) throw new Error(error.message);

    if (data.user) {
      // If email verification is ON, this upsert will fail due to RLS (no active session yet).
      // That's perfectly fine. We will use a Supabase database trigger to automatically create the profile.
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role,
      }).then(() => {}); // Catch and ignore potential RLS errors here

      setUser(toAppUser(data.user, role, true));
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
