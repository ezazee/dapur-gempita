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
import { Plus, X, AlertTriangle, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { createRecipe, updateRecipe } from '@/app/actions/recipes';
import { toast } from 'sonner';
import { IngredientCombobox } from '@/components/shared/IngredientCombobox';
import { formatRecipeQty, cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CreateRecipeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    recipeToEdit?: any;
}

export function CreateRecipeDialog({ open, onOpenChange, onSuccess, recipeToEdit }: CreateRecipeDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [portionSize, setPortionSize] = useState<number | string>(1);

    // Nutrition states
    const [calories, setCalories] = useState<number | ''>('');
    const [carbs, setCarbs] = useState<number | ''>('');
    const [protein, setProtein] = useState<number | ''>('');
    const [fat, setFat] = useState<number | ''>('');

    const [ingredients, setIngredients] = useState<{
        tempId: number,
        name: string;
        qtyBesar: number | '';
        qtyKecil: number | '';
        qtyBumil: number | '';
        qtyBalita: number | '';
        unit: string;
        isSecukupnya: boolean;
    }[]>([]);
    const [loading, setLoading] = useState(false);

    // Initialize for edit
    useState(() => {
        if (recipeToEdit && open) {
            setName(recipeToEdit.name);
            setDescription(recipeToEdit.description || '');
            setPortionSize(recipeToEdit.portionSize);
            setCalories(recipeToEdit.calories || '');
            setCarbs(recipeToEdit.carbs || '');
            setProtein(recipeToEdit.protein || '');
            setFat(recipeToEdit.fat || '');
            setIngredients(recipeToEdit.ingredients.map((ing: any) => ({
                tempId: Math.random(),
                name: ing.name,
                isSecukupnya: Number(ing.qtyBesar) === 0,
                qtyBesar: Number(parseFloat(String(ing.qtyBesar)).toFixed(4)),
                qtyKecil: ing.qtyKecil ? Number(parseFloat(String(ing.qtyKecil)).toFixed(4)) : '',
                qtyBumil: ing.qtyBumil ? Number(parseFloat(String(ing.qtyBumil)).toFixed(4)) : '',
                qtyBalita: ing.qtyBalita ? Number(parseFloat(String(ing.qtyBalita)).toFixed(4)) : '',
                unit: ing.unit
            })));
        }
    });

    // Reset on close or change recipeToEdit
    useEffect(() => {
        if (open) {
            if (recipeToEdit) {
                setName(recipeToEdit.name);
                setDescription(recipeToEdit.description || '');
                setPortionSize(recipeToEdit.portionSize);
                setCalories(recipeToEdit.calories || '');
                setCarbs(recipeToEdit.carbs || '');
                setProtein(recipeToEdit.protein || '');
                setFat(recipeToEdit.fat || '');
                setIngredients(recipeToEdit.ingredients.map((ing: any) => ({
                    tempId: Math.random(),
                    name: ing.name,
                    isSecukupnya: Number(ing.qtyBesar) === 0,
                    qtyBesar: Number(parseFloat(String(ing.qtyBesar)).toFixed(4)),
                    qtyKecil: ing.qtyKecil ? Number(parseFloat(String(ing.qtyKecil)).toFixed(4)) : '',
                    qtyBumil: ing.qtyBumil ? Number(parseFloat(String(ing.qtyBumil)).toFixed(4)) : '',
                    qtyBalita: ing.qtyBalita ? Number(parseFloat(String(ing.qtyBalita)).toFixed(4)) : '',
                    unit: ing.unit
                })));
            } else {
                setName('');
                setDescription('');
                setPortionSize(1);
                setCalories('');
                setCarbs('');
                setProtein('');
                setFat('');
                setIngredients([]);
            }
        }
    }, [open, recipeToEdit]);

    const addEmptyRow = () => {
        setIngredients([...ingredients, {
            tempId: Date.now(),
            name: '',
            isSecukupnya: false,
            qtyBesar: 0.1,
            qtyKecil: '',
            qtyBumil: '',
            qtyBalita: '',
            unit: 'kg'
        }]);
    };

    const updateIngredient = (tempId: number, field: keyof typeof ingredients[0], value: any) => {
        setIngredients(prev => prev.map(i => i.tempId === tempId ? { ...i, [field]: value } : i));
    };

    const updateIngredientMultiple = (tempId: number, updates: Partial<typeof ingredients[0]>) => {
        setIngredients(prev => prev.map(i => i.tempId === tempId ? { ...i, ...updates } : i));
    };

    const removeIngredient = (tempId: number) => {
        setIngredients(ingredients.filter(i => i.tempId !== tempId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (ingredients.length === 0) {
            toast.error('Tambahkan setidaknya satu bahan');
            return;
        }

        if (ingredients.some(i => !i.name.trim())) {
            toast.error('Nama bahan tidak boleh kosong');
            return;
        }

        const invalidQty = ingredients.find(i => !i.isSecukupnya && (!i.qtyBesar || Number(i.qtyBesar) <= 0));
        if (invalidQty) {
            toast.error(`Jumlah bahan "${invalidQty.name || 'baru'}" tidak boleh kosong atau 0`);
            return;
        }

        setLoading(true);

        const p = typeof portionSize === 'string' ? parseFloat(portionSize) : portionSize;
        const payload = {
            name,
            description,
            portionSize: isNaN(p) ? 1 : p,
            calories: calories === '' ? undefined : calories,
            carbs: carbs === '' ? undefined : carbs,
            protein: protein === '' ? undefined : protein,
            fat: fat === '' ? undefined : fat,
            ingredients: ingredients.map(i => ({
                name: i.name.trim(),
                qtyBesar: i.isSecukupnya ? 0 : (Number(i.qtyBesar) || 0),
                qtyKecil: i.isSecukupnya ? undefined : (i.qtyKecil === '' ? undefined : Number(i.qtyKecil)),
                qtyBumil: i.isSecukupnya ? undefined : (i.qtyBumil === '' ? undefined : Number(i.qtyBumil)),
                qtyBalita: i.isSecukupnya ? undefined : (i.qtyBalita === '' ? undefined : Number(i.qtyBalita)),
                unit: i.unit.trim()
            }))
        };

        const res = recipeToEdit
            ? await updateRecipe(recipeToEdit.id, payload)
            : await createRecipe(payload);

        setLoading(false);

        if (res.success) {
            toast.success(recipeToEdit ? 'Resep berhasil diperbarui' : 'Resep berhasil dibuat');
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
                    <DialogTitle>{recipeToEdit ? 'Edit Resep Standard' : 'Buat Resep Baru'}</DialogTitle>
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
                                onChange={(e) => setPortionSize(e.target.value === '' ? '' : (parseInt(e.target.value) || 1))}
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

                        <div className="space-y-4 mt-2">
                            {ingredients.map((item) => (
                                <div key={item.tempId} className="space-y-3 p-4 bg-secondary/10 rounded-lg border border-secondary/20 relative">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive absolute top-2 right-2"
                                        onClick={() => removeIngredient(item.tempId)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>

                                    <div className="grid grid-cols-12 gap-3 items-end">
                                        <div className="col-span-12 lg:col-span-6 space-y-1">
                                            <Label className="text-xs font-semibold">Nama Bahan</Label>
                                            <IngredientCombobox
                                                value={item.name}
                                                onSelectIngredient={(ing) => {
                                                    updateIngredientMultiple(item.tempId, {
                                                        name: ing.name,
                                                        unit: ing.unit
                                                    });
                                                }}
                                            />
                                        </div>
                                        <div className="col-span-6 lg:col-span-6 py-2 px-3 bg-muted/30 rounded-md text-sm font-medium border border-dashed flex items-center gap-2">
                                            <span className="text-muted-foreground">Satuan:</span>
                                            <span className="text-primary">{item.unit || '-'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2 border-t border-dashed mt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                "h-7 text-[10px] font-bold uppercase transition-all",
                                                item.isSecukupnya 
                                                    ? "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200" 
                                                    : "hover:bg-amber-50"
                                            )}
                                            onClick={() => {
                                                const newState = !item.isSecukupnya;
                                                updateIngredientMultiple(item.tempId, {
                                                    isSecukupnya: newState,
                                                    qtyBesar: newState ? 0 : 0.1,
                                                    qtyKecil: newState ? 0 : '',
                                                    qtyBumil: newState ? 0 : '',
                                                    qtyBalita: newState ? 0 : ''
                                                });
                                            }}
                                        >
                                            {item.isSecukupnya ? '⚡ Secukupnya Aktif' : 'Atur Secukupnya'}
                                        </Button>

                                        {item.isSecukupnya && (
                                            <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                                                <Info className="h-3 w-3" />
                                                Takaran akan ditentukan oleh Pembeli/ASLAP
                                            </span>
                                        )}
                                    </div>

                                    {item.isSecukupnya && (
                                        <Alert className="mt-2 py-2 bg-amber-50/50 border-amber-200">
                                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                                            <AlertTitle className="text-xs font-bold text-amber-800 mb-0">Perhatian Gizi</AlertTitle>
                                            <AlertDescription className="text-[10px] text-amber-700 leading-tight">
                                                Bahan ini ditandai <b>Secukupnya</b>. Gramasi porsi (Besar, Kecil, dll) tidak dihitung dalam database. Pastikan Chef/Aslap tahu takaran standar di lapangan.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="grid grid-cols-4 gap-3 pt-2">
                                        {item.isSecukupnya ? (
                                            <div className="col-span-4 flex items-center gap-2 py-2 px-3 bg-amber-50 border border-amber-200 rounded-md">
                                                <span className="text-xs font-bold text-amber-700">⚡ Secukupnya</span>
                                                <span className="text-[10px] text-amber-600">— qty otomatis 0, tidak perlu diisi</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-bold text-primary">Besar (Base)</Label>
                                                    <Input
                                                        type="number"
                                                        min="0.0001"
                                                        step="0.0001"
                                                        value={item.qtyBesar}
                                                        onChange={(e) => updateIngredient(item.tempId, 'qtyBesar', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                        required
                                                        className="h-8 text-sm font-bold border-primary/30"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-bold text-blue-600">Kecil</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.0001"
                                                        value={item.qtyKecil}
                                                        onChange={(e) => updateIngredient(item.tempId, 'qtyKecil', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-bold text-pink-600">Bumil / Busui</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.0001"
                                                        value={item.qtyBumil}
                                                        onChange={(e) => updateIngredient(item.tempId, 'qtyBumil', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-bold text-orange-600">Balita</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.0001"
                                                        value={item.qtyBalita}
                                                        onChange={(e) => updateIngredient(item.tempId, 'qtyBalita', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
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
