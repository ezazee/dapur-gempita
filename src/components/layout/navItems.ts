import {
    LayoutDashboard,
    ShoppingCart,
    ClipboardCheck,
    ChefHat,
    UtensilsCrossed,
    TrendingUp,
    Users,
    FileText,
    FileBarChart,
} from "lucide-react";
import { AppRole } from "@/hooks/useAuth";

export interface NavItem {
    label: string;
    icon: React.ElementType;
    href: string;
    permission?: string;
    roles?: AppRole[];
    excludedRoles?: AppRole[];
}

export const navItems: NavItem[] = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/", permission: "dashboard.read", excludedRoles: ['CHEF'] },
    { label: "Menu Harian", icon: UtensilsCrossed, href: "/menus", permission: "menu.read", excludedRoles: ['CHEF'] },
    { label: "Pembelian", icon: ShoppingCart, href: "/purchases", permission: "purchase.read" },
    { label: "Penerimaan", icon: ClipboardCheck, href: "/receipts", permission: "receipt.read" },
    { label: "Produksi", icon: ChefHat, href: "/productions", permission: "production.read" },
    { label: "Pergerakan Stok", icon: TrendingUp, href: "/stock-movements", permission: "stock.read", excludedRoles: ['CHEF', 'KEPALA_DAPUR'] },
    { label: "Laporan", icon: FileBarChart, href: "/reports", permission: "report.read", excludedRoles: ['CHEF'] },
    // { label: "Pengguna", icon: Users, href: "/users", roles: ['SUPER_ADMIN'] },
    // { label: "Audit Log", icon: FileText, href: "/audit-logs", permission: "audit.read", excludedRoles: ['KEPALA_DAPUR'] },
];
