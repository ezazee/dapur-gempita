import { useState, useEffect } from "react";
import { Plus, Search, ClipboardCheck, Loader2, CheckCircle, XCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useAuth } from "@/hooks/useAuth";
import { Receipt, Purchase, Ingredient } from "@/types/database";
import { RECEIPT_STATUS_LABELS } from "@/lib/constants";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function ReceiptsPage() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    purchase_id: "",
    status: "accepted" as "accepted" | "rejected",
    note: "",
    items: [] as { ingredient_id: string; gross_weight: number; net_weight: number }[],
  });

  const canCreate = hasPermission('receipt.create');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [receiptsRes, purchasesRes, ingredientsRes] = await Promise.all([
        supabase.from('receipts').select('*').order('created_at', { ascending: false }),
        supabase.from('purchases').select('*').eq('status', 'approved'),
        supabase.from('ingredients').select('*').order('name'),
      ]);

      if (receiptsRes.error) throw receiptsRes.error;
      if (purchasesRes.error) throw purchasesRes.error;
      if (ingredientsRes.error) throw ingredientsRes.error;

      setReceipts(receiptsRes.data || []);
      setPurchases(purchasesRes.data || []);
      setIngredients(ingredientsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal memuat data",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      purchase_id: "",
      status: "accepted",
      note: "",
      items: [{ ingredient_id: "", gross_weight: 0, net_weight: 0 }],
    });
    setIsDialogOpen(true);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { ingredient_id: "", gross_weight: 0, net_weight: 0 }],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSave = async () => {
    if (!formData.purchase_id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Pilih pembelian terlebih dahulu",
      });
      return;
    }

    if (formData.items.length === 0 || !formData.items[0].ingredient_id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Tambahkan minimal 1 item penerimaan",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Create receipt
      const { data: receipt, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          purchase_id: formData.purchase_id,
          received_by: user?.id,
          status: formData.status,
          note: formData.note || null,
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Create receipt items
      const receiptItems = formData.items
        .filter(item => item.ingredient_id)
        .map(item => ({
          receipt_id: receipt.id,
          ingredient_id: item.ingredient_id,
          gross_weight: item.gross_weight,
          net_weight: item.net_weight,
          difference_qty: item.gross_weight - item.net_weight,
        }));

      if (receiptItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('receipt_items')
          .insert(receiptItems);

        if (itemsError) throw itemsError;
      }

      toast({
        title: "Berhasil",
        description: "Penerimaan berhasil dicatat",
      });

      setIsDialogOpen(false);
      fetchData();
    } catch (error: unknown) {
      console.error('Error saving receipt:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message || "Gagal menyimpan penerimaan",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredReceipts = receipts.filter(r =>
    r.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    return status === 'accepted' ? (
      <Badge variant="default" className="bg-primary">
        <CheckCircle className="h-3 w-3 mr-1" />
        {RECEIPT_STATUS_LABELS[status]}
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        {RECEIPT_STATUS_LABELS[status]}
      </Badge>
    );
  };

  return (
    <DashboardLayout
      title="Penerimaan"
      description="Kelola penerimaan barang dari supplier"
    >
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari penerimaan..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {canCreate && (
            <Button onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Catat Penerimaan
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "Tidak ada penerimaan yang cocok" : "Belum ada data penerimaan"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(receipt.received_at), "d MMM yyyy HH:mm", { locale: id })}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {receipt.note || "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(receipt.created_at), "d MMM yyyy", { locale: id })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Catat Penerimaan Baru</DialogTitle>
            <DialogDescription>
              Masukkan detail penerimaan barang dari supplier
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase_id">Pembelian</Label>
                <Select
                  value={formData.purchase_id}
                  onValueChange={(value) => setFormData({ ...formData, purchase_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pembelian" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchases.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {format(new Date(p.purchase_date), "d MMM yyyy", { locale: id })} - {p.total_items} item
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "accepted" | "rejected") => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accepted">Diterima</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Catatan</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Catatan penerimaan (opsional)"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Daftar Item</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Item
                </Button>
              </div>
              
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select
                        value={item.ingredient_id}
                        onValueChange={(value) => updateItem(index, 'ingredient_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih bahan" />
                        </SelectTrigger>
                        <SelectContent>
                          {ingredients.map((ing) => (
                            <SelectItem key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-28">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Bruto"
                        value={item.gross_weight || ''}
                        onChange={(e) => updateItem(index, 'gross_weight', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Netto"
                        value={item.net_weight || ''}
                        onChange={(e) => updateItem(index, 'net_weight', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    {formData.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
