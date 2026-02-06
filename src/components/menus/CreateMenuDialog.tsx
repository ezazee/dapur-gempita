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
import { Plus, X } from 'lucide-react';
import { createMenu, updateMenu } from '@/app/actions/menus';
import { toast } from 'sonner';

interface CreateMenuDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    date: Date;
    onSuccess: () => void;
    menuToEdit?: any | null;
}

export function CreateMenuDialog({ open, onOpenChange, date, onSuccess, menuToEdit }: CreateMenuDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [ingredients, setIngredients] = useState<{ tempId: number, name: string; qty: number; unit: string }[]>([]);
    const [loading, setLoading] = useState(false);

    // Populate form if editing
    useEffect(() => {
        if (open) {
            if (menuToEdit) {
                // EDIT MODE
                setName(menuToEdit.name);
                setDescription(menuToEdit.description || '');
                setIngredients(menuToEdit.ingredients.map((ing: any) => ({
                    tempId: Math.random(),
                    name: ing.name,
                    qty: ing.qtyNeeded,
                    unit: ing.unit
                })));
            } else {
                // CREATE MODE
                setName('');
                setDescription('');
                setIngredients([]);
            }
        }
    }, [open, menuToEdit]);

    const addEmptyRow = () => {
        setIngredients([...ingredients, { tempId: Date.now(), name: '', qty: 1, unit: 'kg' }]);
    };

    const updateIngredient = (tempId: number, field: keyof typeof ingredients[0], value: any) => {
        setIngredients(ingredients.map(i => i.tempId === tempId ? { ...i, [field]: value } : i));
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
            ingredients: ingredients.map(i => ({
                name: i.name.trim(),
                qty: i.qty,
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
            toast.success(menuToEdit ? 'Menu berhasil diperbarui' : 'Menu berhasil dibuat');
            onOpenChange(false);
            if (!menuToEdit) {
                setName('');
                setDescription('');
                setIngredients([]);
            }
            onSuccess();
        } else {
            toast.error(res.error || (menuToEdit ? 'Gagal memperbarui menu' : 'Gagal membuat menu'));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{menuToEdit ? 'Edit Menu' : 'Buat Menu Baru'}</DialogTitle>
                    <DialogDescription>
                        {menuToEdit ? 'Perbarui detail menu dan bahan.' : `Tambahkan menu untuk tanggal ${date.toLocaleDateString()}.`}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tanggal Menu</Label>
                            <Input
                                value={(menuToEdit ? new Date(menuToEdit.menuDate) : date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                                disabled
                                className="bg-muted text-muted-foreground"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nama Menu</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Contoh: Ayam Goreng Mentega"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Deskripsi (Opsional)</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Catatan cara masak atau variasi..."
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Komposisi Bahan</Label>
                            <Button type="button" size="sm" variant="outline" onClick={addEmptyRow}>
                                <Plus className="h-4 w-4 mr-2" />
                                Tambah Bahan
                            </Button>
                        </div>

                        <div className="space-y-2 mt-2">
                            {ingredients.map((item) => (
                                <div key={item.tempId} className="flex items-end gap-2 p-3 bg-secondary/20 rounded-md border">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-xs text-muted-foreground">Nama Bahan</Label>
                                        <Input
                                            value={item.name}
                                            onChange={(e) => updateIngredient(item.tempId, 'name', e.target.value)}
                                            placeholder="Contoh: Ayam"
                                            required
                                        />
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <Label className="text-xs text-muted-foreground">Jumlah</Label>
                                        <Input
                                            type="number"
                                            min="0.1"
                                            step="0.1"
                                            value={item.qty}
                                            onChange={(e) => updateIngredient(item.tempId, 'qty', parseFloat(e.target.value))}
                                            required
                                        />
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <Label className="text-xs text-muted-foreground">Satuan</Label>
                                        <Input
                                            value={item.unit}
                                            onChange={(e) => updateIngredient(item.tempId, 'unit', e.target.value)}
                                            placeholder="kg, ltr"
                                            required
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 text-destructive hover:bg-destructive/10 mb-[1px]"
                                        onClick={() => removeIngredient(item.tempId)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {ingredients.length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">
                                    Belum ada bahan. Klik "Tambah Bahan" untuk mulai.
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Menyimpan...' : (menuToEdit ? 'Simpan Perubahan' : 'Simpan Menu')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
