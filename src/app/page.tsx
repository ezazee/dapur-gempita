'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package, ShoppingCart, ClipboardCheck, ChefHat, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { LowStockAlert } from "@/components/dashboard/LowStockAlert";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TodayMenu } from "@/components/dashboard/TodayMenu";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DashboardStats {
    totalIngredients: number;
    pendingPurchases: number;
    todayReceipts: number;
    todayProductions: number;
}

interface LowStockItem {
    id: string;
    name: string;
    currentStock: number;
    minimumStock: number;
    unit: string;
}

interface Activity {
    id: string;
    type: 'purchase' | 'receipt' | 'production' | 'stock_adjust';
    title: string;
    description: string;
    time: string;
    status?: 'pending' | 'completed';
}

interface MenuItem {
    id: string;
    name: string;
    portions: number;
    status: 'completed' | 'in_progress' | 'planned';
}

export default function Index() {
    const { role, profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        totalIngredients: 0,
        pendingPurchases: 0,
        todayReceipts: 0,
        todayProductions: 0,
    });
    const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
    const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
    const [todayMenuItems, setTodayMenuItems] = useState<MenuItem[]>([]);

    const today = new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });


    const router = useRouter();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        if (!loading) {
            if (role === 'AHLI_GIZI') {
                router.replace('/menus');
            } else if (role === 'PEMBELI') {
                router.replace('/purchases');
            } else if (role === 'PENERIMA') {
                router.replace('/receipts');
            } else if (role === 'CHEF') {
                router.replace('/productions');
            }
        }
    }, [role, loading, router]);


    const fetchDashboardData = async () => {
        try {
            const { getDashboardData } = await import("@/app/actions/dashboard");
            const data = await getDashboardData();

            setStats(data.stats);

            // Map Low Stock Items
            setLowStockItems(data.lowStockItems);

            // Map Recent Activities
            const activities: Activity[] = data.recentMovements.map((m: any) => {
                const typeMap: Record<string, Activity['type']> = {
                    IN: 'receipt',
                    OUT: 'production',
                    ADJUST: 'stock_adjust',
                };
                const typeLabels: Record<string, string> = {
                    IN: 'Penerimaan',
                    OUT: 'Produksi',
                    ADJUST: 'Penyesuaian Stok',
                };

                return {
                    id: m.id,
                    type: typeMap[m.type as string] || 'stock_adjust',
                    title: typeLabels[m.type as string] || 'Aktivitas',
                    description: `${m.ingredientName || 'Unknown'} - ${m.qty} unit`,
                    time: formatTimeAgo(new Date(m.createdAt)),
                    status: 'completed',
                };
            });
            setRecentActivities(activities);

            // Map Today Menu
            const menuItems: MenuItem[] = data.todayMenus.map((m: any) => ({
                id: m.id,
                name: m.name,
                portions: 0,
                status: 'planned' as const,
            }));
            setTodayMenuItems(menuItems);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTimeAgo = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Baru saja';
        if (minutes < 60) return `${minutes} menit lalu`;
        if (hours < 24) return `${hours} jam lalu`;
        return `${days} hari lalu`;
    };

    const statsCards = [
        {
            title: "Total Bahan Baku",
            value: stats.totalIngredients,
            icon: <Package className="h-5 w-5" />,
        },
        {
            title: "Pembelian Pending",
            value: stats.pendingPurchases,
            icon: <ShoppingCart className="h-5 w-5" />,
            variant: stats.pendingPurchases > 0 ? "warning" as const : undefined,
        },
        {
            title: "Penerimaan Hari Ini",
            value: stats.todayReceipts,
            icon: <ClipboardCheck className="h-5 w-5" />,
            variant: "success" as const,
        },
        {
            title: "Produksi Hari Ini",
            value: `${stats.todayProductions} porsi`,
            icon: <ChefHat className="h-5 w-5" />,
        },
    ];

    if (!role) {
        return (
            <DashboardLayout title="Dashboard" description={today}>
                <Alert className="border-accent bg-accent/10">
                    <AlertTriangle className="h-4 w-4 text-accent" />
                    <AlertDescription className="text-foreground">
                        Akun Anda belum memiliki role. Silakan hubungi administrator untuk menetapkan role.
                    </AlertDescription>
                </Alert>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            title={`Selamat datang, ${profile?.name || 'User'}!`}
            description={today}
        >
            <div className="space-y-6 animate-fade-in">
                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {loading ? (
                        Array(4).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-32" />
                        ))
                    ) : (
                        statsCards.map((stat, index) => (
                            <StatCard key={index} {...stat} />
                        ))
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left Column - Activity */}
                    <div className="lg:col-span-2 space-y-6">
                        {loading ? (
                            <Skeleton className="h-96" />
                        ) : (
                            <RecentActivity activities={recentActivities} />
                        )}
                    </div>

                    {/* Right Column - Menu & Alerts */}
                    <div className="space-y-6">
                        {loading ? (
                            <>
                                <Skeleton className="h-48" />
                                <Skeleton className="h-64" />
                            </>
                        ) : (
                            <>
                                <TodayMenu
                                    date={new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                    items={todayMenuItems}
                                />
                                <LowStockAlert items={lowStockItems} />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
