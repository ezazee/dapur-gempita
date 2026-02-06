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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Peringatan Stok Rendah
          </CardTitle>
          <Badge variant="secondary" className="font-mono">
            {items.length} item
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Semua stok dalam kondisi baik
          </p>
        ) : (
          items.map((item) => {
            const level = getStockLevel(item.currentStock, item.minimumStock);
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between rounded-lg p-3 transition-colors",
                  level === "critical" && "bg-destructive/10",
                  level === "low" && "bg-warning/10 pulse-warning",
                  level === "warning" && "bg-warning/5"
                )}
              >
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Min: {item.minimumStock} {item.unit}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-mono font-semibold text-sm",
                    level === "critical" && "text-destructive",
                    level === "low" && "text-warning",
                    level === "warning" && "text-warning/80"
                  )}>
                    {item.currentStock} {item.unit}
                  </p>
                  <Badge 
                    variant="secondary"
                    className={cn(
                      "text-[10px] mt-1",
                      level === "critical" && "bg-destructive/20 text-destructive",
                      level === "low" && "bg-warning/20 text-warning",
                      level === "warning" && "bg-warning/10 text-warning/80"
                    )}
                  >
                    {level === "critical" ? "Kritis" : level === "low" ? "Rendah" : "Perhatian"}
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
