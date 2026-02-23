'use client';

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import Image from "next/image";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  permission?: string;
  roles?: AppRole[];
  excludedRoles?: AppRole[]; // Roles that should NOT see this item
}

import { navItems } from "./navItems";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { hasPermission, role, signOut, profile } = useAuth();

  const visibleItems = navItems.filter(item => {
    // Check if role is excluded
    if (item.excludedRoles && role && item.excludedRoles.includes(role)) {
      return false;
    }
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
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out hidden md:flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
      style={{ background: "var(--gradient-sidebar)" }}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {collapsed ? (
          <div className="flex h-10 w-10 items-center justify-center mx-auto rounded-lg bg-transparent overflow-hidden">
            <Image
              src="/Logo.png"
              alt="Logo"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-transparent overflow-hidden">
              <Image
                src="/Logo.png"
                alt="Logo Gempita"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <span className="font-bold text-sidebar-foreground">
              Dapur <span className="text-sidebar-primary">Gempita</span>
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
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
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
