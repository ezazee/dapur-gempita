import { useState, useEffect } from "react";
import { Plus, Search, ChefHat, Loader2 } from "lucide-react";
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
import { Production, Menu, Ingredient } from "@/types/database";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function ProductionsPage() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [productions, setProductions] = useState<(Production & { menu?: Menu })[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    menu_id: "",
    production_date: new Date().toISOString().split('T')[0],
    total_portions: 0,
    note: "",
    items: [] as { ingredient_id: string; qty_used: number }[],
  });

  const canCreate = hasPermission('production.create');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productionsRes, menusRes, ingredientsRes] = await Promise.all([
        supabase.from('productions').select(`
          *,
          menu:menus(name)
        `).order('production_date', { ascending: false }),
        supabase.from('menus').select('*').order('menu_date', { ascending: false }),
        supabase.from('ingredients').select('*').order('name'),
      ]);

      if (productionsRes.error) throw productionsRes.error;
      if (menusRes.error) throw menusRes.error;
      if (ingredientsRes.error) throw ingredientsRes.error;

      setProductions((productionsRes.data || []) as unknown as (Production & { menu?: Menu })[]);
      setMenus(menusRes.data || []);
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
      menu_id: "",
      production_date: new Date().toISOString().split('T')[0],
      total_portions: 0,
      note: "",
      items: [{ ingredient_id: "", qty_used: 0 }],
    });
    setIsDialogOpen(true);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { ingredient_id: "", qty_used: 0 }],
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
    if (!formData.menu_id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Pilih menu terlebih dahulu",
      });
      return;
    }

    if (formData.total_portions <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Jumlah porsi harus lebih dari 0",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Create production
      const { data: production, error: productionError } = await supabase
        .from('productions')
        .insert({
          menu_id: formData.menu_id,
          production_date: formData.production_date,
          created_by: user?.id,
          total_portions: formData.total_portions,
          note: formData.note || null,
        })
        .select()
        .single();

      if (productionError) throw productionError;

      // Create production items
      const productionItems = formData.items
        .filter(item => item.ingredient_id && item.qty_used > 0)
        .map(item => ({
          production_id: production.id,
          ingredient_id: item.ingredient_id,
          qty_used: item.qty_used,
        }));

      if (productionItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('production_items')
          .insert(productionItems);

        if (itemsError) throw itemsError;
      }

      toast({
        title: "Berhasil",
        description: "Produksi berhasil dicatat",
      });

      setIsDialogOpen(false);
      fetchData();
    } catch (error: unknown) {
      console.error('Error saving production:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message || "Gagal menyimpan produksi",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProductions = productions.filter(p =>
    (p.menu as unknown as { name: string })?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.note?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout
      title="Produksi"
      description="Kelola catatan produksi harian"
    >
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari produksi..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {canCreate && (
            <Button onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Catat Produksi
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Menu</TableHead>
                <TableHead className="text-right">Porsi</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredProductions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "Tidak ada produksi yang cocok" : "Belum ada data produksi"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProductions.map((production) => (
                  <TableRow key={production.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ChefHat className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(production.production_date), "d MMM yyyy", { locale: id })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {(production.menu as unknown as { name: string })?.name || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {production.total_portions.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {production.note || "-"}
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
            <DialogTitle>Catat Produksi Baru</DialogTitle>
            <DialogDescription>
              Masukkan detail produksi dan bahan yang digunakan
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="menu_id">Menu</Label>
                <Select
                  value={formData.menu_id}
                  onValueChange={(value) => setFormData({ ...formData, menu_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih menu" />
                  </SelectTrigger>
                  <SelectContent>
                    {menus.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="production_date">Tanggal Produksi</Label>
                <Input
                  id="production_date"
                  type="date"
                  value={formData.production_date}
                  onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_portions">Jumlah Porsi</Label>
              <Input
                id="total_portions"
                type="number"
                min="1"
                value={formData.total_portions || ''}
                onChange={(e) => setFormData({ ...formData, total_portions: parseInt(e.target.value) || 0 })}
                placeholder="Masukkan jumlah porsi"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Catatan</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Catatan produksi (opsional)"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Bahan yang Digunakan</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Bahan
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
                              {ing.name} ({ing.unit}) - Stok: {ing.current_stock}
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
                        placeholder="Qty"
                        value={item.qty_used || ''}
                        onChange={(e) => updateItem(index, 'qty_used', parseFloat(e.target.value) || 0)}
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
