import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';

export interface AppUser {
  id: string;
  email: string;
  user_metadata: {
    role: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updatedUser: AppUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapBackendUser(backendUser: any): AppUser {
  return {
    id: String(backendUser.id),
    email: backendUser.email,
    user_metadata: {
      role: backendUser.role,
      full_name: backendUser.fullName,
      avatar_url: backendUser.avatarUrl || backendUser.avatar_url || '',
    },
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    const storedUser = localStorage.getItem('app_user');
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        // Verify token with backend
        api.get<any>('/auth/profile').then(profile => {
           setUser(mapBackendUser(profile));
           localStorage.setItem('app_user', JSON.stringify(mapBackendUser(profile)));
        }).catch(() => {
           localStorage.removeItem('jwt_token');
           localStorage.removeItem('app_user');
           setUser(null);
        });
      } catch (e) {
        console.error("Failed to parse user from local storage", e);
      }
    }
    setLoading(false);
  }, []);

  const setAuthData = (token: string, userData: any) => {
    localStorage.setItem('jwt_token', token);
    const mappedUser = mapBackendUser(userData);
    localStorage.setItem('app_user', JSON.stringify(mappedUser));
    setUser(mappedUser);
  };

  const login = async (email: string, password: string) => {
    const response = await api.post<any>('/auth/login', { email, password });
    setAuthData(response.token, response.user);
  };

  const signup = async (email: string, password: string, fullName: string, role: string) => {
    const response = await api.post<any>('/auth/signup', { email, password, fullName, role });
    setAuthData(response.token, response.user);
  };

  const signOut = async () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('app_user');
    setUser(null);
  };

  const updateUser = (updatedUser: AppUser) => {
    localStorage.setItem('app_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, signOut, updateUser }}>
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
