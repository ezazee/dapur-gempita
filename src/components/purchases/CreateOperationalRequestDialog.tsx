'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createOperationalRequest, updateOperationalRequest } from '@/app/actions/operational-requests';
import { IngredientCombobox } from '@/components/shared/IngredientCombobox';

interface CreateOperationalRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    initialData?: any;
}

export function CreateOperationalRequestDialog({
    open,
    onOpenChange,
    onSuccess,
    initialData
}: CreateOperationalRequestDialogProps) {
    const [loading, setLoading] = useState(false);
    const [note, setNote] = useState('');
    const [items, setItems] = useState<{
        tempId: number;
        ingredientId?: string;
        name: string;
        qty: number | '';
        unit: string;
        currentStock?: number;
    }[]>([
        { tempId: Date.now(), name: '', qty: '', unit: 'pcs', currentStock: 0 }
    ]);

    const isEditMode = !!initialData;



    // Better yet, just use a setup effect
    useEffect(() => {
        if (open) {
            if (initialData) {
                setNote(initialData.note || '');
                if (initialData.items && initialData.items.length > 0) {
                    setItems(initialData.items.map((item: any, idx: number) => ({
                        tempId: Date.now() + idx,
                        ingredientId: item.ingredientId, // Note: the DTO returns ingredientName, we need to map this properly or rely on the name
                        name: item.ingredientName || item.name,
                        qty: item.estimatedQty || item.qty,
                        unit: item.ingredientUnit || item.unit,
                        currentStock: 0
                    })));
                }
            } else {
                resetForm();
            }
        }
    }, [open, initialData]);


    const addItem = () => {
        setItems([...items, { tempId: Date.now(), name: '', qty: '', unit: 'pcs', currentStock: 0 }]);
    };

    const removeItem = (tempId: number) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.tempId !== tempId));
        }
    };

    const updateItem = (tempId: number, updates: Partial<typeof items[0]>) => {
        setItems(prev => prev.map(item => item.tempId === tempId ? { ...item, ...updates } : item));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (items.some(item => !item.name.trim() || !item.qty || !item.unit.trim())) {
            toast.error('Mohon isi semua field item request');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                note,
                items: items.map(item => ({
                    ingredientId: item.ingredientId,
                    name: item.name,
                    qty: Number(item.qty),
                    unit: item.unit
                }))
            };

            let res;
            if (isEditMode) {
                res = await updateOperationalRequest(initialData.id, payload);
            } else {
                res = await createOperationalRequest(payload);
            }

            if (res.success) {
                toast.success(isEditMode ? 'Request berhasil diperbarui' : 'Request barang operasional berhasil diajukan');
                resetForm();
                onSuccess();
                onOpenChange(false);
            } else {
                toast.error(res.error || 'Gagal menyimpan request');
            }
        } catch (error) {
            toast.error('Terjadi kesalahan sistem');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setNote('');
        setItems([{ tempId: Date.now(), name: '', qty: '', unit: 'pcs', currentStock: 0 }]);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Pengajuan Barang Operasional' : 'Pengajuan Barang Operasional'}</DialogTitle>
                    <DialogDescription>
                        Isi daftar barang yang dibutuhkan untuk operasional dapur.
                    </DialogDescription>
                </DialogHeader>


                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Daftar Barang</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addItem}
                                className="h-8"
                            >
                                <Plus className="h-4 w-4 mr-2" /> Tambah Baris
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={item.tempId} className="flex flex-col md:flex-row gap-3 p-3 bg-secondary/10 rounded-lg border border-secondary/20 relative group">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nama Barang</Label>
                                        <IngredientCombobox
                                            value={item.name}
                                            category="OPERASIONAL"
                                            onSelectIngredient={(ing) => {
                                                updateItem(item.tempId, {
                                                    name: ing.name,
                                                    ingredientId: ing.id === 'NEW' ? undefined : ing.id,
                                                    unit: ing.unit,
                                                    currentStock: ing.currentStock || 0
                                                });
                                            }}
                                            placeholder="Cari atau ketik barang baru..."
                                        />
                                    </div>
                                    <div className="w-full md:w-24 space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Jumlah</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.qty}
                                            onChange={(e) => updateItem(item.tempId, { qty: e.target.value === '' ? '' : Number(e.target.value) })}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="w-full md:w-24 space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground text-blue-600">Sisa Stok</Label>
                                        <div className="relative">
                                            <Input
                                                value={item.currentStock || 0}
                                                readOnly
                                                className="bg-blue-50/50 border-blue-200 text-blue-700 font-bold pr-10"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-blue-400 font-medium">
                                                {item.unit}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full md:w-24 space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Satuan</Label>
                                        <Input
                                            value={item.unit}
                                            onChange={(e) => updateItem(item.tempId, { unit: e.target.value })}
                                            placeholder="pcs"
                                            readOnly={!!item.ingredientId}
                                            className={item.ingredientId ? "bg-muted cursor-not-allowed" : ""}
                                        />
                                    </div>

                                    {items.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive md:mt-6 shrink-0"
                                            onClick={() => removeItem(item.tempId)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t sticky bottom-0 bg-background z-10">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</>
                            ) : (
                                <><Send className="h-4 w-4 mr-2" /> {isEditMode ? 'Simpan Perubahan' : 'Ajukan ke Keuangan'}</>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
