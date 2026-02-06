import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Calendar, Utensils, Loader2, Package, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
}

interface MenuIngredient {
  id: string;
  ingredient_id: string;
  qty_needed: number;
  ingredient?: Ingredient;
}

interface Menu {
  id: string;
  name: string;
  description: string | null;
  menu_date: string;
  created_by: string;
  menu_ingredients?: MenuIngredient[];
}

export default function MenusPage() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    menu_date: new Date().toISOString().split('T')[0],
  });

  const [menuIngredients, setMenuIngredients] = useState<Array<{
    ingredient_id: string;
    qty_needed: number;
  }>>([]);

  const canManage = hasPermission('menu.create') || hasPermission('menu.update');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [menusRes, ingredientsRes] = await Promise.all([
        supabase
          .from('menus')
          .select(`
            *,
            menu_ingredients (
              id,
              ingredient_id,
              qty_needed,
              ingredients:ingredient_id (
                id,
                name,
                unit,
                current_stock
              )
            )
          `)
          .order('menu_date', { ascending: false }),
        supabase
          .from('ingredients')
          .select('id, name, unit, current_stock')
          .order('name')
      ]);

      if (menusRes.error) throw menusRes.error;
      if (ingredientsRes.error) throw ingredientsRes.error;
      
      // Transform data to flatten ingredient info
      const transformedMenus = (menusRes.data || []).map(menu => ({
        ...menu,
        menu_ingredients: menu.menu_ingredients?.map((mi: any) => ({
          ...mi,
          ingredient: mi.ingredients
        }))
      }));
      
      setMenus(transformedMenus);
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

  const handleOpenDialog = (menu?: Menu) => {
    if (menu) {
      setSelectedMenu(menu);
      setFormData({
        name: menu.name,
        description: menu.description || "",
        menu_date: menu.menu_date,
      });
      setMenuIngredients(
        menu.menu_ingredients?.map(mi => ({
          ingredient_id: mi.ingredient_id,
          qty_needed: mi.qty_needed,
        })) || []
      );
    } else {
      setSelectedMenu(null);
      setFormData({
        name: "",
        description: "",
        menu_date: new Date().toISOString().split('T')[0],
      });
      setMenuIngredients([]);
    }
    setIsDialogOpen(true);
  };

  const handleAddIngredient = () => {
    setMenuIngredients([...menuIngredients, { ingredient_id: "", qty_needed: 0 }]);
  };

  const handleRemoveIngredient = (index: number) => {
    setMenuIngredients(menuIngredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: string, value: string | number) => {
    const updated = [...menuIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setMenuIngredients(updated);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Nama menu wajib diisi",
      });
      return;
    }

    // Validate ingredients
    const validIngredients = menuIngredients.filter(
      mi => mi.ingredient_id && mi.qty_needed > 0
    );

    setIsSaving(true);
    try {
      if (selectedMenu) {
        // Update menu
        const { error: menuError } = await supabase
          .from('menus')
          .update({
            name: formData.name,
            description: formData.description || null,
            menu_date: formData.menu_date,
          })
          .eq('id', selectedMenu.id);

        if (menuError) throw menuError;

        // Delete existing menu ingredients
        await supabase
          .from('menu_ingredients')
          .delete()
          .eq('menu_id', selectedMenu.id);

        // Insert new menu ingredients
        if (validIngredients.length > 0) {
          const { error: ingredientError } = await supabase
            .from('menu_ingredients')
            .insert(
              validIngredients.map(mi => ({
                menu_id: selectedMenu.id,
                ingredient_id: mi.ingredient_id,
                qty_needed: mi.qty_needed,
              }))
            );

          if (ingredientError) throw ingredientError;
        }

        toast({
          title: "Berhasil",
          description: "Menu berhasil diperbarui",
        });
      } else {
        // Create menu
        const { data: newMenu, error: menuError } = await supabase
          .from('menus')
          .insert({
            name: formData.name,
            description: formData.description || null,
            menu_date: formData.menu_date,
            created_by: user?.id,
          })
          .select()
          .single();

        if (menuError) throw menuError;

        // Insert menu ingredients
        if (validIngredients.length > 0) {
          const { error: ingredientError } = await supabase
            .from('menu_ingredients')
            .insert(
              validIngredients.map(mi => ({
                menu_id: newMenu.id,
                ingredient_id: mi.ingredient_id,
                qty_needed: mi.qty_needed,
              }))
            );

          if (ingredientError) throw ingredientError;
        }

        toast({
          title: "Berhasil",
          description: "Menu berhasil ditambahkan",
        });
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: unknown) {
      console.error('Error saving menu:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message || "Gagal menyimpan menu",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMenu) return;

    try {
      // Delete menu ingredients first
      await supabase
        .from('menu_ingredients')
        .delete()
        .eq('menu_id', selectedMenu.id);

      // Delete menu
      const { error } = await supabase
        .from('menus')
        .delete()
        .eq('id', selectedMenu.id);

      if (error) throw error;
      
      toast({
        title: "Berhasil",
        description: "Menu berhasil dihapus",
      });
      
      setIsDeleteDialogOpen(false);
      setSelectedMenu(null);
      fetchData();
    } catch (error: unknown) {
      console.error('Error deleting menu:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message || "Gagal menghapus menu",
      });
    }
  };

  const filteredMenus = menus.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDateStatus = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const menuDate = new Date(dateStr);
    menuDate.setHours(0, 0, 0, 0);
    
    if (menuDate.getTime() === today.getTime()) return { label: "Hari Ini", variant: "default" as const };
    if (menuDate > today) return { label: "Mendatang", variant: "secondary" as const };
    return { label: "Selesai", variant: "outline" as const };
  };

  const getIngredientById = (id: string) => ingredients.find(i => i.id === id);

  if (loading) {
    return (
      <DashboardLayout title="Menu Harian" description="Kelola menu dan bahan yang dibutuhkan">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Menu Harian"
      description="Kelola menu dan bahan yang dibutuhkan"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari menu..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {canManage && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Menu
            </Button>
          )}
        </div>

        {/* Menu Cards */}
        {filteredMenus.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Utensils className="h-12 w-12 mb-4 opacity-50" />
              <p>{searchQuery ? "Tidak ada menu yang cocok" : "Belum ada data menu"}</p>
              {canManage && !searchQuery && (
                <Button variant="outline" className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Menu Pertama
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMenus.map((menu) => {
              const dateStatus = getDateStatus(menu.menu_date);
              return (
                <Card key={menu.id} className="relative overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Utensils className="h-4 w-4 text-primary" />
                          {menu.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(menu.menu_date), "EEEE, d MMMM yyyy", { locale: idLocale })}
                        </CardDescription>
                      </div>
                      <Badge variant={dateStatus.variant}>{dateStatus.label}</Badge>
                    </div>
                    {menu.description && (
                      <p className="text-sm text-muted-foreground pt-2">{menu.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Ingredients List */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        Bahan yang Dibutuhkan
                      </h4>
                      {menu.menu_ingredients && menu.menu_ingredients.length > 0 ? (
                        <ul className="space-y-1">
                          {menu.menu_ingredients.map((mi) => (
                            <li key={mi.id} className="text-sm flex justify-between items-center py-1 px-2 bg-muted/50 rounded">
                              <span>{mi.ingredient?.name || 'Unknown'}</span>
                              <span className="text-muted-foreground">
                                {mi.qty_needed} {mi.ingredient?.unit}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Belum ada bahan</p>
                      )}
                    </div>

                    {/* Actions */}
                    {canManage && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleOpenDialog(menu)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMenu(menu);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMenu ? "Edit Menu" : "Tambah Menu"}
            </DialogTitle>
            <DialogDescription>
              {selectedMenu
                ? "Ubah informasi menu dan bahan yang dibutuhkan"
                : "Masukkan menu baru beserta bahan yang dibutuhkan"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Menu Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nama Menu *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Nasi Goreng Spesial"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="menu_date">Tanggal Menu *</Label>
                <Input
                  id="menu_date"
                  type="date"
                  value={formData.menu_date}
                  onChange={(e) => setFormData({ ...formData, menu_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi menu (opsional)"
                  rows={1}
                />
              </div>
            </div>

            {/* Ingredients Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Bahan yang Dibutuhkan</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddIngredient}>
                  <Plus className="h-3 w-3 mr-1" />
                  Tambah Bahan
                </Button>
              </div>

              {menuIngredients.length === 0 ? (
                <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Belum ada bahan. Klik "Tambah Bahan" untuk menambahkan.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {menuIngredients.map((mi, index) => {
                    const selectedIngredient = getIngredientById(mi.ingredient_id);
                    return (
                      <div key={index} className="flex gap-2 items-start p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <Select
                            value={mi.ingredient_id}
                            onValueChange={(value) => handleIngredientChange(index, 'ingredient_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih bahan..." />
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
                            placeholder="Jumlah"
                            value={mi.qty_needed || ""}
                            onChange={(e) => handleIngredientChange(index, 'qty_needed', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="w-16 flex items-center justify-center text-sm text-muted-foreground pt-2">
                          {selectedIngredient?.unit || "-"}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => handleRemoveIngredient(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
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

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Menu?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus "{selectedMenu?.name}"? 
              Semua bahan yang terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
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
