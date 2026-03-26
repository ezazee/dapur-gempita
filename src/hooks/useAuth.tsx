'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { getSession, login as serverLogin, logout as serverLogout } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

export type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'AHLI_GIZI' | 'KEUANGAN' | 'ASLAP' | 'CHEF' | 'KEPALA_DAPUR';

interface User {
  id: string;
  email: string;
  name: string;
  role: AppRole;
}

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  profile: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Legacy/Static Permissions for safety or specific flags not in modules
const STATIC_PERMISSIONS: Record<AppRole, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'dashboard.read',
    'menu.create', 'menu.read', 'menu.update', 'menu.delete',
    'purchase.create', 'purchase.read', 'purchase.update', 'purchase.delete', 'purchase.approve',
    'receipt.create', 'receipt.read', 'receipt.update', 'receipt.delete', 'receipt.validate',
    'production.create', 'production.read', 'production.update', 'production.delete',
    'ingredient.create', 'ingredient.read', 'ingredient.update', 'ingredient.delete',
    'stock.read', 'stock.update',
    'report.read', 'report.create', 'report.delete',
    'upload.photo',
    'monitoring.read',
  ],
  AHLI_GIZI: [
    'menu.create', 'menu.read', 'menu.update', 'menu.delete',
    'recipe.create', 'recipe.read', 'recipe.update', 'recipe.delete',
    'upload.photo',
    'monitoring.read',
  ],
  KEUANGAN: [
    'purchase.create', 'purchase.read', 'purchase.update',
    'ingredient.read',
    'stock.read',
    'menu.read',
    'upload.photo',
    'monitoring.read',
  ],
  ASLAP: [
    'receipt.create', 'receipt.read', 'receipt.validate',
    'purchase.read',
    'ingredient.read', 'ingredient.update',
    'stock.read', 'stock.adjust',
    'upload.photo',
    'monitoring.read',
  ],
  CHEF: [
    'production.create', 'production.read', 'production.update',
    'menu.read',
    'ingredient.read',
    'stock.read',
    'upload.photo',
    'monitoring.read',
  ],
  KEPALA_DAPUR: [
    'dashboard.read',
    'menu.read',
    'purchase.read',
    'receipt.read',
    'production.read',
    'ingredient.read',
    'stock.read',
    'report.read',
    'audit.read',
    'monitoring.read',
  ],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const session = await getSession();
      if (session) {
        setUser(session);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const result = await serverLogin(email, password);
    if (result.success) {
      await checkSession();
      return { error: null };
    }
    return { error: result.error || 'Login failed' };
  };

  const signOut = async () => {
    await serverLogout();
    setUser(null);
    router.refresh();
  };

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.role) return false;

    // Super Admin has all access
    if (user.role === 'SUPER_ADMIN') return true;

    // Check static permissions
    const perms = STATIC_PERMISSIONS[user.role] || [];
    return perms.includes('*') || perms.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        profile: user,
        loading,
        signIn,
        signOut,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
