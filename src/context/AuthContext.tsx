import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface AppUser {
  id: string;
  email: string;
  user_metadata: {
    role: string;
    full_name: string;
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

function toAppUser(supabaseUser: any): AppUser | null {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    user_metadata: {
      role: supabaseUser.user_metadata?.role ?? 'Student',
      full_name: supabaseUser.user_metadata?.full_name ?? '',
    },
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(toAppUser(session?.user ?? null));
      setLoading(false);
    });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAppUser(session?.user ?? null));
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    setUser(toAppUser(data.user));
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

    // Also upsert a profile row so UserManagement page can list users
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role,
      });
      setUser(toAppUser(data.user));
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
