import { useState, useEffect } from "react";
import { Plus, Search, Eye, ShoppingCart, Loader2, FileText } from "lucide-react";
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
import { Purchase, Ingredient } from "@/types/database";
import { PURCHASE_STATUS_LABELS } from "@/lib/constants";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function PurchasesPage() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    purchase_date: new Date().toISOString().split('T')[0],
    note: "",
    items: [] as { ingredient_id: string; estimated_qty: number; unit_price: number }[],
  });

  const canCreate = hasPermission('purchase.create');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [purchasesRes, ingredientsRes] = await Promise.all([
        supabase.from('purchases').select('*').order('created_at', { ascending: false }),
        supabase.from('ingredients').select('*').order('name'),
      ]);

      if (purchasesRes.error) throw purchasesRes.error;
      if (ingredientsRes.error) throw ingredientsRes.error;

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
      purchase_date: new Date().toISOString().split('T')[0],
      note: "",
      items: [{ ingredient_id: "", estimated_qty: 0, unit_price: 0 }],
    });
    setIsDialogOpen(true);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { ingredient_id: "", estimated_qty: 0, unit_price: 0 }],
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
    if (formData.items.length === 0 || !formData.items[0].ingredient_id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Tambahkan minimal 1 item pembelian",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Create purchase
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          purchase_date: formData.purchase_date,
          created_by: user?.id,
          status: 'draft',
          note: formData.note || null,
          total_items: formData.items.length,
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Create purchase items
      const purchaseItems = formData.items
        .filter(item => item.ingredient_id)
        .map(item => ({
          purchase_id: purchase.id,
          ingredient_id: item.ingredient_id,
          estimated_qty: item.estimated_qty,
          unit_price: item.unit_price,
        }));

      if (purchaseItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('purchase_items')
          .insert(purchaseItems);

        if (itemsError) throw itemsError;
      }

      toast({
        title: "Berhasil",
        description: "Pembelian berhasil dibuat",
      });

      setIsDialogOpen(false);
      fetchData();
    } catch (error: unknown) {
      console.error('Error saving purchase:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message || "Gagal menyimpan pembelian",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (purchaseId: string, newStatus: 'draft' | 'waiting' | 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('purchases')
        .update({ status: newStatus })
        .eq('id', purchaseId);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Status pembelian diperbarui",
      });
      
      fetchData();
    } catch (error: unknown) {
      console.error('Error updating status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message,
      });
    }
  };

  const filteredPurchases = purchases.filter(p =>
    p.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'outline',
      waiting: 'secondary',
      approved: 'default',
      rejected: 'destructive',
    };
    const variant = variants[status] || 'outline';
    return (
      <Badge variant={variant}>
        {PURCHASE_STATUS_LABELS[status] || status}
      </Badge>
    );
  };

  return (
    <DashboardLayout
      title="Pembelian"
      description="Kelola permintaan pembelian bahan baku"
    >
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari pembelian..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {canCreate && (
            <Button onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Buat Pembelian
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jumlah Item</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "Tidak ada pembelian yang cocok" : "Belum ada data pembelian"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(purchase.purchase_date), "d MMM yyyy", { locale: id })}
                      </div>
                    </TableCell>
                    <TableCell>{purchase.total_items} item</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {purchase.note || "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {purchase.status === 'draft' && hasPermission('purchase.update_draft') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(purchase.id, 'waiting')}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Ajukan
                          </Button>
                        )}
                        {purchase.status === 'waiting' && hasPermission('*') && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(purchase.id, 'approved')}
                            >
                              Setujui
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(purchase.id, 'rejected')}
                            >
                              Tolak
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
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
            <DialogTitle>Buat Pembelian Baru</DialogTitle>
            <DialogDescription>
              Masukkan daftar bahan baku yang akan dibeli
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase_date">Tanggal Pembelian</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Catatan</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Catatan pembelian (opsional)"
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
                    <div className="w-24">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Qty"
                        value={item.estimated_qty || ''}
                        onChange={(e) => updateItem(index, 'estimated_qty', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Harga"
                        value={item.unit_price || ''}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
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
