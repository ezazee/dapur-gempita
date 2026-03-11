'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppRole } from '@/hooks/useAuth';

interface RouteGuardProps {
    children: React.ReactNode;
    allowedRoles: AppRole[];
    redirectTo?: string;
}

export function RouteGuard({ children, allowedRoles, redirectTo = '/' }: RouteGuardProps) {
    const { role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (!role || !allowedRoles.includes(role)) {
            router.replace(redirectTo);
        }
    }, [role, loading, allowedRoles, redirectTo, router]);

    if (loading || !role || !allowedRoles.includes(role)) {
        return null;
    }

    return <>{children}</>;
}
