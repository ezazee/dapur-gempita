import { AppRole } from '@/hooks/useAuth';

// Route to allowed roles mapping
export const ROUTE_PERMISSIONS: Record<string, AppRole[]> = {
    '/': ['SUPER_ADMIN', 'ADMIN', 'AHLI_GIZI', 'KEUANGAN', 'ASLAP', 'KEPALA_DAPUR'], // CHEF excluded from dashboard
    '/menus': ['SUPER_ADMIN', 'ADMIN', 'AHLI_GIZI', 'KEUANGAN', 'ASLAP', 'KEPALA_DAPUR'],
    '/purchases': ['SUPER_ADMIN', 'ADMIN', 'KEUANGAN'],
    '/receipts': ['SUPER_ADMIN', 'ADMIN', 'ASLAP'],
    '/productions': ['SUPER_ADMIN', 'ADMIN', 'CHEF'],
    '/stock-movements': ['SUPER_ADMIN', 'ADMIN'],
    '/reports': ['SUPER_ADMIN', 'ADMIN', 'KEPALA_DAPUR'],
    '/users': ['SUPER_ADMIN'],
    '/audit-logs': ['SUPER_ADMIN', 'ADMIN'],
};

export function isRouteAllowed(route: string, role: AppRole | null): boolean {
    if (!role) return false;

    const allowedRoles = ROUTE_PERMISSIONS[route];
    if (!allowedRoles) return true; // Allow if not defined

    return allowedRoles.includes(role);
}
