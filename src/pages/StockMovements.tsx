import { useState, useEffect } from "react";
import { Search, ArrowUpCircle, ArrowDownCircle, RefreshCcw, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { StockMovement } from "@/types/database";
import { STOCK_MOVEMENT_LABELS } from "@/lib/constants";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function StockMovementsPage() {
  const { toast } = useToast();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          ingredient:ingredients(name, unit)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMovements((data || []) as unknown as StockMovement[]);
    } catch (error) {
      console.error('Error fetching movements:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal memuat data pergerakan stok",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = movements.filter(m => {
    const matchesSearch = (m.ingredient as unknown as { name: string })?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <ArrowUpCircle className="h-4 w-4 text-primary" />;
      case 'OUT':
        return <ArrowDownCircle className="h-4 w-4 text-destructive" />;
      default:
        return <RefreshCcw className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      IN: 'default',
      OUT: 'destructive',
      ADJUST: 'outline',
    };
    return (
      <Badge variant={variants[type] || 'outline'}>
        {STOCK_MOVEMENT_LABELS[type] || type}
      </Badge>
    );
  };

  return (
    <DashboardLayout
      title="Pergerakan Stok"
      description="Riwayat pergerakan stok bahan baku"
    >
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari bahan baku..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Semua Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="IN">Masuk</SelectItem>
              <SelectItem value="OUT">Keluar</SelectItem>
              <SelectItem value="ADJUST">Penyesuaian</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Bahan</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Saldo Sebelum</TableHead>
                <TableHead className="text-right">Saldo Sesudah</TableHead>
                <TableHead>Referensi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery || typeFilter !== "all" ? "Tidak ada data yang cocok" : "Belum ada pergerakan stok"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="text-sm">
                      {format(new Date(movement.created_at), "d MMM yyyy HH:mm", { locale: id })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(movement.type)}
                        <span className="font-medium">
                          {(movement.ingredient as unknown as { name: string })?.name || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(movement.type)}</TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={movement.type === 'IN' ? 'text-primary' : movement.type === 'OUT' ? 'text-destructive' : ''}>
                        {movement.type === 'IN' ? '+' : movement.type === 'OUT' ? '-' : '±'}
                        {movement.qty.toLocaleString('id-ID')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {movement.balance_before.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {movement.balance_after.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {movement.reference_table || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
