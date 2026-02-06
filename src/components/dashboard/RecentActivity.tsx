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
  purchase: "bg-info/10 text-info",
  receipt: "bg-success/10 text-success",
  production: "bg-warning/10 text-warning",
  stock_adjust: "bg-primary/10 text-primary",
};

const statusColors = {
  pending: "bg-warning/10 text-warning",
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Aktivitas Terbaru</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            Lihat Semua
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type];
          return (
            <div key={activity.id} className="flex gap-3">
              <div className={cn("rounded-lg p-2 h-fit", activityColors[activity.type])}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  {activity.status && (
                    <span className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
                      statusColors[activity.status]
                    )}>
                      {statusLabels[activity.status]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {activity.description}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  {activity.time}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
