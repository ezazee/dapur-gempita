'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Plus, X, Calculator, History } from 'lucide-react';
import { createMenu, updateMenu } from '@/app/actions/menus';
import { toast } from 'sonner';
import { RecipeSelectionDialog } from './RecipeSelectionDialog';
import { HistorySelectionDialog } from './HistorySelectionDialog';

interface CreateMenuDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    date: Date;
    onSuccess: () => void;
    menuToEdit?: any | null;
    initialData?: any | null; // Added for duplication from History
}

export function CreateMenuDialog({ open, onOpenChange, date, onSuccess, menuToEdit, initialData }: CreateMenuDialogProps) {
    const [portionCount, setPortionCount] = useState<number>(1);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [ingredients, setIngredients] = useState<{ tempId: number, name: string; qty: number; gramasi?: number; unit: string }[]>([]);
    const [loading, setLoading] = useState(false);

    // Dialogs State
    const [isRecipeOpen, setIsRecipeOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Handle initialData from Notes/History page duplication
    useEffect(() => {
        if (open && initialData) {
            handleSelectHistory(initialData);
        }
    }, [open, initialData]);

    const handleSelectRecipe = (recipe: any) => {
        // Set portion count from recipe default
        setPortionCount(recipe.portionSize || 100);
        setName(`${recipe.name}`);
        setDescription(recipe.description || '');

        // Load ingredients with their base Gramasi (per portion)
        setIngredients(recipe.ingredients.map((ing: any) => ({
            tempId: Math.random(),
            name: ing.name,
            qty: parseFloat((ing.qtyPerPortion * (recipe.portionSize || 100)).toFixed(4)), // Initial Total
            gramasi: ing.qtyPerPortion, // Base Gramasi
            unit: ing.unit
        })));
        setIsRecipeOpen(false);
        toast.success(`Resep standar dimuat. Silakan sesuaikan jumlah porsi.`);
    };

    const handleSelectHistory = (menu: any) => {
        // Pre-fill form from a past menu
        setName(`${menu.name} (Copy)`);
        setDescription(menu.description || '');
        setPortionCount(menu.portionCount || 100); // Default if old data missing it

        setIngredients(menu.ingredients.map((ing: any) => ({
            tempId: Math.random(),
            name: ing.name,
            qty: ing.qtyNeeded || ing.qty,
            gramasi: ing.qtyNeeded ? (ing.qtyNeeded / (menu.portionCount || 100)) : 0, // Reverse calculate gramasi
            unit: ing.unit
        })));
        setIsHistoryOpen(false);
        if (!initialData) {
            toast.success(`Menu "${menu.name}" berhasil disalin.`);
        }
    };

    // Recalculate Totals when Portion Count changes
    useEffect(() => {
        if (portionCount > 0) {
            setIngredients(prev => prev.map(ing => ({
                ...ing,
                qty: parseFloat(((ing.gramasi || 0) * portionCount).toFixed(4))
            })));
        }
    }, [portionCount]);

    // Populate form if editing
    useEffect(() => {
        if (open) {
            if (menuToEdit) {
                // EDIT MODE
                setName(menuToEdit.name);
                setDescription(menuToEdit.description || '');
                setPortionCount(menuToEdit.portionCount || 100);
                setIngredients(menuToEdit.ingredients.map((ing: any) => ({
                    tempId: Math.random(),
                    name: ing.name,
                    qty: ing.qtyNeeded,
                    gramasi: ing.qtyNeeded / (menuToEdit.portionCount || 100),
                    unit: ing.unit
                })));
            } else if (!initialData) {
                // CREATE MODE (Only reset if NOT loading initialData)
                setName('');
                setDescription('');
                setPortionCount(100); // Default starter
                setIngredients([]);
            }
        }
    }, [open, menuToEdit, initialData]);

    const addEmptyRow = () => {
        setIngredients([...ingredients, { tempId: Date.now(), name: '', qty: 0, gramasi: 0, unit: 'kg' }]);
    };

    // Update with Gramasi logic
    const updateIngredient = (tempId: number, field: keyof typeof ingredients[0], value: any) => {
        setIngredients(prev => prev.map(i => {
            if (i.tempId !== tempId) return i;

            const updated = { ...i, [field]: value };

            if (field === 'gramasi') {
                // If Gramasi changed, Recalc Total
                updated.qty = parseFloat((value * portionCount).toFixed(4));
            } else if (field === 'qty') {
                // If Total changed manually, Recalc Gramasi
                updated.gramasi = portionCount > 0 ? parseFloat((value / portionCount).toFixed(6)) : 0;
            }

            return updated;
        }));
    };

    const removeIngredient = (tempId: number) => {
        setIngredients(ingredients.filter(i => i.tempId !== tempId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (ingredients.some(i => !i.name.trim())) {
            toast.error('Nama bahan tidak boleh kosong');
            return;
        }

        setLoading(true);

        const payload = {
            name,
            description,
            menuDate: menuToEdit ? new Date(menuToEdit.menuDate) : date,
            portionCount,
            ingredients: ingredients.map(i => ({
                name: i.name.trim(),
                qty: i.qty,
                gramasi: i.gramasi,
                unit: i.unit.trim()
            }))
        };

        let res;
        if (menuToEdit) {
            res = await updateMenu(menuToEdit.id, payload);
        } else {
            res = await createMenu(payload);
        }

        setLoading(false);

        if (res.success) {
            toast.success(menuToEdit ? 'Jadwal berhasil diperbarui' : 'Jadwal berhasil dibuat');
            onOpenChange(false);
            if (!menuToEdit) {
                setName('');
                setDescription('');
                setIngredients([]);
            }
            onSuccess();
        } else {
            toast.error(res.error || 'Gagal menyimpan jadwal');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>{menuToEdit ? 'Edit Jadwal Masak' : 'Buat Jadwal Masak'}</DialogTitle>
                        {!menuToEdit && (
                            <div className="flex gap-2 mr-6">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsHistoryOpen(true)}
                                    title="Ambil dari Riwayat Masak sebelumnya"
                                >
                                    <History className="w-4 h-4 mr-2" />
                                    Ambil dari Riwayat
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsRecipeOpen(true)}
                                    title="Ambil dari Kamus Resep Standar"
                                >
                                    <Calculator className="w-4 h-4 mr-2" />
                                    Ambil dari Kamus Resep
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-12 gap-4 bg-muted/30 p-4 rounded-lg">
                        <div className="col-span-4 space-y-2">
                            <Label>Tanggal Masak</Label>
                            <Input
                                value={(menuToEdit ? new Date(menuToEdit.menuDate) : date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                                disabled
                                className="bg-background text-muted-foreground"
                            />
                        </div>
                        <div className="col-span-5 space-y-2">
                            <Label>Nama Masakan</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Contoh: Ayam Goreng Mentega"
                                required
                                className="bg-background font-medium"
                            />
                        </div>
                        <div className="col-span-3 space-y-2">
                            <Label className="text-primary font-bold">Jumlah Porsi (Pax)</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    min="1"
                                    value={portionCount}
                                    onChange={(e) => setPortionCount(parseInt(e.target.value) || 0)}
                                    className="bg-background font-bold text-lg text-primary text-center"
                                />
                                <div className="absolute right-3 top-2 text-xs text-muted-foreground font-normal">
                                    Pax
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Catatan Masak (Opsional)</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Catatan cara masak atau variasi..."
                            className="h-20"
                        />
                    </div>

                    <div className="space-y-2 border rounded-md p-4">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="font-semibold text-lg">Komposisi Bahan</Label>
                            <Button type="button" size="sm" variant="outline" onClick={addEmptyRow}>
                                <Plus className="h-4 w-4 mr-2" />
                                Tambah Bahan Manual
                            </Button>
                        </div>

                        <div className="space-y-2 mt-2">
                            <div className="grid grid-cols-12 gap-2 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                <div className="col-span-5">Nama Bahan</div>
                                <div className="col-span-3 text-center bg-blue-50/50 rounded text-blue-700">Gramasi / Porsi</div>
                                <div className="col-span-3 text-center bg-green-50/50 rounded text-green-700">Total Kebutuhan</div>
                                <div className="col-span-1"></div>
                            </div>

                            {ingredients.map((item) => (
                                <div key={item.tempId} className="grid grid-cols-12 gap-2 items-center p-2 bg-card rounded-md border shadow-sm hover:shadow-md transition-all">
                                    <div className="col-span-5">
                                        <Input
                                            value={item.name}
                                            onChange={(e) => updateIngredient(item.tempId, 'name', e.target.value)}
                                            placeholder="Nama Bahan"
                                            required
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="col-span-3 flex items-center gap-1">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.001"
                                            value={item.gramasi || ''}
                                            onChange={(e) => updateIngredient(item.tempId, 'gramasi', parseFloat(e.target.value) || 0)}
                                            className="text-right h-9 font-mono text-blue-700 bg-blue-50/30"
                                            placeholder="0"
                                        />
                                        <span className="text-xs text-muted-foreground w-8 truncate" title={item.unit}>{item.unit}</span>
                                    </div>
                                    <div className="col-span-3 flex items-center gap-1">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.001"
                                            value={item.qty || ''}
                                            onChange={(e) => updateIngredient(item.tempId, 'qty', parseFloat(e.target.value) || 0)}
                                            required
                                            className="text-right h-9 font-bold font-mono text-green-700 bg-green-50/30"
                                        />
                                        <Input
                                            value={item.unit}
                                            onChange={(e) => updateIngredient(item.tempId, 'unit', e.target.value)}
                                            className="w-12 h-9 text-xs"
                                            placeholder="Unit"
                                        />
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeIngredient(item.tempId)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {ingredients.length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-12 border-2 border-dashed rounded-md bg-muted/20">
                                    <div className="max-w-xs mx-auto text-center space-y-2">
                                        <p>Belum ada bahan.</p>
                                        <p>Silakan klik tombol <b>"Ambil dari Kamus Resep"</b> di atas untuk memuat bahan standar.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading} className="min-w-[150px]">
                            {loading ? 'Menyimpan...' : (menuToEdit ? 'Simpan Perubahan' : 'Simpan Jadwal')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>

            <RecipeSelectionDialog
                open={isRecipeOpen}
                onOpenChange={setIsRecipeOpen}
                onSelect={handleSelectRecipe}
            />

            <HistorySelectionDialog
                open={isHistoryOpen}
                onOpenChange={setIsHistoryOpen}
                onSelect={handleSelectHistory}
            />
        </Dialog>
    );
}
