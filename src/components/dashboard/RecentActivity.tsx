import {
  ShoppingCart,
  ClipboardCheck,
  ChefHat,
  Package,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Activity {
  id: string;
  type: "purchase" | "receipt" | "production" | "stock_adjust";
  title: string;
  description: string;
  time: string;
  status?: "pending" | "completed" | "rejected";
}

interface RecentActivityProps {
  activities: Activity[];
}

const activityIcons = {
  purchase: ShoppingCart,
  receipt: ClipboardCheck,
  production: ChefHat,
  stock_adjust: Package,
};

const activityColors = {
  purchase: "bg-primary/10 text-primary",
  receipt: "bg-success/10 text-success",
  production: "bg-accent/10 text-accent-foreground",
  stock_adjust: "bg-primary/10 text-primary",
};

const statusColors = {
  pending: "bg-accent/10 text-accent-foreground",
  completed: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const statusLabels = {
  pending: "Menunggu",
  completed: "Selesai",
  rejected: "Ditolak",
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card className="overflow-hidden border-2 shadow-sm h-full">
      <CardHeader className="pb-3 border-b bg-muted/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-black tracking-tight flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            AKTIVITAS TERBARU
          </CardTitle>
          <Link href="/stock-movements" className="contents">
            <Button variant="ghost" size="sm" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Lihat Semua
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-30">
              <Package className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">Belum ada aktivitas</p>
            </div>
          ) : (
            activities.map((activity) => {
              const Icon = activityIcons[activity.type] || Package;
              return (
                <div key={activity.id} className="flex gap-4 p-4 hover:bg-muted/30 transition-colors group">
                  <div className={cn(
                    "rounded-xl p-2.5 h-fit shadow-sm border group-hover:scale-105 transition-transform",
                    activityColors[activity.type] || "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-black tracking-tight truncate">{activity.title}</p>
                      <p className="text-[10px] font-bold text-muted-foreground/60 whitespace-nowrap">
                        {activity.time}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      {activity.description}
                    </p>
                    {activity.status && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded-sm tracking-tighter",
                          statusColors[activity.status] || "bg-muted text-muted-foreground"
                        )}>
                          {statusLabels[activity.status] || activity.status}
                        </span>
                        {/* If it's a production, we can show menu type info if available */}
                        {(activity as any).menuType && (
                          <span className={cn(
                            "text-[10px] font-black uppercase px-2 py-0.5 rounded-sm tracking-tighter",
                            (activity as any).menuType === 'KERING' ? "bg-accent/10 text-accent-foreground" : "bg-primary/10 text-primary"
                          )}>
                            {(activity as any).menuType === 'KERING' ? 'Snack' : 'Masak'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
