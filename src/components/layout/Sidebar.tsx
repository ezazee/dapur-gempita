import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardCheck,
  ChefHat,
  UtensilsCrossed,
  FileBarChart,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Bahan Baku", icon: Package, href: "/ingredients" },
  { label: "Menu Harian", icon: UtensilsCrossed, href: "/menus" },
  { label: "Pembelian", icon: ShoppingCart, href: "/purchases" },
  { label: "Penerimaan", icon: ClipboardCheck, href: "/receipts" },
  { label: "Produksi", icon: ChefHat, href: "/productions" },
  { label: "Laporan", icon: FileBarChart, href: "/reports" },
  { label: "Pengguna", icon: Users, href: "/users" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

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
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
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
      <div className="border-t border-sidebar-border p-3">
        <Link
          to="/settings"
          className={cn("nav-item", collapsed && "justify-center px-2")}
          title={collapsed ? "Pengaturan" : undefined}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Pengaturan</span>}
        </Link>
        <button
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
