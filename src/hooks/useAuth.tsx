import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export type AppRole = 'SUPER_ADMIN' | 'AHLI_GIZI' | 'PEMBELI' | 'PENERIMA' | 'CHEF' | 'KEPALA_DAPUR';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Permission mapping by role
// Flow: Ahli Gizi -> Pembeli -> Penerima -> Chef -> Kepala Dapur (monitor)
const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  // Full access to everything
  SUPER_ADMIN: ['*'],
  
  // Mencatat menu harian dan bahan baku yang dibutuhkan
  AHLI_GIZI: [
    'menu.create', 'menu.read', 'menu.update', 'menu.delete',
    'ingredient.create', 'ingredient.read', 'ingredient.update',
    'dashboard.read',
  ],
  
  // Mencatat bahan baku yang akan dibeli (foto, total berat)
  PEMBELI: [
    'purchase.create', 'purchase.read', 'purchase.update',
    'ingredient.read',
    'menu.read',
    'upload.photo',
    'dashboard.read',
  ],
  
  // Validasi bahan dari pembeli, catat berat kotor/bersih, notes jika tidak sesuai
  PENERIMA: [
    'receipt.create', 'receipt.read', 'receipt.validate',
    'purchase.read',
    'ingredient.read',
    'upload.photo',
    'dashboard.read',
  ],
  
  // Mencatat produksi/masak dan laporan harian
  CHEF: [
    'production.create', 'production.read', 'production.update',
    'menu.read',
    'ingredient.read',
    'report.read', 'report.create',
    'upload.photo',
    'dashboard.read',
  ],
  
  // Hanya monitoring - akses baca ke semua aktivitas
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
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleData) {
        setRole(roleData.role as AppRole);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!role) return false;
    const permissions = ROLE_PERMISSIONS[role];
    return permissions.includes('*') || permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        signIn,
        signUp,
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
