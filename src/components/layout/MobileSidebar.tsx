'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    ChefHat,
    LogOut,
    Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { navItems } from "./navItems";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Image from "next/image";

export function MobileSidebar() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const { hasPermission, role, signOut, profile } = useAuth();

    const visibleItems = navItems.filter(item => {
        if (item.excludedRoles && role && item.excludedRoles.includes(role)) return false;
        if (item.roles && role && !item.roles.includes(role)) return false;
        if (item.permission && !hasPermission(item.permission)) return false;
        return true;
    });

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-sidebar border-r border-sidebar-border w-72 text-sidebar-foreground" style={{ background: "var(--gradient-sidebar)" }}>
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
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
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
                        {visibleItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                        "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                                        isActive && "bg-sidebar-accent text-sidebar-primary"
                                    )}
                                >
                                    <item.icon className="h-5 w-5 flex-shrink-0" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="border-t border-sidebar-border p-4 bg-sidebar">
                        {profile && (
                            <div className="mb-4 text-xs text-sidebar-foreground/70">
                                <p className="font-medium text-sidebar-foreground truncate">{profile.name}</p>
                                <p className="truncate">{profile.email}</p>
                            </div>
                        )}
                        <button
                            onClick={() => {
                                setOpen(false);
                                signOut();
                            }}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            <LogOut className="h-5 w-5 flex-shrink-0" />
                            <span>Keluar</span>
                        </button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
