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
    StickyNote,
    Package,
    Activity,
    History as HistoryIcon
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
    { label: "Dashboard", icon: LayoutDashboard, href: "/", permission: "dashboard.read", excludedRoles: ['CHEF', 'AHLI_GIZI'] },
    { label: "Monitoring Real-Time", icon: Activity, href: "/monitoring", permission: "monitoring.read" },
    { label: "Jadwal Masak", icon: UtensilsCrossed, href: "/menus", permission: "menu.read", excludedRoles: ['CHEF'] },
    { label: "Evaluasi Menu", icon: StickyNote, href: "/evaluations", permission: "menu.read", roles: ['SUPER_ADMIN', 'AHLI_GIZI'] },
    { label: "Kamus Resep (Standar)", icon: ChefHat, href: "/recipes", permission: "recipe.read", roles: ['SUPER_ADMIN', 'AHLI_GIZI', 'KEPALA_DAPUR', 'CHEF'] },
    { label: "Keuangan", icon: ShoppingCart, href: "/purchases", permission: "purchase.read", excludedRoles: ['CHEF'] },
    { label: "Request Barang Operasional", icon: ClipboardCheck, href: "/operational-requests", permission: "purchase.read", roles: ['ASLAP', 'SUPER_ADMIN', 'KEPALA_DAPUR', 'ADMIN'] },
    { label: "Aslap", icon: ClipboardCheck, href: "/receipts", permission: "receipt.read", excludedRoles: ['CHEF'] },
    { label: "Gudang (Stok)", icon: Package, href: "/ingredients", permission: "ingredient.read" },
    { label: "Produksi", icon: ChefHat, href: "/productions", permission: "production.read" },
    { label: "Riwayat Terpadu", icon: HistoryIcon, href: "/history", permission: "audit.read", roles: ['SUPER_ADMIN', 'KEPALA_DAPUR'] },
    { label: "Pergerakan Stok", icon: TrendingUp, href: "/stock-movements", permission: "stock.read" },
    { label: "Laporan", icon: FileBarChart, href: "/reports", permission: "report.read", excludedRoles: ['CHEF', 'AHLI_GIZI'] },
];
