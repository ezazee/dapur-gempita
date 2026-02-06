import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { getSession, login as serverLogin, logout as serverLogout } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

export type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'AHLI_GIZI' | 'PEMBELI' | 'PENERIMA' | 'CHEF' | 'KEPALA_DAPUR';

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
  profile: User | null; // Alias for user to match legacy interface if needed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Permission mapping by role
const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
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
  ],
  AHLI_GIZI: [
    'menu.create', 'menu.read', 'menu.update', 'menu.delete',
    'ingredient.create', 'ingredient.read', 'ingredient.update',
  ],
  PEMBELI: [
    'purchase.create', 'purchase.read', 'purchase.update',
    'ingredient.read',
    'menu.read',
    'upload.photo',
  ],
  PENERIMA: [
    'receipt.create', 'receipt.read', 'receipt.validate',
    'purchase.read',
    'ingredient.read',
    'upload.photo',
  ],
  CHEF: [
    'production.create', 'production.read', 'production.update',
    'menu.read',
    'ingredient.read',
    'receipt.read',
    'purchase.read',
    'stock.read',
    'report.read', 'report.create',
    'upload.photo',
    'dashboard.read',
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
      // Re-fetch session to update state locally
      await checkSession();
      return { error: null };
    }
    return { error: result.error || 'Login failed' };
  };

  const signOut = async () => {
    await serverLogout();
    setUser(null);
    router.refresh(); // Refresh to trigger middleware redirect if needed
  };

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.role) return false;
    const permissions = ROLE_PERMISSIONS[user.role];
    return permissions.includes('*') || permissions.includes(permission);
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
