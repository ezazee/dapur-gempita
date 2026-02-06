import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Calendar, Utensils, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Menu } from "@/types/database";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function MenusPage() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [menus, setMenus] = useState<Menu[]>([]);
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

  const canManage = hasPermission('menu.create') || hasPermission('menu.update');

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .order('menu_date', { ascending: false });

      if (error) throw error;
      setMenus(data || []);
    } catch (error) {
      console.error('Error fetching menus:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal memuat data menu",
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
    } else {
      setSelectedMenu(null);
      setFormData({
        name: "",
        description: "",
        menu_date: new Date().toISOString().split('T')[0],
      });
    }
    setIsDialogOpen(true);
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

    setIsSaving(true);
    try {
      if (selectedMenu) {
        const { error } = await supabase
          .from('menus')
          .update({
            name: formData.name,
            description: formData.description || null,
            menu_date: formData.menu_date,
          })
          .eq('id', selectedMenu.id);

        if (error) throw error;
        toast({
          title: "Berhasil",
          description: "Menu berhasil diperbarui",
        });
      } else {
        const { error } = await supabase
          .from('menus')
          .insert({
            name: formData.name,
            description: formData.description || null,
            menu_date: formData.menu_date,
            created_by: user?.id,
          });

        if (error) throw error;
        toast({
          title: "Berhasil",
          description: "Menu berhasil ditambahkan",
        });
      }

      setIsDialogOpen(false);
      fetchMenus();
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
      fetchMenus();
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

  return (
    <DashboardLayout
      title="Menu"
      description="Kelola menu harian dan resep"
    >
      <div className="space-y-4">
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

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Menu</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredMenus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "Tidak ada menu yang cocok" : "Belum ada data menu"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMenus.map((menu) => {
                  const dateStatus = getDateStatus(menu.menu_date);
                  return (
                    <TableRow key={menu.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Utensils className="h-4 w-4 text-muted-foreground" />
                          {menu.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(menu.menu_date), "d MMMM yyyy", { locale: id })}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {menu.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={dateStatus.variant}>
                          {dateStatus.label}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(menu)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedMenu(menu);
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
              {selectedMenu ? "Edit Menu" : "Tambah Menu"}
            </DialogTitle>
            <DialogDescription>
              {selectedMenu
                ? "Ubah informasi menu"
                : "Masukkan informasi menu baru"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Menu</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Nasi Goreng Spesial"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu_date">Tanggal Menu</Label>
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
                rows={3}
              />
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
