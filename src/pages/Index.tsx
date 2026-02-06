import { useState, useEffect } from "react";
import { Package, ShoppingCart, ClipboardCheck, ChefHat, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { LowStockAlert } from "@/components/dashboard/LowStockAlert";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TodayMenu } from "@/components/dashboard/TodayMenu";
import { supabase } from "@/integrations/supabase/client";
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const todayDate = new Date().toISOString().split('T')[0];

      // Fetch all data in parallel
      const [
        ingredientsResult,
        purchasesResult,
        receiptsResult,
        productionsResult,
        menusResult,
      ] = await Promise.all([
        supabase.from('ingredients').select('id', { count: 'exact' }),
        supabase.from('purchases').select('id', { count: 'exact' }).in('status', ['draft', 'waiting']),
        supabase.from('receipts').select('id', { count: 'exact' }).gte('received_at', todayDate),
        supabase.from('productions').select('id, total_portions', { count: 'exact' }).eq('production_date', todayDate),
        supabase.from('menus').select('id, name').eq('menu_date', todayDate),
      ]);

      // Set stats
      setStats({
        totalIngredients: ingredientsResult.count || 0,
        pendingPurchases: purchasesResult.count || 0,
        todayReceipts: receiptsResult.count || 0,
        todayProductions: productionsResult.data?.reduce((sum, p) => sum + (p.total_portions || 0), 0) || 0,
      });

      // Fetch low stock items manually (comparing current_stock < minimum_stock)
      const { data: allIngredients } = await supabase
        .from('ingredients')
        .select('id, name, current_stock, minimum_stock, unit');

      if (allIngredients) {
        const lowStock = allIngredients
          .filter(i => i.current_stock < i.minimum_stock)
          .sort((a, b) => (a.current_stock / a.minimum_stock) - (b.current_stock / b.minimum_stock))
          .slice(0, 5)
          .map(i => ({
            id: i.id,
            name: i.name,
            currentStock: i.current_stock,
            minimumStock: i.minimum_stock,
            unit: i.unit,
          }));
        setLowStockItems(lowStock);
      }

      // Fetch recent stock movements for activity
      const { data: movements } = await supabase
        .from('stock_movements')
        .select(`
          id,
          type,
          qty,
          reference_table,
          created_at,
          ingredient:ingredients(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (movements) {
        const activities: Activity[] = movements.map(m => {
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
            type: typeMap[m.type] || 'stock_adjust',
            title: typeLabels[m.type] || 'Aktivitas',
            description: `${(m.ingredient as unknown as { name: string })?.name || 'Unknown'} - ${m.qty} unit`,
            time: formatTimeAgo(new Date(m.created_at)),
            status: 'completed',
          };
        });
        setRecentActivities(activities);
      }

      // Set today's menu items
      if (menusResult.data) {
        const menuItems: MenuItem[] = menusResult.data.map(m => ({
          id: m.id,
          name: m.name,
          portions: 0,
          status: 'planned' as const,
        }));
        setTodayMenuItems(menuItems);
      }

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
