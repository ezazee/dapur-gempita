'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CameraCapturePurchase } from '@/components/shared/CameraCapturePurchase';
import { createReceipt } from '@/app/actions/receipts';
import { toast } from 'sonner';
import { formatRecipeQty, denormalizeQty, cn } from '@/lib/utils';
import { ShoppingBag } from 'lucide-react';

// Units that are counted (not weighed)
const COUNT_UNITS = new Set(['bungkus', 'kotak', 'pcs', 'buah', 'porsi', 'butir', 'sachet', 'kaleng', 'botol', 'pak', 'lusin']);
const isCountUnit = (unit: string) => COUNT_UNITS.has((unit || '').toLowerCase());

interface ValidateReceiptDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchase: any;
    onSuccess: () => void;
}

export function ValidateReceiptDialog({ open, onOpenChange, purchase, onSuccess }: ValidateReceiptDialogProps) {
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    // Aggregate items by ingredientId only — 1 row per ingredient regardless of how many stores
    const mergedItems: {
        ingredientId: string;
        ingredientName: string;
        unit: string;
        menuType: string;
        targetQty: number;
        totalEstimatedQty: number;
        stores: { store: string; qty: number }[];
        uniqueKey: string;
    }[] = purchase
            ? Object.values(
                purchase.items.reduce((acc: Record<string, any>, item: any) => {
                    const id = item.ingredientId;
                    if (!acc[id]) {
                        acc[id] = {
                            ingredientId: id,
                            ingredientName: item.ingredientName,
                            unit: item.unit,
                            menuType: item.menuType,
                            targetQty: 0,
                            totalEstimatedQty: 0,
                            stores: [],
                            uniqueKey: id,
                        };
                    }
                    // Take the max targetQty across all items for this ingredient
                    if ((item.targetQty || 0) > acc[id].targetQty) {
                        acc[id].targetQty = Number(item.targetQty);
                    }
                    acc[id].totalEstimatedQty += Number(item.estimatedQty || 0);

                    // Determine the display store name
                    let cleanMemo = item.memo || '';
                    const match = /\[REQ:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i.exec(cleanMemo);
                    if (match) {
                        cleanMemo = cleanMemo.replace(match[0], '').trim();
                    }

                    const isAslapMemo = (m: string) => {
                        const up = m.toUpperCase();
                        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m);
                        return isUuid || up.includes('REQUEST') || up.includes('ASLAP') || up.includes('PERMINTAAN') || up.includes('MEMO');
                    };
                    const storeName = cleanMemo && !isAslapMemo(cleanMemo)
                        ? cleanMemo
                        : (purchase.note || 'Toko Utama');

                    acc[id].stores.push({ store: storeName, qty: Number(item.estimatedQty || 0) });
                    return acc;
                }, {})
            )
            : [];

    // Build state for each unique ingredient
    const [items, setItems] = useState<{
        ingredientId: string;
        grossWeight: number | string;
        netWeight: number | string;
        qtyReceived: number | string;
        photoUrl?: string;
        note?: string;
        displayUnit: string;
    }[]>([]);

    // Reset items when purchase changes
    useEffect(() => {
        if (purchase) {
            const initialItems = mergedItems.map((i) => {
                const isOp = i.menuType === 'OPERATIONAL';
                const isCount = isOp || isCountUnit(i.unit);

                let displayUnit;
                if (isOp) {
                    displayUnit = i.unit || 'PCS';
                } else {
                    const fmt = formatRecipeQty(i.totalEstimatedQty, i.unit);
                    displayUnit = fmt.unit;
                }

                const defaultQty = isOp
                    ? i.totalEstimatedQty
                    : formatRecipeQty(i.totalEstimatedQty, i.unit).value;

                return {
                    ingredientId: i.ingredientId,
                    grossWeight: isCount ? 0 : defaultQty,
                    netWeight: isCount ? 0 : defaultQty,
                    qtyReceived: isCount ? defaultQty : 0,
                    photoUrl: undefined,
                    note: '',
                    displayUnit,
                };
            });
            setItems(initialItems);
            setNote('');
        }
    }, [purchase?.id]);

    const updateItem = (ingredientId: string, field: 'grossWeight' | 'netWeight' | 'qtyReceived' | 'note', value: number | string) => {
        setItems(prev => prev.map(item => {
            if (item.ingredientId === ingredientId) {
                const newItem = { ...item, [field]: value };
                // Auto-sync netWeight if user only updates grossWeight and netWeight was initially the same or empty
                if (field === 'grossWeight') {
                    const gVal = typeof value === 'string' ? parseFloat(value) : value;
                    if (!isNaN(gVal)) {
                        const currentNet = typeof item.netWeight === 'string' ? parseFloat(item.netWeight) : item.netWeight;
                        // If netWeight is 0, empty or matches old grossWeight, sync it
                        if (!currentNet || currentNet === 0 || currentNet === item.grossWeight) {
                            newItem.netWeight = value;
                        }
                    }
                }
                return newItem;
            }
            return item;
        }));
    };

    const updatePhoto = (ingredientId: string, photoUrl: string) => {
        setItems(prev => prev.map(item => item.ingredientId === ingredientId ? { ...item, photoUrl } : item));
    };

    const removePhoto = (ingredientId: string) => {
        setItems(prev => prev.map(item => item.ingredientId === ingredientId ? { ...item, photoUrl: undefined } : item));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();



        // Check if any non-count items have 0 netWeight but non-zero grossWeight
        const hasSuspiciousItems = items.some(item => {
            const mItem = mergedItems.find(m => m.ingredientId === item.ingredientId);
            if (!mItem) return false;
            const isOp = mItem.menuType === 'OPERATIONAL';
            const isCount = isOp || isCountUnit(mItem.unit);
            if (isCount) return false;

            const g = typeof item.grossWeight === 'string' ? parseFloat(item.grossWeight) : item.grossWeight;
            const n = typeof item.netWeight === 'string' ? parseFloat(item.netWeight) : item.netWeight;
            return (g > 0 && (!n || n === 0));
        });

        if (hasSuspiciousItems) {
            const confirm = window.confirm('Ada item dengan "Berat Bersih" nol (0). Yakin ingin melanjutkan? Ini akan menyebabkan stok Chef tetap kosong.');
            if (!confirm) {
                setLoading(false);
                return;
            }
        }

        setLoading(true);

        const res = await createReceipt({
            purchaseId: purchase.id,
            note,
            items: items.map(item => {
                const mItem = mergedItems.find(m => m.ingredientId === item.ingredientId)!;
                const isOp = mItem.menuType === 'OPERATIONAL';
                const isCount = isOp || isCountUnit(mItem.unit);

                if (isCount) {
                    const qVal = typeof item.qtyReceived === 'string' ? parseFloat(item.qtyReceived) : (item.qtyReceived ?? 0);
                    const normalized = isNaN(qVal) ? 0 : (isOp ? qVal : denormalizeQty(qVal, item.displayUnit, mItem.unit));
                    return {
                        ingredientId: item.ingredientId,
                        grossWeight: normalized,
                        netWeight: normalized,
                        photoUrl: item.photoUrl,
                        note: item.note,
                    };
                }

                const gValue = typeof item.grossWeight === 'string' ? parseFloat(item.grossWeight) : item.grossWeight;
                const nValue = typeof item.netWeight === 'string' ? parseFloat(item.netWeight) : item.netWeight;
                return {
                    ingredientId: item.ingredientId,
                    grossWeight: isNaN(gValue as number) ? 0 : denormalizeQty(gValue as number, item.displayUnit, mItem.unit),
                    netWeight: isNaN(nValue as number) ? 0 : denormalizeQty(nValue as number, item.displayUnit, mItem.unit),
                    photoUrl: item.photoUrl,
                    note: item.note,
                };
            }),
        });

        setLoading(false);

        if (res.success) {
            toast.success('Penerimaan berhasil dikonfirmasi');
            onOpenChange(false);
            onSuccess();
        } else {
            toast.error(res.error || 'Gagal memproses penerimaan');
        }
    };

    if (!purchase) return null;

    // Collect all real stores for the header
    const isAslapMemo = (m: string) => {
        const up = (m || '').toUpperCase();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m || '');
        return isUuid || up.includes('REQUEST') || up.includes('ASLAP') || up.includes('PERMINTAAN') || up.includes('MEMO');
    };
    const mainStore = (purchase.note || '').trim();
    const extraStores = new Set<string>();
    purchase.items.forEach((item: any) => {
        let cleanMemo = (item.memo || '').trim();
        const match = /\[REQ:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i.exec(cleanMemo);
        if (match) {
            cleanMemo = cleanMemo.replace(match[0], '').trim();
        }

        if (cleanMemo && !isAslapMemo(cleanMemo) && cleanMemo.toLowerCase() !== mainStore.toLowerCase()) {
            extraStores.add(cleanMemo);
        }
    });
    const allStores = [
        ...(mainStore ? [{ label: 'Toko Utama', name: mainStore }] : []),
        ...Array.from(extraStores).map((s, i) => ({ label: `Toko ${i + 2}`, name: s })),
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-3 border-b">
                    <DialogTitle className="text-xl">Konfirmasi Penerimaan Barang</DialogTitle>
                    {/* Info bar */}
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{purchase.id.slice(0, 8)}</span>
                        <Badge variant="outline" className="text-[10px]">{purchase.purchaseType}</Badge>
                        <span>oleh <span className="font-semibold text-foreground">{purchase.creatorName}</span></span>
                    </div>
                    {/* Stores */}
                    {allStores.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {allStores.map((s, idx) => (
                                <div key={idx} className={cn(
                                    "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium",
                                    idx === 0 ? "bg-primary/5 border-primary/20 text-primary" : "bg-muted/40 border-border text-muted-foreground"
                                )}>
                                    <ShoppingBag className="h-3 w-3" />
                                    <span className="text-[9px] font-bold uppercase">{s.label}:</span>
                                    <span>{s.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Items Table */}
                        <div className="border rounded-xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-muted/40">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-xs font-semibold w-[30%]">Nama Barang</TableHead>
                                        <TableHead className="text-center text-xs font-semibold w-[15%]">Target</TableHead>
                                        <TableHead className="text-center text-xs font-semibold w-[15%]">Est. Dipesan</TableHead>
                                        <TableHead className="text-center text-xs font-semibold w-[30%]">Jumlah Diterima</TableHead>
                                        <TableHead className="text-center text-xs font-semibold w-[10%]">Foto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mergedItems.map((mItem) => {
                                        const current = items.find(i => i.ingredientId === mItem.ingredientId);
                                        const isOp = mItem.menuType === 'OPERATIONAL';
                                        const isCount = isOp || isCountUnit(mItem.unit);
                                        const isSecukupnya = mItem.targetQty === 0;
                                        const boughtFromMultipleStores = mItem.stores.length > 1;

                                        const targetFmt = isOp
                                            ? { stringValue: String(mItem.targetQty), unit: mItem.unit || 'PCS' }
                                            : formatRecipeQty(mItem.targetQty, mItem.unit);
                                        const estFmt = isOp
                                            ? { stringValue: String(mItem.totalEstimatedQty), unit: mItem.unit || 'PCS' }
                                            : formatRecipeQty(mItem.totalEstimatedQty, mItem.unit);

                                        return (
                                            <TableRow key={mItem.ingredientId} className="hover:bg-muted/10 align-top">
                                                {/* Nama Barang */}
                                                <TableCell className="py-3">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="font-semibold text-sm text-foreground">{mItem.ingredientName}</span>
                                                        <span className="text-[9px] text-muted-foreground uppercase font-bold">
                                                            {isOp ? 'Operasional' : mItem.menuType === 'KERING' ? 'Kering' : 'Masak'}
                                                        </span>
                                                        {/* Store breakdown if multi-store */}
                                                        {boughtFromMultipleStores && (
                                                            <div className="ml-1 flex flex-col gap-0.5 border-l-2 border-slate-200 pl-2">
                                                                {mItem.stores.map((s, sIdx) => {
                                                                    const sFmt = isOp
                                                                        ? { stringValue: String(s.qty), unit: mItem.unit }
                                                                        : formatRecipeQty(s.qty, mItem.unit);
                                                                    return (
                                                                        <div key={sIdx} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                            <ShoppingBag className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                                                            <span className="font-semibold text-foreground">{sFmt.stringValue} {sFmt.unit}</span>
                                                                            <span>— {s.store}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                        <div className="mt-2 text-muted-foreground w-full">
                                                            <Input
                                                                type="text"
                                                                placeholder="Catatan (Opsional)"
                                                                className="h-7 text-xs border-primary/20 bg-muted/20"
                                                                value={current?.note || ''}
                                                                onChange={(e) => updateItem(mItem.ingredientId, 'note', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Target */}
                                                <TableCell className="text-center py-3">
                                                    {mItem.targetQty > 0 ? (
                                                        <span className="text-xs font-bold text-primary">
                                                            {targetFmt.stringValue} <span className="text-[10px] font-normal text-muted-foreground">{targetFmt.unit}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-bold">Secukupnya</span>
                                                    )}
                                                </TableCell>

                                                {/* Est. Dipesan */}
                                                <TableCell className="text-center py-3">
                                                    <span className="text-xs text-muted-foreground font-medium">
                                                        {estFmt.stringValue} <span className="text-[10px]">{estFmt.unit}</span>
                                                    </span>
                                                </TableCell>

                                                {/* Jumlah Diterima */}
                                                <TableCell className="text-center py-3">
                                                    {isCount ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="flex items-center justify-center gap-1.5 border border-primary/20 rounded-md p-1 bg-white focus-within:ring-1 focus-within:ring-primary">
                                                                <Input
                                                                    type="number"
                                                                    step="any"
                                                                    value={current?.qtyReceived ?? ''}
                                                                    onChange={(e) => updateItem(mItem.ingredientId, 'qtyReceived', e.target.value)}
                                                                    required={!isSecukupnya}
                                                                    className="h-7 w-20 text-center font-mono text-xs border-none shadow-none focus-visible:ring-0 px-1"
                                                                    placeholder="0"
                                                                />
                                                                <span className="text-[10px] text-primary font-semibold w-10 text-left">{current?.displayUnit || mItem.unit || 'PCS'}</span>
                                                            </div>
                                                            <p className="text-[8px] text-primary/60 italic">{isSecukupnya ? 'Opsional' : 'Jumlah yang diterima'}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 justify-center">
                                                            <div className="space-y-1">
                                                                <Label className="text-[9px] text-muted-foreground">Berat Kotor</Label>
                                                                <div className="flex items-center gap-1 border border-primary/20 rounded bg-white focus-within:ring-1 focus-within:ring-primary">
                                                                    <Input type="number" step="any" value={current?.grossWeight ?? ''} onChange={(e) => updateItem(mItem.ingredientId, 'grossWeight', e.target.value)} required={!isSecukupnya} className="h-7 w-16 text-center font-mono text-[11px] border-none shadow-none focus-visible:ring-0 px-1" placeholder="0" />
                                                                    <span className="text-[9px] text-muted-foreground pr-2 font-medium">{current?.displayUnit || mItem.unit}</span>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[9px] text-muted-foreground">Berat Bersih</Label>
                                                                <div className="flex items-center gap-1 border border-green-300 rounded bg-green-50/30 focus-within:ring-1 focus-within:ring-green-400">
                                                                    <Input type="number" step="any" value={current?.netWeight ?? ''} onChange={(e) => updateItem(mItem.ingredientId, 'netWeight', e.target.value)} required={!isSecukupnya} className="h-7 w-16 text-center font-mono text-[11px] border-none shadow-none focus-visible:ring-0 px-1 text-green-700 bg-transparent" placeholder="0" />
                                                                    <span className="text-[9px] text-green-700 pr-2 font-medium">{current?.displayUnit || mItem.unit}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </TableCell>

                                                {/* Foto */}
                                                <TableCell className="text-center py-3">
                                                    <CameraCapturePurchase
                                                        onCapture={(photoUrl) => updatePhoto(mItem.ingredientId, photoUrl)}
                                                        currentImage={current?.photoUrl}
                                                        onRemove={() => removePhoto(mItem.ingredientId)}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Catatan */}
                        <div className="space-y-2">
                            <Label>Catatan Penerimaan (Opsional)</Label>
                            <Textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Contoh: Barang lengkap, kualitas bagus."
                                rows={2}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Menyimpan...' : 'Konfirmasi Penerimaan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
