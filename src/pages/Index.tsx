import { Package, ShoppingCart, ClipboardCheck, ChefHat } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { LowStockAlert } from "@/components/dashboard/LowStockAlert";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TodayMenu } from "@/components/dashboard/TodayMenu";

// Mock data - will be replaced with real data from database
const stats = [
  {
    title: "Total Bahan Baku",
    value: 48,
    icon: <Package className="h-5 w-5" />,
    trend: { value: 5, label: "dari bulan lalu" },
  },
  {
    title: "Pembelian Pending",
    value: 3,
    icon: <ShoppingCart className="h-5 w-5" />,
    trend: { value: -12, label: "dari kemarin" },
    variant: "warning" as const,
  },
  {
    title: "Penerimaan Hari Ini",
    value: 5,
    icon: <ClipboardCheck className="h-5 w-5" />,
    trend: { value: 8, label: "dari kemarin" },
    variant: "success" as const,
  },
  {
    title: "Produksi Hari Ini",
    value: 350,
    icon: <ChefHat className="h-5 w-5" />,
    trend: { value: 2, label: "porsi lebih" },
  },
];

const lowStockItems = [
  { id: "1", name: "Beras Premium", currentStock: 15, minimumStock: 50, unit: "kg" },
  { id: "2", name: "Minyak Goreng", currentStock: 8, minimumStock: 20, unit: "liter" },
  { id: "3", name: "Gula Pasir", currentStock: 5, minimumStock: 15, unit: "kg" },
  { id: "4", name: "Telur Ayam", currentStock: 30, minimumStock: 100, unit: "butir" },
];

const recentActivities = [
  {
    id: "1",
    type: "purchase" as const,
    title: "Pembelian Sayuran",
    description: "15 item - Rp 2.500.000",
    time: "10 menit lalu",
    status: "pending" as const,
  },
  {
    id: "2",
    type: "receipt" as const,
    title: "Penerimaan Daging Sapi",
    description: "50 kg - Gudang Utama",
    time: "1 jam lalu",
    status: "completed" as const,
  },
  {
    id: "3",
    type: "production" as const,
    title: "Produksi Menu Siang",
    description: "Nasi Goreng Spesial - 120 porsi",
    time: "2 jam lalu",
    status: "completed" as const,
  },
  {
    id: "4",
    type: "stock_adjust" as const,
    title: "Penyesuaian Stok",
    description: "Garam -2kg (Rusak)",
    time: "3 jam lalu",
  },
];

const todayMenuItems = [
  { id: "1", name: "Nasi Goreng Spesial", portions: 150, status: "completed" as const },
  { id: "2", name: "Ayam Bakar Madu", portions: 100, status: "in_progress" as const },
  { id: "3", name: "Soto Ayam", portions: 120, status: "planned" as const },
];

export default function Index() {
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <DashboardLayout 
      title="Dashboard" 
      description={today}
    >
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Activity & Menu */}
          <div className="lg:col-span-2 space-y-6">
            <RecentActivity activities={recentActivities} />
          </div>

          {/* Right Column - Alerts */}
          <div className="space-y-6">
            <TodayMenu 
              date={new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" })} 
              items={todayMenuItems} 
            />
            <LowStockAlert items={lowStockItems} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
