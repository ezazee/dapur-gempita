import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardCheck,
  ChefHat,
  UtensilsCrossed,
  TrendingUp,
  Users,
  FileText,
  FileBarChart,
  LogOut,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth, AppRole } from "@/hooks/useAuth";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  permission?: string;
  roles?: AppRole[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Bahan Baku", icon: Package, href: "/ingredients", permission: "ingredient.read" },
  { label: "Menu Harian", icon: UtensilsCrossed, href: "/menus", permission: "menu.read" },
  { label: "Pembelian", icon: ShoppingCart, href: "/purchases", permission: "purchase.read" },
  { label: "Penerimaan", icon: ClipboardCheck, href: "/receipts", permission: "receipt.read" },
  { label: "Produksi", icon: ChefHat, href: "/productions", permission: "production.read" },
  { label: "Pergerakan Stok", icon: TrendingUp, href: "/stock-movements" },
  { label: "Laporan", icon: FileBarChart, href: "/reports", permission: "report.read" },
  { label: "Pengguna", icon: Users, href: "/users", roles: ['SUPER_ADMIN'] },
  { label: "Audit Log", icon: FileText, href: "/audit-logs", roles: ['SUPER_ADMIN', 'KEPALA_DAPUR'] },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { hasPermission, role, signOut, profile } = useAuth();

  const visibleItems = navItems.filter(item => {
    // Check role-based access
    if (item.roles && role && !item.roles.includes(role)) {
      return false;
    }
    // Check permission-based access
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }
    return true;
  });

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
      style={{ background: "var(--gradient-sidebar)" }}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <ChefHat className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">
              Dapur<span className="text-sidebar-primary">Stok</span>
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "nav-item",
                isActive && "active",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-3 bg-sidebar">
        {!collapsed && profile && (
          <div className="mb-2 px-3 py-2 text-xs text-sidebar-foreground/70">
            <p className="font-medium text-sidebar-foreground truncate">{profile.name}</p>
            <p className="truncate">{profile.email}</p>
          </div>
        )}
        <button
          onClick={() => signOut()}
          className={cn(
            "nav-item w-full text-destructive/80 hover:text-destructive hover:bg-destructive/10",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Keluar" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>
    </aside>
  );
}
