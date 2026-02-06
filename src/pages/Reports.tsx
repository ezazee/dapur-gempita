import { useState, useEffect } from "react";
import { FileBarChart, Download, Calendar, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";

interface StockSummary {
  ingredient_name: string;
  unit: string;
  opening_stock: number;
  total_in: number;
  total_out: number;
  closing_stock: number;
}

interface DailyReport {
  date: string;
  total_receipts: number;
  total_productions: number;
  total_portions: number;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [stockSummary, setStockSummary] = useState<StockSummary[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch ingredients with current stock
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('id, name, unit, current_stock')
        .order('name');

      if (ingredientsError) throw ingredientsError;

      // Fetch stock movements for the period
      const { data: movements, error: movementsError } = await supabase
        .from('stock_movements')
        .select('ingredient_id, type, qty')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');

      if (movementsError) throw movementsError;

      // Calculate summary per ingredient
      const summary: StockSummary[] = (ingredients || []).map(ing => {
        const ingMovements = movements?.filter(m => m.ingredient_id === ing.id) || [];
        const totalIn = ingMovements
          .filter(m => m.type === 'IN')
          .reduce((sum, m) => sum + (m.qty || 0), 0);
        const totalOut = ingMovements
          .filter(m => m.type === 'OUT')
          .reduce((sum, m) => sum + Math.abs(m.qty || 0), 0);
        
        // Opening stock = current stock - net change in period
        const netChange = totalIn - totalOut;
        const openingStock = ing.current_stock - netChange;

        return {
          ingredient_name: ing.name,
          unit: ing.unit,
          opening_stock: Math.max(0, openingStock),
          total_in: totalIn,
          total_out: totalOut,
          closing_stock: ing.current_stock,
        };
      });

      setStockSummary(summary);

      // Fetch daily activity
      const { data: receipts, error: receiptsError } = await supabase
        .from('receipts')
        .select('received_at, status')
        .gte('received_at', startDate)
        .lte('received_at', endDate + 'T23:59:59')
        .eq('status', 'accepted');

      if (receiptsError) throw receiptsError;

      const { data: productions, error: productionsError } = await supabase
        .from('productions')
        .select('production_date, total_portions')
        .gte('production_date', startDate)
        .lte('production_date', endDate);

      if (productionsError) throw productionsError;

      // Group by date
      const dateMap = new Map<string, DailyReport>();
      
      receipts?.forEach(r => {
        const date = format(new Date(r.received_at), 'yyyy-MM-dd');
        const existing = dateMap.get(date) || { date, total_receipts: 0, total_productions: 0, total_portions: 0 };
        existing.total_receipts++;
        dateMap.set(date, existing);
      });

      productions?.forEach(p => {
        const date = p.production_date;
        const existing = dateMap.get(date) || { date, total_receipts: 0, total_productions: 0, total_portions: 0 };
        existing.total_productions++;
        existing.total_portions += p.total_portions || 0;
        dateMap.set(date, existing);
      });

      const dailyData = Array.from(dateMap.values()).sort((a, b) => b.date.localeCompare(a.date));
      setDailyReports(dailyData);

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal memuat data laporan",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Laporan"
      description="Laporan stok dan aktivitas dapur"
    >
      <div className="space-y-6">
        {/* Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Periode Laporan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="start_date">Tanggal Mulai</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Tanggal Akhir</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={fetchReportData} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileBarChart className="h-4 w-4 mr-2" />}
                Tampilkan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Tabs */}
        <Tabs defaultValue="stock">
          <TabsList>
            <TabsTrigger value="stock">Ringkasan Stok</TabsTrigger>
            <TabsTrigger value="daily">Aktivitas Harian</TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Ringkasan Pergerakan Stok</CardTitle>
                <CardDescription>
                  Periode: {format(new Date(startDate), "d MMMM yyyy", { locale: id })} - {format(new Date(endDate), "d MMMM yyyy", { locale: id })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bahan</TableHead>
                        <TableHead>Satuan</TableHead>
                        <TableHead className="text-right">Stok Awal</TableHead>
                        <TableHead className="text-right text-primary">Masuk</TableHead>
                        <TableHead className="text-right text-destructive">Keluar</TableHead>
                        <TableHead className="text-right">Stok Akhir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : stockSummary.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Tidak ada data
                          </TableCell>
                        </TableRow>
                      ) : (
                        stockSummary.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{row.ingredient_name}</TableCell>
                            <TableCell>{row.unit}</TableCell>
                            <TableCell className="text-right font-mono">{row.opening_stock.toLocaleString('id-ID')}</TableCell>
                            <TableCell className="text-right font-mono text-primary">+{row.total_in.toLocaleString('id-ID')}</TableCell>
                            <TableCell className="text-right font-mono text-destructive">-{row.total_out.toLocaleString('id-ID')}</TableCell>
                            <TableCell className="text-right font-mono font-bold">{row.closing_stock.toLocaleString('id-ID')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Aktivitas Harian</CardTitle>
                <CardDescription>
                  Ringkasan penerimaan dan produksi per hari
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="text-right">Penerimaan</TableHead>
                        <TableHead className="text-right">Produksi</TableHead>
                        <TableHead className="text-right">Total Porsi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : dailyReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Tidak ada aktivitas pada periode ini
                          </TableCell>
                        </TableRow>
                      ) : (
                        dailyReports.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">
                              {format(new Date(row.date), "EEEE, d MMMM yyyy", { locale: id })}
                            </TableCell>
                            <TableCell className="text-right font-mono">{row.total_receipts}</TableCell>
                            <TableCell className="text-right font-mono">{row.total_productions}</TableCell>
                            <TableCell className="text-right font-mono font-bold">{row.total_portions.toLocaleString('id-ID')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
