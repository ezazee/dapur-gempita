import { Calendar, UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MenuItem {
  id: string;
  name: string;
  portions: number;
  status: "planned" | "in_progress" | "completed";
}

interface TodayMenuProps {
  date: string;
  items: MenuItem[];
}

const statusConfig = {
  planned: { label: "Direncanakan", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "Dalam Proses", color: "bg-warning/10 text-warning" },
  completed: { label: "Selesai", color: "bg-success/10 text-success" },
};

export function TodayMenu({ date, items }: TodayMenuProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            Menu Hari Ini
          </CardTitle>
          <Badge variant="outline" className="font-normal gap-1.5">
            <Calendar className="h-3 w-3" />
            {date}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Belum ada menu untuk hari ini
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
            >
              <div>
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.portions} porsi
                </p>
              </div>
              <Badge 
                variant="secondary"
                className={statusConfig[item.status].color}
              >
                {statusConfig[item.status].label}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
