'use client';

import { useState } from 'react';
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
import { createRecipe } from '@/app/actions/recipes';
import { toast } from 'sonner';

interface CreateRecipeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CreateRecipeDialog({ open, onOpenChange, onSuccess }: CreateRecipeDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [portionSize, setPortionSize] = useState(1);

    // Nutrition states
    const [calories, setCalories] = useState<number | ''>('');
    const [carbs, setCarbs] = useState<number | ''>('');
    const [protein, setProtein] = useState<number | ''>('');
    const [fat, setFat] = useState<number | ''>('');

    const [ingredients, setIngredients] = useState<{ tempId: number, name: string; qty: number; unit: string }[]>([]);
    const [loading, setLoading] = useState(false);

    const addEmptyRow = () => {
        setIngredients([...ingredients, { tempId: Date.now(), name: '', qty: 0.1, unit: 'kg' }]);
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
            portionSize,
            calories: calories === '' ? undefined : calories,
            carbs: carbs === '' ? undefined : carbs,
            protein: protein === '' ? undefined : protein,
            fat: fat === '' ? undefined : fat,
            ingredients: ingredients.map(i => ({
                name: i.name.trim(),
                qty: i.qty,
                unit: i.unit.trim()
            }))
        };

        const res = await createRecipe(payload);
        setLoading(false);

        if (res.success) {
            toast.success('Resep berhasil dibuat');
            onOpenChange(false);
            setName('');
            setDescription('');
            setPortionSize(1);
            setCalories('');
            setCarbs('');
            setProtein('');
            setFat('');
            setIngredients([]);
            onSuccess();
        } else {
            toast.error(res.error || 'Gagal membuat resep');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Buat Resep Baru</DialogTitle>
                    <DialogDescription>
                        Tentukan bahan dan gramasi untuk <b>1 Porsi</b> (atau sesuai porsi dasar).
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nama Resep</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Ayam Goreng Mentega"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Porsi Dasar (Pax)</Label>
                            <Input
                                type="number"
                                min="1"
                                value={portionSize}
                                onChange={(e) => setPortionSize(parseInt(e.target.value) || 1)}
                                placeholder="1"
                                required
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Biasanya 1 porsi. Gramasi bahan di bawah ini adalah untuk jumlah porsi ini.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2 border p-3 rounded-md bg-secondary/5">
                        <Label className="text-sm font-semibold">Informasi Gizi (per <span className="text-primary">{portionSize} pax</span>)</Label>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Total Kalori (kcal)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={calories}
                                    onChange={(e) => setCalories(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    placeholder="Contoh: 350"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Karbohidrat (g)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={carbs}
                                    onChange={(e) => setCarbs(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    placeholder="Contoh: 45"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Protein (g)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={protein}
                                    onChange={(e) => setProtein(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    placeholder="Contoh: 20"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Lemak (g)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={fat}
                                    onChange={(e) => setFat(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    placeholder="Contoh: 10"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Deskripsi / Cara Masak</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Instruksi masak..."
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
                                            placeholder="Bahan"
                                            required
                                        />
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <Label className="text-xs text-muted-foreground">Qty / Porsi</Label>
                                        <Input
                                            type="number"
                                            min="0.0001"
                                            step="0.0001"
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
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Menyimpan...' : 'Simpan Resep'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
