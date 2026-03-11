import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LowStockItem {
  id: string;
  name: string;
  currentStock: number;
  minimumStock: number;
  unit: string;
}

interface LowStockAlertProps {
  items: LowStockItem[];
}

export function LowStockAlert({ items }: LowStockAlertProps) {
  const getStockLevel = (current: number, minimum: number) => {
    const ratio = current / minimum;
    if (ratio <= 0.25) return "critical";
    if (ratio <= 0.5) return "low";
    return "warning";
  };

  return (
    <Card className="overflow-hidden border-2 shadow-sm">
      <CardHeader className="pb-3 border-b bg-muted/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-black tracking-tight">
            <AlertTriangle className="h-4 w-4 text-accent-foreground" />
            STOK RENDAH
          </CardTitle>
          <Badge variant="secondary" className="font-black text-[10px] bg-white border shadow-sm">
            {items.length} ITEM
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 opacity-30">
            <AlertTriangle className="h-8 w-8 mb-1" />
            <p className="text-xs font-bold">Stok Aman</p>
          </div>
        ) : (
          items.map((item) => {
            const level = getStockLevel(item.currentStock, item.minimumStock);
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between rounded-xl p-3 transition-all border border-transparent",
                  level === "critical" && "bg-destructive/5 border-destructive/10",
                  level === "low" && "bg-accent/5 border-accent/10",
                  level === "warning" && "bg-muted/30 border-muted-foreground/10"
                )}
              >
                <div className="min-w-0">
                  <p className="font-black text-sm truncate uppercase tracking-tight">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground font-bold italic">
                    Min: {item.minimumStock} {item.unit}
                  </p>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "font-black text-sm",
                    level === "critical" && "text-destructive",
                    level === "low" && "text-accent-foreground",
                    level === "warning" && "text-muted-foreground"
                  )}>
                    {item.currentStock} {item.unit}
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[8px] h-4 font-black uppercase mt-0.5",
                      level === "critical" && "bg-destructive text-white",
                      level === "low" && "bg-accent text-accent-foreground",
                      level === "warning" && "bg-muted-foreground text-white"
                    )}
                  >
                    {level === "critical" ? "Kritis" : level === "low" ? "Rendah" : "Pantau"}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
