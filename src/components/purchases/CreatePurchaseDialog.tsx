'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Plus, ShoppingCart, Search, Camera, X, Trash2, Ban, Upload, AlertCircle, MessageSquare, ClipboardList } from 'lucide-react';
import { CameraCapturePurchase } from '@/components/shared/CameraCapturePurchase';
import { createPurchase } from '@/app/actions/purchases';
import { searchIngredients } from '@/app/actions/menus'; // Reusing search
import { toast } from 'sonner';
import { AlertConfirm } from '@/components/shared/AlertConfirm';
import { cn, formatRecipeQty, denormalizeQty } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CreatePurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    initialItems?: any[];
}

export function CreatePurchaseDialog({ open, onOpenChange, onSuccess, initialItems }: CreatePurchaseDialogProps) {
    const [note, setNote] = useState('');
    const [date, setDate] = useState<string>(() => {
        // Use local date instead of UTC to fix "yesterday" bug
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    });
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedItems, setSelectedItems] = useState<{
        id: string; // ingredientId
        name: string;
        qty: number | string;
        targetQty?: number; // Added: Original request from Ahli Gizi
        unit: string;
        currentStock?: number;
        menuType?: string;
        originalQty?: number;
        originalUnit?: string;
        memo?: string;
        photoUrl?: string;
        tempId: string;
    }[]>([]);
    const [purchaseType, setPurchaseType] = useState<'FOOD' | 'OPERATIONAL'>('FOOD');
    const [showDeficitConfirm, setShowDeficitConfirm] = useState(false);

    // Operational Modal States
    const [showOperationalModal, setShowOperationalModal] = useState(false);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    // Tracks the order in which requests were added (req.id → display number)
    const [addedRequestOrdering, setAddedRequestOrdering] = useState<string[]>([]);

    // Manual Operational Entry States
    const [manualOpName, setManualOpName] = useState('');
    const [manualOpQty, setManualOpQty] = useState<number | ''>('');
    const [manualOpUnit, setManualOpUnit] = useState('pcs');

    useEffect(() => {
        if (open && initialItems && initialItems.length > 0) {
            setPurchaseType('FOOD'); // Assuming initial items implies FOOD deficit
            setSelectedItems(initialItems.map(item => ({
                ...item,
                tempId: crypto.randomUUID(),
                memo: '' // Explicitly empty for new purchase
            })));
        } else if (open) {
            setSelectedItems([]);
            setSelectedRequestIds([]);
            setNote('');
            const d = new Date();
            const offset = d.getTimezoneOffset() * 60000;
            setDate(new Date(d.getTime() - offset).toISOString().split('T')[0]);
        }
    }, [open, initialItems]);

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length > 1) {
            const results = await searchIngredients(term, purchaseType === 'OPERATIONAL' ? 'OPERASIONAL' : undefined);

            // Strictly filter on frontend as well to ensure categories don't mix
            const filteredResults = purchaseType === 'FOOD'
                ? results.filter((r: any) => r.category !== 'OPERASIONAL')
                : results.filter((r: any) => r.category === 'OPERASIONAL');

            if (purchaseType === 'OPERATIONAL' && term.length >= 2) {
                const exactMatch = filteredResults.find(r => r.name.toLowerCase() === term.toLowerCase());
                if (!exactMatch) {
                    filteredResults.unshift({
                        id: 'NEW',
                        name: term,
                        unit: 'pcs',
                        category: 'OPERASIONAL',
                        isNew: true
                    } as any);
                }
            }

            setSearchResults(filteredResults);
        } else {
            setSearchResults([]);
        }
    };

    const debouncedSearch = useCallback(
        debounce((term: string) => handleSearch(term), 300),
        []
    );

    function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout;
        return function (this: ThisParameterType<T>, ...args: Parameters<T>): void {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    const addItem = (ing: any) => {
        // Inherit targetQty if another item of the same ingredient already has it
        const existingWithTarget = selectedItems.find(i => i.id === ing.id && i.targetQty !== undefined);
        const targetQty = existingWithTarget?.targetQty;

        const formated = formatRecipeQty(1, ing.unit);

        setSelectedItems([...selectedItems, {
            ...ing,
            tempId: crypto.randomUUID(),
            qty: 1, // Default 1 for manual addition
            targetQty,
            originalUnit: ing.unit,
            memo: note
        }]);
        setSearchTerm('');
        setSearchResults([]);
    };

    const removeItem = (tempId: string) => {
        setSelectedItems(selectedItems.filter(i => i.tempId !== tempId));
    };


    const updateQty = (tempId: string, value: number | string) => {
        setSelectedItems(prev => prev.map(i => {
            if (i.tempId === tempId) {
                return { ...i, qty: value };
            }
            return i;
        }));
    };
    const updatePhoto = (tempId: string, photoUrl: string) => {
        setSelectedItems(selectedItems.map(i => i.tempId === tempId ? { ...i, photoUrl } : i));
    };



    const removePhoto = (tempId: string) => {
        setSelectedItems(selectedItems.map(i => i.tempId === tempId ? { ...i, photoUrl: undefined } : i));
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (selectedItems.length === 0) {
            toast.error('Pilih minimal satu barang');
            return;
        }


        // Check for deficits if not already confirmed
        if (!showDeficitConfirm) {
            const hasDeficits = selectedItems.some(item => {
                const totalTarget = getTotalTargetQty(item.id);
                if (totalTarget === 0) return false;
                const totalOfIng = getTotalQty(item.id);
                return totalOfIng < totalTarget;
            });

            if (hasDeficits) {
                setShowDeficitConfirm(true);
                return;
            }
        }

        executeSubmit();
    };

    const executeSubmit = async () => {
        setLoading(true);

        const res = await createPurchase({
            purchaseDate: new Date(date),
            note,
            purchaseType,
            fulfilledRequestIds: selectedRequestIds,
            items: selectedItems.map(i => {
                // Determine if we need to scale back down based on human unit vs db unit
                // (e.g. Kg -> Gram if original was Gram). For simplicity, we submit the scaled unit 
                // but since the seed has a normalized form, we should probably submit what the user inputted 
                // along with the unit *they* see.

                // However, the action expects `qty` to match `ingredientId`. We handle the simple
                // case by submitting `i.qty` and checking deficit directly in standard units is safer.
                // Wait! In fact, the purchase `qty` in db is just a number. The unit is tied to the ingredient.
                // It is CRITICAL we convert it back to the BASE UNIT before saving!

                // De-scale logic using utility to ensure consistency
                const qValue = typeof i.qty === 'string' ? parseFloat(i.qty) : i.qty;
                const finalQty = isNaN(qValue) ? 0 : denormalizeQty(qValue, i.unit, i.originalUnit || i.unit);

                let finalTarget = i.targetQty;
                if (finalTarget && i.originalUnit) {
                    finalTarget = denormalizeQty(finalTarget, i.unit, i.originalUnit);
                }

                return {
                    ingredientId: i.id,
                    name: i.name,
                    qty: finalQty,
                    targetQty: finalTarget,
                    photoUrl: i.photoUrl,
                    // Strip UUID memos (req.id used for UI grouping) — don't save them directly as store names
                    // Instead, prefix them to preserve the request metadata for grouping later.
                    memo: (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i.memo || ''))
                        ? `[REQ:${i.memo}] ${note || ''}`.trim()
                        : (i.memo || note)
                }
            })
        });

        setLoading(false);

        if (res.success) {
            toast.success('Pembelian berhasil dibuat');
            onOpenChange(false);
            setNote('');
            setSelectedItems([]);
            // Reset dates if needed, but keeping Today is fine
            onSuccess();
        } else {
            toast.error(res.error || 'Gagal membuat pembelian');
        }
    };

    const getTotalQty = (ingredientId: string) => {
        return selectedItems
            .filter(i => i.id === ingredientId)
            .reduce((sum, i) => sum + (typeof i.qty === 'string' ? parseFloat(i.qty) || 0 : i.qty), 0);
    };

    const getTotalTargetQty = (ingredientId: string) => {
        return selectedItems
            .filter(i => i.id === ingredientId && i.targetQty !== undefined)
            .reduce((sum, i) => sum + (i.targetQty || 0), 0);
    };

    const getTargetQty = (ingredientId: string) => {
        // Items from checklist will have targetQty. We only need to find one item of this ingredient that has it.
        const item = selectedItems.find(i => i.id === ingredientId && i.targetQty !== undefined);
        return item?.targetQty;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle>{initialItems && initialItems.length > 0 ? 'Lengkapi Sisa Belanja' : 'Catat Pembelian Baru'}</DialogTitle>
                    <DialogDescription>
                        {initialItems && initialItems.length > 0
                            ? 'Anda sedang melengkapi kekurangan barang dari sesi belanja sebelumnya.'
                            : 'Catat detail belanja untuk menambah stok inventaris.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 mt-2">
                    <Tabs value={purchaseType} onValueChange={(val: any) => {
                        setPurchaseType(val);
                        setSelectedItems([]); // Reset items when switching modes
                        setSelectedRequestIds([]); // Reset selected requests to prevent accidental deletion
                        setSearchTerm('');
                        setSearchResults([]);
                    }} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="FOOD" disabled={initialItems && initialItems.length > 0}>📝 Bahan Makanan</TabsTrigger>
                            <TabsTrigger value="OPERATIONAL" disabled={initialItems && initialItems.length > 0}>📋 Barang Operasional</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {initialItems && initialItems.length > 0 && (
                    <div className="mx-6 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-3">
                        <ShoppingCart className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-yellow-800 uppercase">Mode Pemenuhan Belanja</p>
                            <p className="text-xs text-yellow-700">Barang yang kurang dari target sebelumnya telah ditambahkan otomatis di bawah.</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6 scrollbar-thin">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Tanggal Pencatatan (Hari Ini)</Label>
                                <div className="flex gap-2">
                                    <Input value={date} disabled className="bg-muted text-muted-foreground flex-1" />
                                    {purchaseType === 'FOOD' && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={async () => {
                                                setLoading(true);
                                                try {
                                                    const { getMenuIngredientsForDate } = await import('@/app/actions/menus');
                                                    const items = await getMenuIngredientsForDate(new Date(date));

                                                    if (items.length === 0) {
                                                        toast.warning('Tidak ada menu/bahan pada tanggal ini');
                                                    } else {
                                                        const newItems = [...selectedItems];
                                                        items.forEach((item: any) => {
                                                            const formatted = formatRecipeQty(item.qty, item.unit);
                                                            newItems.push({
                                                                ...item,
                                                                tempId: crypto.randomUUID(),
                                                                qty: formatted.value,
                                                                targetQty: formatted.value, // Set target to to formatted qty
                                                                unit: formatted.unit,       // Keep the human readable unit for display
                                                                originalQty: item.qty,      // Store raw for submission if needed, but the form uses the scaled one
                                                                originalUnit: item.unit,
                                                                memo: note
                                                            });
                                                        });
                                                        setSelectedItems(newItems);
                                                        toast.success(`Berhasil mengambil ${items.length} bahan dari menu`);
                                                    }
                                                } catch (e) {
                                                    toast.error('Gagal mengambil data menu');
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                        >
                                            <ShoppingCart className="mr-2 h-4 w-4" />
                                            Ambil Checklist
                                        </Button>
                                    )}
                                    {purchaseType === 'OPERATIONAL' && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={async () => {
                                                setLoadingRequests(true);
                                                try {
                                                    const { getPendingOperationalRequests } = await import('@/app/actions/purchases');
                                                    const reqs = await getPendingOperationalRequests();
                                                    setPendingRequests(reqs);
                                                    setShowOperationalModal(true);
                                                } catch (e) {
                                                    toast.error('Gagal mengambil request operasional');
                                                } finally {
                                                    setLoadingRequests(false);
                                                }
                                            }}
                                        >
                                            <ShoppingCart className="mr-2 h-4 w-4" />
                                            Ambil Checklist ASLAP
                                        </Button>
                                    )}
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    {purchaseType === 'FOOD' ? 'Klik "Ambil Checklist" untuk mengambil daftar belanja dari menu hari ini.' : 'Pilih request dari ASLAP atau ketik barang operasional secara manual di bawah.'}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-semibold text-sm">Nama Toko Utama / Global (Wajib)</Label>
                                <div className="flex gap-2">
                                    <Textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Tulis nama toko utama di sini..."
                                        className="resize-none h-[80px] flex-1"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator className="my-2" />

                        <div className="space-y-2">
                            <Label className="font-bold flex items-center">
                                <Plus className="mr-2 h-4 w-4" />
                                {purchaseType === 'FOOD' ? 'Daftar Barang Belanja (Cari Data Bahan Makanan)' : 'Tambah Barang Operasional Manual'}
                            </Label>

                            {purchaseType === 'FOOD' ? (
                                <>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Cari bahan makanan dan tambahkan di sini..."
                                            className="pl-9"
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                debouncedSearch(e.target.value);
                                            }}
                                        />
                                    </div>
                                    {searchResults.length > 0 && (
                                        <div className="absolute z-10 w-[calc(100%-3rem)] mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
                                            {searchResults.map((result: any) => (
                                                <button
                                                    key={result.id + result.name} // just in case
                                                    type="button"
                                                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                                                    onClick={() => addItem(result)}
                                                >
                                                    <div className={cn("font-medium", result.isNew && "text-primary/90")}>{result.isNew ? `+ Tambah Baru: ${result.name}` : result.name}</div>
                                                    {!result.isNew && <div className="text-xs text-muted-foreground">Unit: {result.unit}</div>}
                                                    {result.isNew && <div className="text-xs text-muted-foreground">Akan ditambahkan sebagai barang operasional baru</div>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-muted/20 p-3 border rounded-lg">
                                    <div className="flex-1 w-full space-y-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Nama Barang Operasional</Label>
                                        <Input
                                            placeholder="Contoh: Sabun Cuci Piring"
                                            value={manualOpName}
                                            onChange={(e) => setManualOpName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    document.getElementById('manualOpQtyInput')?.focus();
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="w-24 shrink-0 space-y-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Jml</Label>
                                        <Input
                                            id="manualOpQtyInput"
                                            type="number"
                                            min="0"
                                            placeholder="1"
                                            value={manualOpQty}
                                            onChange={(e) => setManualOpQty(e.target.value ? Number(e.target.value) : '')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    document.getElementById('manualOpUnitInput')?.focus();
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="w-24 shrink-0 space-y-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Satuan</Label>
                                        <Input
                                            id="manualOpUnitInput"
                                            placeholder="pcs"
                                            value={manualOpUnit}
                                            onChange={(e) => setManualOpUnit(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    document.getElementById('addManualOpBtn')?.click();
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="pt-5">
                                        <Button
                                            id="addManualOpBtn"
                                            type="button"
                                            variant="secondary"
                                            disabled={!manualOpName.trim()}
                                            onClick={() => {
                                                if (!manualOpName.trim()) return;
                                                const unitToUse = manualOpUnit.trim() || 'pcs';
                                                setSelectedItems([...selectedItems, {
                                                    id: 'NEW',
                                                    name: manualOpName.trim(),
                                                    qty: manualOpQty === '' ? 1 : manualOpQty,
                                                    unit: unitToUse,
                                                    originalUnit: unitToUse,
                                                    menuType: 'OPERATIONAL',
                                                    tempId: crypto.randomUUID(),
                                                    memo: note
                                                }]);
                                                setManualOpName('');
                                                setManualOpQty('');
                                                setManualOpUnit('pcs');
                                                document.getElementById('manualOpName')?.focus();
                                            }}
                                        >
                                            Tambah
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Selected Items List */}
                        <div className="space-y-6 mt-4">
                            {(() => {
                                const mealItems = selectedItems.filter(item => item.menuType !== 'KERING');
                                const snackItems = selectedItems.filter(item => item.menuType === 'KERING');

                                const renderItemCard = (item: any) => {
                                    const qValue = typeof item.qty === 'string' ? parseFloat(item.qty) : item.qty;
                                    return (
                                        <div key={item.tempId} className={cn(
                                            "p-3 rounded-lg border shadow-sm transition-all bg-card hover:border-primary/30",
                                            qValue === 0 && item.targetQty !== 0 ? "bg-destructive/5 border-destructive/20" : (item.targetQty === 0 && qValue === 0 ? "bg-amber-50/50 border-amber-200" : "")
                                        )}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0 mr-4">
                                                    <span className={cn(
                                                        "font-bold text-sm truncate block",
                                                        (typeof item.qty === 'string' ? parseFloat(item.qty) : item.qty) === 0 && item.targetQty !== 0 && "text-muted-foreground line-through decoration-destructive"
                                                    )}>{item.name}</span>
                                                    {(typeof item.qty === 'string' ? parseFloat(item.qty) : item.qty) === 0 && item.targetQty !== 0 && <span className="text-[10px] text-destructive font-bold uppercase py-0.5 px-1 bg-destructive/10 rounded">Stok Habis / Kosong</span>}
                                                    {(typeof item.qty === 'string' ? parseFloat(item.qty) : item.qty) === 0 && item.targetQty === 0 && <span className="text-[10px] text-amber-700 font-bold uppercase py-0.5 px-1 bg-amber-100 rounded">Isi Manual</span>}

                                                    {item.targetQty !== undefined && (
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px]">
                                                            {item.targetQty === 0 ? (
                                                                <span className="text-amber-600 font-medium">🎯 Target: Secukupnya</span>
                                                            ) : (
                                                                <span className="text-primary font-medium">🎯 Target: {formatRecipeQty(item.targetQty, item.unit).stringValue} {formatRecipeQty(item.targetQty, item.unit).unit}</span>
                                                            )}

                                                            {item.currentStock !== undefined && (
                                                                <span className="text-blue-600 font-medium whitespace-nowrap">📦 Stok: {formatRecipeQty(item.currentStock, item.unit).stringValue} {formatRecipeQty(item.currentStock, item.unit).unit}</span>
                                                            )}

                                                            {getTotalQty(item.id) < getTotalTargetQty(item.id) && (
                                                                <span className="text-red-500 font-bold flex items-center gap-1 whitespace-nowrap">
                                                                    <AlertCircle className="h-3 w-3" />
                                                                    Kurang: {formatRecipeQty(getTotalTargetQty(item.id) - getTotalQty(item.id), item.unit).stringValue} {formatRecipeQty(getTotalTargetQty(item.id) - getTotalQty(item.id), item.unit).unit}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {item.targetQty === undefined && item.currentStock !== undefined && (
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px]">
                                                            <span className="text-blue-600 font-medium whitespace-nowrap">📦 Stok: {formatRecipeQty(item.currentStock, item.unit).stringValue} {formatRecipeQty(item.currentStock, item.unit).unit}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center space-x-2">
                                                            <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Qty</Label>
                                                            <div className="flex items-center space-x-1">
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    step="any"
                                                                    value={Number.isNaN(item.qty) ? '' : item.qty}
                                                                    onChange={(e) => updateQty(item.tempId, e.target.value)}
                                                                    className={cn(
                                                                        "h-8 w-28 text-right text-xs bg-background border-primary/20",
                                                                        qValue === 0 && item.targetQty !== 0 ? "text-destructive font-bold border-destructive bg-destructive/10" : (qValue === 0 && item.targetQty === 0 ? "text-amber-700 font-bold border-amber-300 bg-amber-100/50" : "")
                                                                    )}
                                                                />
                                                                <span className="text-[10px] text-muted-foreground font-medium w-6">{item.unit}</span>
                                                            </div>
                                                            {item.qty && !isNaN(typeof item.qty === 'string' ? parseFloat(item.qty) : item.qty) ? (
                                                                <p className="text-[9px] text-blue-600/70 italic text-right pr-6 mt-0.5">
                                                                    ~ {formatRecipeQty(typeof item.qty === 'string' ? parseFloat(item.qty) : item.qty, item.unit).stringValue} {formatRecipeQty(typeof item.qty === 'string' ? parseFloat(item.qty) : item.qty, item.unit).unit}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <CameraCapturePurchase
                                                            onCapture={(photoUrl) => updatePhoto(item.tempId, photoUrl)}
                                                            currentImage={item.photoUrl}
                                                            onRemove={() => removePhoto(item.tempId)}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant={qValue === 0 && item.targetQty !== 0 ? "destructive" : "ghost"}
                                                            size="icon"
                                                            className={cn("h-7 w-7 transition-colors", qValue === 0 && item.targetQty !== 0 ? "" : "text-muted-foreground hover:text-destructive")}
                                                            onClick={() => updateQty(item.tempId, qValue === 0 ? 1 : 0)}
                                                            title={qValue === 0 && item.targetQty !== 0 ? "Batalkan status Habis" : "Tandai Stok Habis / Kosong"}
                                                        >
                                                            <Ban className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant={item.qty === 0 ? "destructive" : "ghost"}
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => removeItem(item.tempId)}
                                                            title="Hapus"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                };

                                return (
                                    <>
                                        {purchaseType === 'OPERATIONAL' ? (
                                            <>
                                                {(() => {
                                                    const grouped = mealItems.reduce((acc, item) => {
                                                        const memoStr = item.memo || '__MANUAL__';
                                                        if (!acc[memoStr]) acc[memoStr] = [];
                                                        acc[memoStr].push(item);
                                                        return acc;
                                                    }, {} as Record<string, typeof mealItems>);

                                                    let reqCounter = 0;
                                                    return Object.entries(grouped).map(([memoStr, items], idx) => {
                                                        // If memoStr is a request ID, look up its index in addedRequestOrdering
                                                        const reqOrderIndex = addedRequestOrdering.indexOf(memoStr);
                                                        const isManual = memoStr === '__MANUAL__' || memoStr === note || reqOrderIndex === -1;
                                                        if (!isManual) reqCounter++;
                                                        const displayNum = reqOrderIndex >= 0 ? reqOrderIndex + 1 : reqCounter;
                                                        const groupLabel = isManual
                                                            ? 'Barang Tambahan Manual'
                                                            : `Request #${displayNum} dari ASLAP`;

                                                        return (
                                                            <div key={idx} className={`space-y-3 p-4 rounded-xl border ${isManual ? 'bg-slate-50/50 border-slate-200' : 'bg-primary/5 border-primary/20'}`}>
                                                                <h3 className="font-bold text-sm flex flex-col gap-1.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <ClipboardList className={`h-4 w-4 ${isManual ? 'text-muted-foreground' : 'text-primary'}`} />
                                                                        <span className={isManual ? 'text-slate-700' : 'text-primary'}>{groupLabel}</span>
                                                                        <Badge variant={isManual ? 'secondary' : 'default'} className="ml-auto">{items.length} Item</Badge>
                                                                    </div>
                                                                </h3>
                                                                <div className="space-y-3">
                                                                    {items.map(renderItemCard)}
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </>
                                        ) : (
                                            <>
                                                {mealItems.length > 0 && (
                                                    <div className="space-y-3 bg-blue-50/30 p-4 rounded-xl border border-blue-100">
                                                        <h3 className="font-bold text-sm text-blue-800 flex items-center gap-2">
                                                            <ShoppingCart className="h-4 w-4" />
                                                            Kebutuhan Masakan / Ompreng
                                                            <Badge variant="outline" className="bg-white ml-2">{mealItems.length}</Badge>
                                                        </h3>
                                                        <div className="space-y-3">
                                                            {mealItems.map(renderItemCard)}
                                                        </div>
                                                    </div>
                                                )}

                                                {snackItems.length > 0 && (
                                                    <div className="space-y-3 bg-orange-50/30 p-4 rounded-xl border border-orange-100">
                                                        <h3 className="font-bold text-sm text-orange-800 flex items-center gap-2">
                                                            <ShoppingCart className="h-4 w-4" />
                                                            Kebutuhan Snack / Kering
                                                            <Badge variant="outline" className="bg-white ml-2">{snackItems.length}</Badge>
                                                        </h3>
                                                        <div className="space-y-3">
                                                            {snackItems.map(renderItemCard)}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {selectedItems.length === 0 && (
                                            <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground opacity-50 bg-muted/20 rounded-md border">
                                                <ShoppingCart className="h-8 w-8 mb-2" />
                                                <span className="text-sm">Silakan pilih menu atau cari secara manual</span>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 bg-muted/30 border-t">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" size="lg" className="px-8" disabled={loading || selectedItems.length === 0 || !note.trim()}>
                            {loading ? 'Menyimpan...' : 'Simpan Pembelian'}
                        </Button>
                    </DialogFooter>
                </form>

                <Dialog open={showOperationalModal} onOpenChange={setShowOperationalModal}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Pilih Request Barang Operasional dari ASLAP</DialogTitle>
                            <DialogDescription>
                                Pilih satu atau lebih request yang ingin dibelanjakan sekaligus.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
                            {loadingRequests ? (
                                <div className="text-center py-4 text-muted-foreground">Memuat data...</div>
                            ) : pendingRequests.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground border border-dashed rounded-lg bg-muted/20">Tidak ada request barang operasional yang menunggu dari ASLAP.</div>
                            ) : (
                                pendingRequests.map((req: any) => (
                                    <div
                                        key={req.id}
                                        className={cn("border p-4 rounded-lg flex gap-4 items-start transition-colors cursor-pointer", selectedRequestIds.includes(req.id) ? "border-primary bg-primary/5" : "hover:bg-accent/50")}
                                        onClick={() => {
                                            if (selectedRequestIds.includes(req.id)) {
                                                setSelectedRequestIds(selectedRequestIds.filter(id => id !== req.id));
                                            } else {
                                                setSelectedRequestIds([...selectedRequestIds, req.id]);
                                            }
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary pointer-events-none"
                                            checked={selectedRequestIds.includes(req.id)}
                                            readOnly
                                        />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold text-sm leading-tight">Request Operasional #{pendingRequests.indexOf(req) + 1}</span>
                                                    <span className="text-[10px] font-mono text-muted-foreground">ID: {req.id.slice(0, 8)}</span>
                                                </div>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{new Date(req.purchaseDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                            <div className="text-[11px] text-muted-foreground mt-1">Diajukan oleh: <span className="font-medium text-foreground/80">{req.creatorName}</span> • {req.totalItems} Barang</div>
                                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                {req.items.map((i: any) => (
                                                    <Badge variant="secondary" className="text-[10px]" key={i.id}>{i.ingredientName} ({i.estimatedQty} {i.ingredientUnit})</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setShowOperationalModal(false)}>Batal</Button>
                            <Button onClick={() => {
                                const selectedReqs = pendingRequests.filter(r => selectedRequestIds.includes(r.id));
                                const newItems = [...selectedItems];
                                selectedReqs.forEach(req => {
                                    req.items.forEach((item: any) => {
                                        // Avoid duplicate items if possible, or let them add as separate lines
                                        newItems.push({
                                            id: item.ingredientId, // ingredientId is properly loaded now
                                            name: item.ingredientName,
                                            qty: item.estimatedQty, // Keuangan decides final qty, default to estimated
                                            targetQty: item.estimatedQty, // This is the requested amount from ASLAP
                                            unit: item.ingredientUnit,
                                            originalUnit: item.ingredientUnit,
                                            menuType: 'OPERATIONAL',
                                            tempId: crypto.randomUUID(),
                                            memo: req.id  // Use req.id as memo key to ensure each request gets its own group
                                        });
                                    });
                                });
                                setSelectedItems(newItems);
                                // Track the order of added requests for group labeling
                                setAddedRequestOrdering(prev => {
                                    const newOrder = [...prev];
                                    selectedReqs.forEach(req => {
                                        if (!newOrder.includes(req.id)) newOrder.push(req.id);
                                    });
                                    return newOrder;
                                });
                                toast.success(`${selectedReqs.length} request ditambahkan ke daftar belanja`);
                                setShowOperationalModal(false);
                            }} disabled={selectedRequestIds.length === 0}>
                                Tambahkan ke Belanjaan ({selectedRequestIds.length})
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertConfirm
                    open={showDeficitConfirm}
                    onOpenChange={setShowDeficitConfirm}
                    title="Belanja Belum Lengkap"
                    description="Beberapa barang belum mencapai target Ahli Gizi. Pembelian akan berstatus 'Belum Lengkap' dan tidak akan muncul di Aslap sampai dilengkapi atau difinalisasi. Lanjutkan?"
                    confirmText="Lanjutkan"
                    variant="warning"
                    onConfirm={executeSubmit}
                />
            </DialogContent>
        </Dialog>
    );
}
