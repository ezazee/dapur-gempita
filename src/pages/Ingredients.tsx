import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, Loader2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Ingredient } from "@/types/database";
import { UNITS } from "@/lib/constants";

export default function IngredientsPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    unit: "kg",
    minimum_stock: 0,
    current_stock: 0,
  });

  const canManage = hasPermission('ingredient.create') || hasPermission('ingredient.update');

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name');

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal memuat data bahan baku",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (ingredient?: Ingredient) => {
    if (ingredient) {
      setSelectedIngredient(ingredient);
      setFormData({
        name: ingredient.name,
        unit: ingredient.unit,
        minimum_stock: ingredient.minimum_stock,
        current_stock: ingredient.current_stock,
      });
    } else {
      setSelectedIngredient(null);
      setFormData({
        name: "",
        unit: "kg",
        minimum_stock: 0,
        current_stock: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Nama bahan baku wajib diisi",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (selectedIngredient) {
        // Update
        const { error } = await supabase
          .from('ingredients')
          .update({
            name: formData.name,
            unit: formData.unit,
            minimum_stock: formData.minimum_stock,
          })
          .eq('id', selectedIngredient.id);

        if (error) throw error;
        toast({
          title: "Berhasil",
          description: "Bahan baku berhasil diperbarui",
        });
      } else {
        // Create
        const { error } = await supabase
          .from('ingredients')
          .insert({
            name: formData.name,
            unit: formData.unit,
            minimum_stock: formData.minimum_stock,
            current_stock: formData.current_stock,
          });

        if (error) throw error;
        toast({
          title: "Berhasil",
          description: "Bahan baku berhasil ditambahkan",
        });
      }

      setIsDialogOpen(false);
      fetchIngredients();
    } catch (error: unknown) {
      console.error('Error saving ingredient:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message || "Gagal menyimpan bahan baku",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedIngredient) return;

    try {
      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', selectedIngredient.id);

      if (error) throw error;
      
      toast({
        title: "Berhasil",
        description: "Bahan baku berhasil dihapus",
      });
      
      setIsDeleteDialogOpen(false);
      setSelectedIngredient(null);
      fetchIngredients();
    } catch (error: unknown) {
      console.error('Error deleting ingredient:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message || "Gagal menghapus bahan baku",
      });
    }
  };

  const filteredIngredients = ingredients.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockStatus = (current: number, minimum: number) => {
    const ratio = current / minimum;
    if (ratio <= 0.3) return { label: "Kritis", variant: "destructive" as const };
    if (ratio <= 0.7) return { label: "Rendah", variant: "warning" as const };
    return { label: "Aman", variant: "success" as const };
  };

  return (
    <DashboardLayout
      title="Bahan Baku"
      description="Kelola master data bahan baku dapur"
    >
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari bahan baku..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {canManage && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Bahan Baku
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Bahan</TableHead>
                <TableHead>Satuan</TableHead>
                <TableHead className="text-right">Stok Saat Ini</TableHead>
                <TableHead className="text-right">Stok Minimum</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredIngredients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "Tidak ada bahan baku yang cocok" : "Belum ada data bahan baku"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredIngredients.map((ingredient) => {
                  const stockStatus = getStockStatus(ingredient.current_stock, ingredient.minimum_stock);
                  return (
                    <TableRow key={ingredient.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {ingredient.name}
                        </div>
                      </TableCell>
                      <TableCell>{ingredient.unit}</TableCell>
                      <TableCell className="text-right font-mono">
                        {ingredient.current_stock.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {ingredient.minimum_stock.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={stockStatus.variant === 'success' ? 'default' : stockStatus.variant === 'warning' ? 'secondary' : 'destructive'}>
                          {stockStatus.variant !== 'success' && (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          )}
                          {stockStatus.label}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(ingredient)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedIngredient(ingredient);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedIngredient ? "Edit Bahan Baku" : "Tambah Bahan Baku"}
            </DialogTitle>
            <DialogDescription>
              {selectedIngredient
                ? "Ubah informasi bahan baku"
                : "Masukkan informasi bahan baku baru"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Bahan</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Beras Premium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Satuan</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimum_stock">Stok Minimum</Label>
              <Input
                id="minimum_stock"
                type="number"
                min="0"
                step="0.01"
                value={formData.minimum_stock}
                onChange={(e) => setFormData({ ...formData, minimum_stock: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {!selectedIngredient && (
              <div className="space-y-2">
                <Label htmlFor="current_stock">Stok Awal</Label>
                <Input
                  id="current_stock"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}
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

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Bahan Baku?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus "{selectedIngredient?.name}"? 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
