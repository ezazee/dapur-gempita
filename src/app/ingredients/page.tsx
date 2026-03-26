'use client';

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, Loader2, History as HistoryIcon, Settings2, ChevronLeft, ChevronRight, CookingPot, PackageOpen, LayoutGrid } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { UNITS } from "@/lib/constants";
import { formatRecipeQty } from "@/lib/utils";
import { getIngredients, createIngredient, updateIngredient, deleteIngredient, adjustStock } from "@/app/actions/ingredients";
import { StockMovementDialog } from "@/components/ingredients/StockMovementDialog";
import { RouteGuard } from "@/components/RouteGuard";
import { Textarea } from "@/components/ui/textarea";

// Define local interfaces since we might not have a full shared types file yet or it matches Drizzle schema
interface Ingredient {
    id: string;
    name: string;
    unit: string;
    category: string;
    currentStock: number; // mapped from current_stock
    minimumStock: number; // mapped from minimum_stock
    createdAt: Date;
    updatedAt: Date;
}

export default function IngredientsPage() {
    const { hasPermission } = useAuth();
    const { toast } = useToast();
    const [ingredients, setIngredients] = useState<Ingredient[]>([]); // simplified type
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("MASAK");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isAdjustOpen, setIsAdjustOpen] = useState(false);
    const [adjustmentData, setAdjustmentData] = useState({ qty: 0, note: "" });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);

    const [formData, setFormData] = useState({
        name: "",
        unit: "kg",
        category: "MASAK",
        minimumStock: 0,
        currentStock: 0,
    });

    const canManageMaster = hasPermission('ingredient.create') || hasPermission('ingredient.delete');
    const canEditMaster = hasPermission('ingredient.update');
    const canAdjust = hasPermission('stock.adjust');

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            loadIngredients();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        loadIngredients();
    }, [page, activeTab]);

    const loadIngredients = async () => {
        setLoading(true);
        try {
            const { data, total } = await getIngredients({
                search: searchQuery,
                category: activeTab,
                page: page,
                pageSize: pageSize
            });
            setIngredients(data.map(i => ({
                ...i,
                currentStock: i.currentStock,
                minimumStock: i.minimumStock,
                createdAt: new Date(i.createdAt),
                updatedAt: new Date(i.updatedAt)
            })));
            setTotal(total);
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
                category: ingredient.category || activeTab,
                minimumStock: ingredient.minimumStock,
                currentStock: ingredient.currentStock,
            });
        } else {
            setSelectedIngredient(null);
            setFormData({
                name: "",
                unit: "kg",
                category: activeTab,
                minimumStock: 0,
                currentStock: 0,
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
                await updateIngredient(selectedIngredient.id, {
                    name: formData.name,
                    unit: formData.unit,
                    category: formData.category,
                    minimumStock: formData.minimumStock
                });

                toast({
                    title: "Berhasil",
                    description: "Bahan baku berhasil diperbarui",
                });
            } else {
                // Create
                await createIngredient({
                    name: formData.name,
                    unit: formData.unit,
                    category: formData.category,
                    minimumStock: formData.minimumStock,
                    currentStock: formData.currentStock
                });

                toast({
                    title: "Berhasil",
                    description: "Bahan baku berhasil ditambahkan",
                });
            }

            setIsDialogOpen(false);
            loadIngredients();
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

    const handleAdjust = async () => {
        if (!selectedIngredient) return;
        if (!adjustmentData.note.trim()) {
            toast({ variant: "destructive", title: "Gagal", description: "Alasan penyesuaian wajib diisi" });
            return;
        }

        setIsSaving(true);
        try {
            await adjustStock(selectedIngredient.id, adjustmentData.qty, adjustmentData.note);
            toast({ title: "Berhasil", description: "Penyesuaian stok berhasil disimpan" });
            setIsAdjustOpen(false);
            setAdjustmentData({ qty: 0, note: "" });
            loadIngredients();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Gagal menyesuaikan stok" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedIngredient) return;

        try {
            await deleteIngredient(selectedIngredient.id);

            toast({
                title: "Berhasil",
                description: "Bahan baku berhasil dihapus",
            });

            setIsDeleteDialogOpen(false);
            setSelectedIngredient(null);
            loadIngredients();
        } catch (error: unknown) {
            console.error('Error deleting ingredient:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: (error as Error).message || "Gagal menghapus bahan baku",
            });
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    const getStockStatus = (current: number, minimum: number) => {
        const ratio = current / minimum;
        if (ratio <= 0.3) return { label: "Kritis", variant: "destructive" as const };
        if (ratio <= 0.7) return { label: "Rendah", variant: "warning" as const };
        return { label: "Aman", variant: "success" as const };
    };

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'KEUANGAN', 'ASLAP', 'KEPALA_DAPUR', 'CHEF']}>
            <DashboardLayout
                title="Gudang (Stok Bahan Baku)"
                description="Pantau stok dan kelola master data bahan baku dapur"
            >
                <div className="space-y-4">
                    {/* Tabs for Categories */}
                    <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }} className="w-full">
                        <TabsList className="flex w-full overflow-x-auto bg-muted/50 p-1 h-auto min-w-full sm:min-w-0 sm:grid sm:grid-cols-3 sm:max-w-md">
                            <TabsTrigger value="MASAK" className="flex-1 flex items-center justify-center gap-2 py-2 px-3 whitespace-nowrap">
                                <CookingPot className="h-4 w-4" />
                                <span className="hidden sm:inline">Bahan Masak</span>
                                <span className="sm:hidden">Masak</span>
                            </TabsTrigger>
                            <TabsTrigger value="KERING" className="flex items-center gap-2">
                                <PackageOpen className="h-4 w-4" />
                                <span className="hidden sm:inline">Bahan Kering</span>
                                <span className="sm:hidden">Kering</span>
                            </TabsTrigger>
                            <TabsTrigger value="OPERASIONAL" className="flex items-center gap-2">
                                <LayoutGrid className="h-4 w-4" />
                                <span className="hidden sm:inline">Barang Operasional</span>
                                <span className="sm:hidden">Ops</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

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
                        <div className="flex flex-col sm:flex-row gap-2">
                            {canManageMaster && (
                                <Button onClick={() => handleOpenDialog()}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Tambah Bahan Baru
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-lg border bg-card overflow-x-auto">
                        <Table className="min-w-[800px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Bahan</TableHead>
                                    <TableHead>Satuan</TableHead>
                                    <TableHead className="text-right">Stok Saat Ini</TableHead>
                                    <TableHead className="text-right">Stok Minimum</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : ingredients.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            {searchQuery ? "Tidak ada bahan baku yang cocok" : "Belum ada data bahan baku"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    ingredients.map((ingredient) => {
                                        const stockStatus = getStockStatus(ingredient.currentStock, ingredient.minimumStock);
                                        return (
                                            <TableRow key={ingredient.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="h-4 w-4 text-muted-foreground" />
                                                        {ingredient.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{formatRecipeQty(ingredient.currentStock, ingredient.unit).unit}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {formatRecipeQty(ingredient.currentStock, ingredient.unit).stringValue}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {formatRecipeQty(ingredient.minimumStock, ingredient.unit).stringValue}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={stockStatus.variant === 'success' ? 'default' : stockStatus.variant === 'warning' ? 'secondary' : 'destructive'}>
                                                        {stockStatus.variant !== 'success' && (
                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                        )}
                                                        {stockStatus.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Kartu Stok"
                                                            onClick={() => {
                                                                setSelectedIngredient(ingredient);
                                                                setIsHistoryOpen(true);
                                                            }}
                                                        >
                                                            <HistoryIcon className="h-4 w-4 text-blue-600" />
                                                        </Button>
                                                        {canAdjust && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Penyesuaian Stok"
                                                                onClick={() => {
                                                                    setSelectedIngredient(ingredient);
                                                                    setAdjustmentData({ qty: ingredient.currentStock, note: "" });
                                                                    setIsAdjustOpen(true);
                                                                }}
                                                            >
                                                                <Edit className="h-4 w-4 text-orange-600" />
                                                            </Button>
                                                        )}
                                                        {canEditMaster && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleOpenDialog(ingredient)}
                                                            >
                                                                <Settings2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {canManageMaster && (
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
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 bg-muted/20 p-4 rounded-lg border">
                            <div className="text-sm text-muted-foreground">
                                Menampilkan <span className="font-medium">{(page - 1) * pageSize + 1}</span> sampai <span className="font-medium">{Math.min(page * pageSize, total)}</span> dari <span className="font-medium">{total}</span> bahan baku
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || loading}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Sebelumnya
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                        <Button
                                            key={p}
                                            variant={page === p ? "default" : "outline"}
                                            size="sm"
                                            className="w-8 h-8 p-0"
                                            onClick={() => setPage(p)}
                                            disabled={loading}
                                        >
                                            {p}
                                        </Button>
                                    ))}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || loading}
                                >
                                    Selanjutnya
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
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
                                    disabled={selectedIngredient !== null && !canManageMaster} // Disable if editing and not admin
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
                                <Label htmlFor="category">Kategori</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                                    disabled={selectedIngredient !== null && !canManageMaster}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MASAK">Bahan Menu Masak</SelectItem>
                                        <SelectItem value="KERING">Bahan Menu Kering</SelectItem>
                                        <SelectItem value="OPERASIONAL">Barang Operasional</SelectItem>
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
                                    value={formData.minimumStock}
                                    onChange={(e) => setFormData({ ...formData, minimumStock: parseFloat(e.target.value) || 0 })}
                                    disabled={selectedIngredient !== null && !canManageMaster} // Disable if editing and not admin
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
                                        value={formData.currentStock}
                                        onChange={(e) => setFormData({ ...formData, currentStock: parseFloat(e.target.value) || 0 })}
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

                {/* Stock Adjustment Dialog */}
                <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Penyesuaian Stok: {selectedIngredient?.name}</DialogTitle>
                            <DialogDescription>
                                Perbarui jumlah stok fisik yang tersedia saat ini. Perubahan ini akan dicatat dalam history.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="bg-muted p-3 rounded-md text-sm mb-2">
                                <span className="text-muted-foreground mr-2">Stok Sistem Saat Ini:</span>
                                <span className="font-bold underline">{selectedIngredient?.currentStock} {selectedIngredient?.unit}</span>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="qty_adjust">Jumlah Stok Fisik Sebenarnya</Label>
                                <Input
                                    id="qty_adjust"
                                    type="number"
                                    step="0.01"
                                    value={adjustmentData.qty}
                                    onChange={(e) => setAdjustmentData({ ...adjustmentData, qty: parseFloat(e.target.value) || 0 })}
                                />
                                <p className="text-[11px] text-muted-foreground italic">* Masukkan jumlah total barang yang ada di gudang sekarang.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="note_adjust">Alasan Penyesuaian (Wajib)</Label>
                                <Textarea
                                    id="note_adjust"
                                    placeholder="Contoh: Barang menyusut, ada bahan busuk, atau salah input sebelumnya."
                                    value={adjustmentData.note}
                                    onChange={(e) => setAdjustmentData({ ...adjustmentData, note: e.target.value })}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAdjustOpen(false)}>Batal</Button>
                            <Button onClick={handleAdjust} disabled={isSaving}>
                                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Simpan Penyesuaian
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* History Dialog */}
                <StockMovementDialog
                    open={isHistoryOpen}
                    onOpenChange={setIsHistoryOpen}
                    ingredientId={selectedIngredient?.id || ""}
                    ingredientName={selectedIngredient?.name || ""}
                />
            </DashboardLayout>
        </RouteGuard>
    );
}
