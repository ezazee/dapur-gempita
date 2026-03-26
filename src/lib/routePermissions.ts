import { AppRole } from '@/hooks/useAuth';

// Route to allowed roles mapping
export const ROUTE_PERMISSIONS: Record<string, AppRole[]> = {
    '/': ['SUPER_ADMIN', 'ADMIN', 'AHLI_GIZI', 'KEUANGAN', 'ASLAP', 'KEPALA_DAPUR'], // CHEF excluded from dashboard
    '/monitoring': ['SUPER_ADMIN', 'ADMIN', 'AHLI_GIZI', 'KEUANGAN', 'ASLAP', 'CHEF', 'KEPALA_DAPUR'],
    '/menus': ['SUPER_ADMIN', 'ADMIN', 'AHLI_GIZI', 'KEUANGAN', 'ASLAP', 'KEPALA_DAPUR'],
    '/purchases': ['SUPER_ADMIN', 'ADMIN', 'KEUANGAN'],
    '/receipts': ['SUPER_ADMIN', 'ADMIN', 'ASLAP'],
    '/ingredients': ['SUPER_ADMIN', 'ADMIN', 'ASLAP', 'CHEF'],
    '/productions': ['SUPER_ADMIN', 'ADMIN', 'CHEF'],
    '/stock-movements': ['SUPER_ADMIN', 'ADMIN', 'CHEF'],
    '/reports': ['SUPER_ADMIN', 'ADMIN', 'KEPALA_DAPUR'],
    '/recipes': ['SUPER_ADMIN', 'ADMIN', 'KEPALA_DAPUR', 'CHEF'],
    '/users': ['SUPER_ADMIN'],
    '/audit-logs': ['SUPER_ADMIN', 'ADMIN'],
};

export function isRouteAllowed(route: string, role: AppRole | null): boolean {
    if (!role) return false;

    const allowedRoles = ROUTE_PERMISSIONS[route];
    if (!allowedRoles) return true; // Allow if not defined

    return allowedRoles.includes(role);
}
