'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Plus, X, Search, ShoppingCart, Save, Ban, MessageSquare, Edit, Utensils, Package, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CameraCapturePurchase } from '@/components/shared/CameraCapturePurchase';
import { editPurchase } from '@/app/actions/purchases';
import { searchIngredients } from '@/app/actions/menus';
import { toast } from 'sonner';
import { cn, formatRecipeQty, denormalizeQty } from '@/lib/utils';

interface EditOperationalPurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchase: any;
    onSuccess: () => void;
    initialCompletionItems?: any[];
}

export function EditOperationalPurchaseDialog({ open, onOpenChange, purchase, onSuccess, initialCompletionItems }: EditOperationalPurchaseDialogProps) {
    const [note, setNote] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedItems, setSelectedItems] = useState<Array<any>>([]);
    const [requestOrder, setRequestOrder] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [tripMemo, setTripMemo] = useState('');

    useEffect(() => {
        if (purchase && open) {
            setNote(purchase.note || '');
            const order: string[] = [];

            const existingItems = purchase.items.map((i: any) => {
                let displayMemo = i.memo || '';
                let rUuid = undefined;
                const match = /\[REQ:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i.exec(displayMemo);
                if (match) {
                    rUuid = match[1];
                    displayMemo = displayMemo.replace(match[0], '').trim();
                } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(displayMemo)) {
                    rUuid = displayMemo;
                    displayMemo = '';
                }

                // If this is a raw ASLAP request, fallback to purchase id
                if (!rUuid && purchase.status === 'requested' && purchase.purchaseType === 'OPERATIONAL') {
                    rUuid = purchase.id;
                }

                if (rUuid && !order.includes(rUuid)) {
                    order.push(rUuid);
                }

                return {
                    tempId: crypto.randomUUID(),
                    id: i.ingredientId || i.id,
                    name: i.ingredientName || i.name,
                    unit: i.unit || i.ingredientUnit || 'PCS',
                    qty: i.estimatedQty || i.qty,
                    targetQty: i.targetQty,
                    originalQty: i.estimatedQty || i.qty,
                    originalUnit: i.unit || i.ingredientUnit || 'PCS',
                    memo: displayMemo,
                    reqUuid: rUuid,
                    photoUrl: i.photoUrl
                }
            });

            // If there are completion items, merge them
            let finalItems = [...existingItems];
            if (initialCompletionItems && initialCompletionItems.length > 0) {
                const defaultMemo = 'Toko Baru...';
                setTripMemo(defaultMemo);
                const completionMapped = initialCompletionItems.map(i => {
                    let rUuid = undefined;
                    const match = /\[REQ:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i.exec(i.originalMemo || '');
                    if (match) {
                        rUuid = match[1];
                    }

                    if (rUuid && !order.includes(rUuid)) {
                        order.push(rUuid);
                    }

                    return {
                        tempId: crypto.randomUUID(),
                        id: i.id,
                        name: i.name,
                        unit: i.unit || i.originalUnit,
                        qty: i.qty, // Remaining qty
                        targetQty: i.targetQty,
                        originalQty: i.qty,
                        originalUnit: i.unit || i.originalUnit,
                        memo: defaultMemo, // Set initial memo without UUID
                        photoUrl: undefined,
                        isNewTrip: true, // Flag to distinguish
                        reqUuid: rUuid // Keep reference
                    }
                });
                finalItems = [...finalItems, ...completionMapped];
            }

            setRequestOrder(order);
            setSelectedItems(finalItems);
        }
    }, [purchase, open, initialCompletionItems]);

    const updateTripMemo = (memo: string) => {
        setTripMemo(memo);
        setSelectedItems(items => items.map(i => {
            if (i.isNewTrip) {
                return { ...i, memo: memo }; // don't append REQ here, done at submit
            }
            return i;
        }));
    };

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length > 1) {
            const results = await searchIngredients(term);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };

    const addItem = (ing: any) => {
        // Inherit targetQty if another item of the same ingredient already has it
        const existingWithTarget = selectedItems.find(i => i.id === ing.id && i.targetQty !== undefined);
        const targetQty = existingWithTarget?.targetQty;

        const formatted = formatRecipeQty(1, ing.unit);

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

    const updateMemo = (tempId: string, memo: string) => {
        setSelectedItems(selectedItems.map(i => i.tempId === tempId ? { ...i, memo } : i));
    };

    const removePhoto = (tempId: string) => {
        setSelectedItems(selectedItems.map(i => i.tempId === tempId ? { ...i, photoUrl: undefined } : i));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const missingPhoto = selectedItems.find(item => !item.photoUrl);
        if (missingPhoto) {
            toast.error(`Wajib melampirkan foto bukti untuk barang: ${missingPhoto.name}`);
            return;
        }

        setLoading(true);

        const res = await editPurchase(purchase.id, {
            note,
            items: selectedItems.map(i => {
                const finalQty = typeof i.qty === 'string' ? parseFloat(i.qty) : i.qty;

                let finalMemo = i.memo || '';
                if (i.reqUuid) {
                    finalMemo = finalMemo ? `[REQ:${i.reqUuid}] ${finalMemo}` : `[REQ:${i.reqUuid}]`;
                }

                return {
                    ingredientId: i.id,
                    qty: isNaN(finalQty) ? 0 : finalQty,
                    targetQty: i.targetQty,
                    memo: finalMemo,
                    photoUrl: i.photoUrl
                }
            })
        });

        setLoading(false);

        if (res.success) {
            toast.success('Pembelian berhasil diperbarui');
            onOpenChange(false);
            onSuccess();
        } else {
            toast.error(res.error || 'Gagal memperbarui pembelian');
        }
    };

    const getTotalQty = (ingredientId: string) => {
        return selectedItems
            .filter(i => i.id === ingredientId)
            .reduce((sum, i) => sum + (typeof i.qty === 'string' ? parseFloat(i.qty) : i.qty), 0);
    };

    const getTargetQty = (ingredientId: string) => {
        const item = selectedItems.find(i => i.id === ingredientId && i.targetQty !== undefined);
        return item?.targetQty;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {initialCompletionItems ? <Plus className="h-5 w-5 text-primary" /> : <Edit className="h-5 w-5 text-primary" />}
                        {initialCompletionItems ? 'Lengkapi Belanjaan (Toko Baru)' : 'Update Realisasi Pembelian'}
                    </DialogTitle>
                    <DialogDescription>
                        {initialCompletionItems
                            ? 'Tambahkan daftar belanja baru untuk melengkapi item yang masih kurang.'
                            : 'Sesuaikan jumlah barang dengan yang sebenarnya dibeli.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Catatan Utama (Trip 1)</Label>
                            <div className="text-xs p-2 bg-muted/50 rounded border italic">
                                "{purchase?.note || '-'}"
                            </div>
                        </div>
                        {initialCompletionItems && (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-primary uppercase tracking-wider">Nama Toko / Catatan Baru</Label>
                                <Input
                                    value={tripMemo}
                                    onChange={(e) => updateTripMemo(e.target.value)}
                                    placeholder="Misal: Toko Sinar Jaya..."
                                    className="h-8 text-sm border-primary/50 focus-visible:ring-primary"
                                    required
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase tracking-wider">Daftar Barang Trip Ini</Label>
                    </div>

                    <div className="relative mb-2">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari barang pengganti/tambahan..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-8"
                        />
                        {searchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
                                {searchResults.map(result => (
                                    <button
                                        key={result.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                                        onClick={() => addItem(result)}
                                    >
                                        <div className="font-medium">{result.name}</div>
                                        <div className="text-xs text-muted-foreground">Unit: {result.unit}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-2">
                        {/* In completion mode: only show new trip items. Otherwise show all. */}
                        {(() => {
                            const visibleItems = selectedItems.filter(item => !initialCompletionItems || item.isNewTrip);
                            const masakItems = visibleItems.filter(i => i.menuType !== 'KERING');
                            const keringItems = visibleItems.filter(i => i.menuType === 'KERING');

                            const renderItem = (item: any) => (
                                <div key={item.tempId} className={cn(
                                    "flex flex-col p-3 rounded-lg border shadow-sm transition-all animate-in fade-in slide-in-from-top-2",
                                    (typeof item.qty === 'string' ? parseFloat(item.qty) : item.qty) === 0 ? "bg-destructive/5 border-destructive/20" : "bg-white",
                                    item.isNewTrip && "border-primary/30 ring-1 ring-primary/5"
                                )}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={cn(
                                                    "font-bold text-sm",
                                                    (typeof item.qty === 'string' ? parseFloat(item.qty) : item.qty) === 0 && "text-muted-foreground line-through decoration-destructive"
                                                )}>{item.name}</span>
                                                {item.isNewTrip && <Badge className="h-4 text-[9px] px-1 bg-primary/10 text-primary border-none">BARU</Badge>}
                                            </div>

                                            {item.targetQty !== undefined && (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-sm font-medium">
                                                        Target: {item.targetQty} {item.unit || 'PCS'}
                                                    </span>
                                                    {getTotalQty(item.id) < (item.targetQty || 0) && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-sm font-bold flex items-center gap-1 border border-yellow-200">
                                                            Kurang: {(item.targetQty || 0) - getTotalQty(item.id)}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col items-end gap-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Label className="text-[10px] uppercase text-muted-foreground">Qty</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        value={Number.isNaN(item.qty) ? '' : item.qty}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateQty(item.tempId, e.target.value)}
                                                        className={cn(
                                                            "h-8 w-28 text-right text-xs bg-background border-primary/20",
                                                            (typeof item.qty === 'string' ? parseFloat(item.qty) : item.qty) === 0 && "text-destructive font-bold border-destructive bg-destructive/10"
                                                        )}
                                                    />
                                                    <span className="text-[10px] text-muted-foreground w-12 font-medium uppercase px-1">{item.unit || 'PCS'}</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-1 border-l pl-3">
                                                <CameraCapturePurchase
                                                    onCapture={(photoUrl) => updatePhoto(item.tempId, photoUrl)}
                                                    currentImage={item.photoUrl}
                                                    onRemove={() => removePhoto(item.tempId)}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => removeItem(item.tempId)}
                                                    title="Hapus"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-dashed flex items-center gap-2">
                                        <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                        <Input
                                            value={item.memo || ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMemo(item.tempId, e.target.value)}
                                            placeholder="Nama toko atau catatan porsi..."
                                            className="h-7 text-[11px] bg-muted/30 border-none focus-visible:ring-1"
                                        />
                                    </div>
                                </div>
                            );

                            const grouped = visibleItems.reduce((acc, item) => {
                                const key = item.reqUuid || 'Manual';
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(item);
                                return acc;
                            }, {} as Record<string, typeof visibleItems>);

                            return (
                                <>
                                    {(Object.entries(grouped) as [string, any[]][]).map(([key, items], idx) => {
                                        let displayLabel = 'Barang Tambahan Manual';

                                        if (key !== 'Manual') {
                                            const reqIdx = requestOrder.indexOf(key);
                                            if (purchase.status === 'requested') {
                                                displayLabel = `Request Barang Operasional (ASLAP)`;
                                            } else {
                                                displayLabel = reqIdx !== -1 ? `Request #${reqIdx + 1} dari ASLAP` : 'Request dari ASLAP';
                                            }
                                        }

                                        return (
                                            <div key={idx} className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200 mb-4">
                                                <div className="flex items-center gap-2 pb-1 border-b">
                                                    <ClipboardList className="h-3.5 w-3.5 text-primary" />
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                                        {displayLabel}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground ml-auto">{items.length} item</span>
                                                </div>
                                                {items.map(renderItem)}
                                            </div>
                                        );
                                    })}
                                    {visibleItems.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full py-4 text-muted-foreground opacity-50">
                                            <ShoppingCart className="h-8 w-8 mb-2" />
                                            <span className="text-sm">List Kosong (Barang Habis Semua?)</span>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        * Jika barang tidak ada, klik icon sampah untuk menghapus dari list pembelian.
                    </p>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
