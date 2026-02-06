import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({
  children,
  requiredPermission,
  allowedRoles
}: ProtectedRouteProps) {
  const { user, loading, role, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirect to auth page with return url
        router.replace(`/auth?from=${encodeURIComponent(pathname)}`);
        return;
      }

      // Check role-based access
      if (allowedRoles && role && !allowedRoles.includes(role)) {
        router.replace('/');
        return;
      }

      // Check permission-based access
      if (requiredPermission && !hasPermission(requiredPermission)) {
        router.replace('/');
        return;
      }
    }
  }, [user, loading, role, allowedRoles, requiredPermission, hasPermission, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  // While checking or if unauthorized (before redirect happens), show nothing or loading
  if (!user ||
    (allowedRoles && role && !allowedRoles.includes(role)) ||
    (requiredPermission && !hasPermission(requiredPermission))) {
    return null; // Or a loading spinner to prevent flash
  }

  return <>{children}</>;
}
