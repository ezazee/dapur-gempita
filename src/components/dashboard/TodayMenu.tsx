import { Calendar, UtensilsCrossed, Eye, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MenuItem {
  id: string;
  name: string;
  portions: number;
  status: "planned" | "in_progress" | "completed";
  productionId?: string;
  menuType?: string;
}

interface TodayMenuProps {
  date: string;
  items: MenuItem[];
  onViewDetail?: (id: string) => void;
  onViewHistory?: (menuType: string) => void;
}

const statusConfig = {
  planned: { label: "Direncanakan", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "Dalam Proses", color: "bg-accent/10 text-accent-foreground" },
  completed: { label: "Selesai", color: "bg-success/10 text-success" },
};

export function TodayMenu({ date, items, onViewDetail, onViewHistory }: TodayMenuProps) {
  const masakItems = items.filter(item => (item as any).menuType !== 'KERING');
  const keringItems = items.filter(item => (item as any).menuType === 'KERING');

  const renderItem = (item: MenuItem) => (
    <div
      key={item.id}
      className="flex items-center justify-between rounded-xl bg-muted/30 p-3 border border-border/50 hover:bg-muted/50 transition-colors mb-2 last:mb-0"
    >
      <div className="min-w-0 pr-2">
        <p className="font-bold text-sm truncate">{item.name}</p>
        <div className="flex flex-wrap gap-1 mt-1.5 items-center">
          {(item as any).countKecil > 0 && <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 rounded-sm font-black">K:{(item as any).countKecil}</span>}
          {(item as any).countBesar > 0 && <span className="text-[9px] bg-primary/20 text-primary border border-primary/30 px-1.5 rounded-sm font-black">B:{(item as any).countBesar}</span>}
          {(item as any).countBumil > 0 && <span className="text-[9px] bg-accent/20 text-accent-foreground border border-accent/30 px-1.5 rounded-sm font-black">M:{(item as any).countBumil}</span>}
          {(item as any).countBalita > 0 && <span className="text-[9px] bg-accent/30 text-accent-foreground border border-accent/40 px-1.5 rounded-sm font-black">L:{(item as any).countBalita}</span>}
          <span className="text-[10px] text-muted-foreground ml-1 font-medium">
            {item.portions || ((item as any).countKecil || 0) + ((item as any).countBesar || 0) + ((item as any).countBumil || 0) + ((item as any).countBalita || 0)} porsi
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {item.status === 'completed' && item.productionId && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-white border shadow-sm hover:text-primary"
            onClick={() => onViewDetail?.(item.productionId!)}
            title="Lihat Detail Modal"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        <Badge
          variant="secondary"
          className={cn("text-[10px] font-bold", statusConfig[item.status].color)}
        >
          {statusConfig[item.status].label}
        </Badge>
      </div>
    </div>
  );

  return (
    <Card className="overflow-hidden border-2 shadow-sm">
      <CardHeader className="pb-3 border-b bg-muted/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-black tracking-tight">
            <UtensilsCrossed className="h-4 w-4 text-primary" />
            MENU HARI INI
          </CardTitle>
          <Badge variant="outline" className="font-bold gap-1 text-[10px] bg-white">
            <Calendar className="h-3 w-3" />
            {date}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 opacity-40">
            <UtensilsCrossed className="h-8 w-8 mb-2" />
            <p className="text-xs font-medium">Belum ada menu terjadwal</p>
          </div>
        ) : (
          <>
            {/* Menu Masak (Ompreng) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 bg-primary/10 w-fit px-2 py-0.5 rounded">
                  Menu Masak
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[9px] font-black text-primary hover:text-primary hover:bg-primary/5 flex items-center gap-1 p-0 px-2"
                  onClick={() => onViewHistory?.('OMPRENG')}
                >
                  <History className="h-3 w-3" />
                  HISTORY
                </Button>
              </div>
              {masakItems.length > 0 ? (
                masakItems.map(renderItem)
              ) : (
                <p className="text-[10px] text-muted-foreground italic px-2">Tidak ada menu masak</p>
              )}
            </div>

            {/* Menu Kering / Snack */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black text-accent-foreground uppercase tracking-widest flex items-center gap-2 bg-accent/10 w-fit px-2 py-0.5 rounded">
                  Menu Kering
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[9px] font-black text-accent-foreground hover:text-accent-foreground hover:bg-accent/5 flex items-center gap-1 p-0 px-2"
                  onClick={() => onViewHistory?.('KERING')}
                >
                  <History className="h-3 w-3" />
                  HISTORY
                </Button>
              </div>
              {keringItems.length > 0 ? (
                keringItems.map(renderItem)
              ) : (
                <p className="text-[10px] text-muted-foreground italic px-2">Tidak ada menu kering</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
