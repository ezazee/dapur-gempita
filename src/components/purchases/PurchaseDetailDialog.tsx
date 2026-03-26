'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Eye, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, AlertCircle, ShoppingCart, Info, Check, Calendar, Package, FileText, Edit, History, ClipboardList } from 'lucide-react';
import { EditPurchaseDialog } from './EditPurchaseDialog';
import { useAuth } from '@/hooks/useAuth';
import { finalizePurchase, getPurchaseLogs } from '@/app/actions/purchases';
import { toast } from 'sonner';
import { AlertConfirm } from '@/components/shared/AlertConfirm';
import { ShoppingBag } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatRecipeQty, normalizeQty, getConversionFactor, formatMemo, parseMemo } from '@/lib/utils';

interface PurchaseDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchase: any;
    onRefresh?: () => void;
    onLengkapi?: (items: any[]) => void;
}

export function PurchaseDetailDialog({ open, onOpenChange, purchase, onRefresh, onLengkapi }: PurchaseDetailDialogProps) {
    const { role } = useAuth();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);
    const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
    const [currentCompletionItems, setCurrentCompletionItems] = useState<any[] | undefined>(undefined);

    useEffect(() => {
        if (open && purchase) {
            getPurchaseLogs(purchase.id).then(setLogs);
        }
    }, [open, purchase]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'waiting':
                return <Badge variant="secondary" className="text-blue-600 border-blue-300 bg-blue-50"><Clock className="w-3 h-3 mr-1" /> Menunggu</Badge>;
            case 'approved':
                return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Diterima</Badge>;
            case 'rejected':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Ditolak</Badge>;
            case 'incomplete':
                return <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50"><AlertCircle className="w-3 h-3 mr-1" /> Belum Lengkap</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const handleFinalize = async () => {
        try {
            const result = await finalizePurchase(purchase.id);
            if (result.success) {
                toast.success('Berhasil mengirim daftar belanja ke Aslap');
                onRefresh?.();
                onOpenChange(false);
            } else {
                toast.error(result.error || 'Gagal finalisasi');
            }
        } catch (error) {
            toast.error('Gagal finalisasi');
        }
    };

    if (!purchase) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* ... Content ... */}
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    {/* ... Header ... */}
                    <div className="flex items-center justify-between mr-8">
                        <DialogTitle className="text-xl">Detail Pembelian</DialogTitle>
                        <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {(() => {
                                try {
                                    return format(new Date(purchase.purchaseDate || purchase.date), 'dd MMMM yyyy', { locale: id });
                                } catch (e) {
                                    return 'Tanggal tidak valid';
                                }
                            })()}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Dibuat oleh: <span className="font-medium text-foreground">{purchase.creatorName}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Status & Note Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                                <ShoppingCart className="h-4 w-4" /> Status
                            </h4>
                            <div className="text-sm">
                                {getStatusBadge(purchase.status)}
                            </div>
                        </div>

                        {purchase.purchaseType === 'OPERATIONAL' ? (
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                                    <ClipboardList className="h-4 w-4" /> Tempat Belanja
                                </h4>
                                <div className="flex flex-col gap-2">
                                    {(() => {
                                        const stores = Array.from(new Set(purchase.items.map((i: any) => parseMemo(i.memo).storeName))) as string[];
                                        return stores.map((store, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-rose-100 rounded-xl shadow-sm">
                                                <div className="w-8 h-8 rounded-full bg-rose-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">{idx === 0 ? 'TOKO UTAMA' : `TOKO ${idx + 1}`}</span>
                                                    <span className="text-sm font-bold text-rose-900">{store}</span>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        ) : (
                            /* Show Global Note AND/OR Trip Notes for FOOD */
                            (() => {
                                const groupMap = new Map<string, any[]>();
                                purchase.items.forEach((item: any) => {
                                    const memoRaw = item.memo || 'Lainnya';
                                    const memo = formatMemo(memoRaw);
                                    if (!groupMap.has(memo)) {
                                        groupMap.set(memo, []);
                                    }
                                    groupMap.get(memo)!.push(item);
                                });

                                const trips = Array.from(groupMap.entries()).map(([memo, items]) => ({ memo, items }));

                                const globalNote = formatMemo(purchase.note);
                                const notesFromItems = trips.map(t => t.memo).filter(m => m !== 'Lainnya');
                                const combinedNotes = globalNote ? [globalNote, ...notesFromItems] : notesFromItems;
                                const displayNotes = Array.from(new Set(combinedNotes)) as string[];

                                return displayNotes.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                                            <Info className="h-4 w-4" /> Catatan / Toko
                                        </h4>
                                        <div className="flex flex-col gap-1.5">
                                            {displayNotes.map((n, idx) => (
                                                <div key={idx} className="text-xs text-muted-foreground bg-secondary/20 p-2 rounded-md border italic relative pl-7">
                                                    <div className="absolute left-2 top-2 w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold border border-primary/20 not-italic">
                                                        {idx + 1}
                                                    </div>
                                                    "{n}"
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()
                        )}
                    </div>

                    {/* Deficit Alert & Actions */}
                    {(() => {
                        const uniqueIngredientIdsWithDeficits = new Set(
                            purchase.items
                                .filter((item: any) => {
                                    if (!item.targetQty) return false;
                                    const totalQty = purchase.items
                                        .filter((i: any) => i.ingredientId === item.ingredientId)
                                        .reduce((sum: number, i: any) => sum + i.estimatedQty, 0);
                                    return totalQty < item.targetQty;
                                })
                                .map((item: any) => item.ingredientId)
                        );

                        if (uniqueIngredientIdsWithDeficits.size > 0 && purchase.status === 'incomplete') {
                            return (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <ShoppingCart className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold text-yellow-800">Pembelian Belum Lengkap</p>
                                            <p className="text-xs text-yellow-700">Total belanja untuk {uniqueIngredientIdsWithDeficits.size} bahan masih kurang dari target Ahli Gizi.</p>
                                        </div>
                                    </div>
                                    {(purchase.status === 'waiting' || purchase.status === 'incomplete') && role !== 'ASLAP' && (
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            {purchase.status === 'incomplete' && (
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-8 flex-1 sm:flex-none"
                                                    onClick={() => setShowFinalizeConfirm(true)}
                                                >
                                                    <Check className="mr-1 h-3 w-3" />
                                                    Selesaikan & Kirim ke Aslap
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                className="bg-yellow-600 hover:bg-yellow-700 text-white border-none text-[11px] h-8 flex-1 sm:flex-none"
                                                onClick={() => {
                                                    const itemsToComplete = purchase.items
                                                        .filter((item: any) => {
                                                            const totalRealizedNormalized = purchase.items
                                                                .filter((i: any) => i.ingredientId === item.ingredientId)
                                                                .reduce((sum: number, i: any) => sum + normalizeQty(i.estimatedQty, i.unit), 0);
                                                            const targetNormalized = normalizeQty(item.targetQty || 0, item.unit);
                                                            return targetNormalized > totalRealizedNormalized;
                                                        })
                                                        .map((item: any) => {
                                                            const totalRealizedNormalized = purchase.items
                                                                .filter((i: any) => i.ingredientId === item.ingredientId)
                                                                .reduce((sum: number, i: any) => sum + normalizeQty(i.estimatedQty, i.unit), 0);
                                                            const targetNormalized = normalizeQty(item.targetQty || 0, item.unit);
                                                            const deficitNormalized = targetNormalized - totalRealizedNormalized;

                                                            // We want to present the remaining qty in the item's original unit for the edit form
                                                            // but convert it back from normalized state
                                                            const deficitInOriginalUnit = deficitNormalized / getConversionFactor(item.unit);
                                                            // We keep the original unit that the target or current row is using
                                                            // instead of letting formatRecipeQty change it to something else
                                                            const formattedDeficit = formatRecipeQty(deficitInOriginalUnit, item.unit);
                                                            return {
                                                                id: item.ingredientId,
                                                                name: item.ingredientName,
                                                                unit: item.unit,
                                                                qty: deficitInOriginalUnit,
                                                                targetQty: item.targetQty,
                                                                originalUnit: item.unit,
                                                                menuType: item.menuType // Pass through
                                                            };
                                                        });

                                                    // Filter out duplicates in case multiple items of same ingredient exist
                                                    const uniqueItemsToComplete = Array.from(new Map(itemsToComplete.map((i: any) => [i.id, i])).values()) as any[];

                                                    setCurrentCompletionItems(uniqueItemsToComplete);
                                                    setIsEditOpen(true);
                                                }}
                                            >
                                                Lengkapi di Toko Lain 🛒
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        return null;
                    })()}

                    {/* Grouped Items Tables */}
                    <div className="space-y-6">
                        {(() => {
                            if (purchase.purchaseType === 'OPERATIONAL') {
                                // Group items by Request ID
                                const requestMap = new Map<string, any[]>();
                                purchase.items.forEach((item: any) => {
                                    const { requestId } = parseMemo(item.memo);
                                    const key = requestId || '__MANUAL__';
                                    if (!requestMap.has(key)) requestMap.set(key, []);
                                    requestMap.get(key)!.push(item);
                                });

                                const requests = Array.from(requestMap.entries()).map(([requestId, items]) => ({ requestId, items }));

                                return requests.map((req, rIdx) => (
                                    <div key={req.requestId} className="rounded-2xl border border-rose-100 overflow-hidden bg-white shadow-sm">
                                        <div className="bg-rose-50/50 p-4 border-b border-rose-100 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-lg border border-rose-200 text-rose-800 shadow-sm">
                                                    <ClipboardList className="h-4 w-4" />
                                                </div>
                                                <h4 className="text-sm font-bold text-rose-900">
                                                    {req.requestId === '__MANUAL__' ? 'Belanja Tambahan Manual' : `Request #${rIdx + 1} dari ASLAP`}
                                                </h4>
                                            </div>
                                            <Badge variant="outline" className="bg-rose-800 text-white border-rose-900 px-3 py-1 text-xs">
                                                {req.items.length} item
                                            </Badge>
                                        </div>
                                        <div className="p-4">
                                            <Table>
                                                <TableHeader className="bg-transparent border-b">
                                                    <TableRow className="hover:bg-transparent border-0">
                                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 h-8">Nama Barang</TableHead>
                                                        <TableHead className="w-[60px] text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 h-8">Foto</TableHead>
                                                        <TableHead className="w-[100px] text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 h-8">Target</TableHead>
                                                        <TableHead className="w-[120px] text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 h-8">Total Beli</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {(() => {
                                                        // Aggregate same ingredient in same request
                                                        const aggregated = new Map<string, {
                                                            ingredientName: string,
                                                            targetQty: number,
                                                            unit: string,
                                                            totalRealized: number,
                                                            details: { storeName: string, qty: number }[]
                                                            photoUrl?: string
                                                        }>();

                                                        req.items.forEach((item: any) => {
                                                            if (!aggregated.has(item.ingredientId)) {
                                                                aggregated.set(item.ingredientId, {
                                                                    ingredientName: item.ingredientName,
                                                                    targetQty: item.targetQty || 0,
                                                                    unit: item.unit,
                                                                    totalRealized: 0,
                                                                    details: [],
                                                                    photoUrl: item.photoUrl
                                                                });
                                                            }
                                                            const entry = aggregated.get(item.ingredientId)!;
                                                            entry.totalRealized += item.estimatedQty;
                                                            entry.details.push({
                                                                storeName: parseMemo(item.memo).storeName,
                                                                qty: item.estimatedQty
                                                            });
                                                        });

                                                        return Array.from(aggregated.values()).map((item, idx) => (
                                                            <TableRow key={idx} className="border-b last:border-0 group hover:bg-rose-50/20 transition-colors">
                                                                <TableCell className="py-4">
                                                                    <div className="flex flex-col gap-1.5">
                                                                        <span className="font-bold text-sm text-gray-900 group-hover:text-rose-900 transition-colors">{item.ingredientName}</span>
                                                                        {item.details.length > 0 && (
                                                                            <div className="space-y-1 mt-1">
                                                                                {item.details.map((d, dIdx) => (
                                                                                    <div key={dIdx} className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium bg-muted/30 px-2 py-0.5 rounded w-fit border border-muted-foreground/10">
                                                                                        <ShoppingCart className="h-3 w-3 opacity-60" />
                                                                                        <span className="opacity-70">{formatRecipeQty(d.qty, item.unit).stringValue}</span>
                                                                                        <span className="text-muted-foreground/40">—</span>
                                                                                        <span>{d.storeName}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center py-4">
                                                                    {item.photoUrl ? (
                                                                        <button
                                                                            onClick={() => setLightboxImage({ url: item.photoUrl!, name: item.ingredientName })}
                                                                            className="relative h-10 w-10 rounded-lg overflow-hidden border border-rose-100 hover:border-rose-300 transition-all mx-auto block bg-muted shadow-sm"
                                                                        >
                                                                            <Image src={item.photoUrl} alt={item.ingredientName} fill className="object-cover" />
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-muted-foreground/30 text-[10px]">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-center py-4">
                                                                    <span className="font-bold text-sm text-gray-700">
                                                                        {formatRecipeQty(item.targetQty, item.unit).stringValue}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-center py-4">
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <span className="font-bold text-lg text-emerald-600 leading-none">
                                                                            {formatRecipeQty(item.totalRealized, item.unit).stringValue}
                                                                        </span>
                                                                        {item.totalRealized >= item.targetQty && (
                                                                            <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 px-1.5 py-0 rounded-full font-bold flex items-center gap-1">
                                                                                <Check className="h-2 w-2" /> Lengkap
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ));
                                                    })()}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                ));
                            }

                            // Original FOOD rendering logic here
                            const groupMap = new Map<string, any[]>();
                            purchase.items.forEach((item: any) => {
                                const memoRaw = item.memo || 'Lainnya';
                                const memo = formatMemo(memoRaw);
                                if (!groupMap.has(memo)) {
                                    groupMap.set(memo, []);
                                }
                                groupMap.get(memo)!.push(item);
                            });

                            const trips = Array.from(groupMap.entries()).map(([memo, items]) => ({ memo, items }));

                            return trips.map((trip, gIdx) => (
                                <div key={`${trip.memo}-${gIdx}`} className="space-y-3">
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="h-6 w-1 bg-primary rounded-full" />
                                        <h4 className="text-sm font-bold flex items-center gap-2 capitalize">
                                            <ShoppingBag className="h-4 w-4 text-primary" />
                                            <span className="opacity-50 text-[10px] mr-1">#{gIdx + 1}</span>
                                            {trip.memo === 'Lainnya' ? 'Detail Belanja' : trip.memo}
                                        </h4>
                                    </div>
                                    {(() => {
                                        const masakanItems = trip.items.filter((i: any) => !i.menuType || i.menuType === 'OMPRENG');
                                        const keringItems = trip.items.filter((i: any) => i.menuType === 'KERING');
                                        const operationalItems = trip.items.filter((i: any) => i.menuType === 'OPERATIONAL');

                                        const renderTable = (items: any[], title: string, colorClass: string) => (
                                            <div className="mb-4 last:mb-0">
                                                <h5 className={`text-xs font-semibold mb-2 uppercase tracking-wider ${colorClass}`}>{title}</h5>
                                                <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                                                    <Table>
                                                        <TableHeader className="bg-muted/30">
                                                            <TableRow className="hover:bg-transparent">
                                                                <TableHead className="text-xs font-semibold">Nama Bahan</TableHead>
                                                                <TableHead className="w-[80px] text-center text-xs font-semibold">Foto</TableHead>
                                                                <TableHead className="w-[120px] text-center text-xs font-semibold">Target (Gizi)</TableHead>
                                                                <TableHead className="w-[120px] text-center text-xs font-semibold">Realisasi (Beli)</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {items.map((item: any, idx: number) => {
                                                                const totalRealizedNormalized = purchase.items
                                                                    .filter((i: any) => i.ingredientId === item.ingredientId)
                                                                    .reduce((sum: number, i: any) => sum + normalizeQty(i.estimatedQty, i.unit), 0);
                                                                const totalTargetNormalized = purchase.items
                                                                    .filter((i: any) => i.ingredientId === item.ingredientId)
                                                                    .reduce((sum: number, i: any) => sum + normalizeQty(i.targetQty || 0, i.unit), 0);
                                                                const isUnderTarget = item.targetQty && totalRealizedNormalized < totalTargetNormalized;

                                                                const isLastTripForThisIngredient = trips.slice(gIdx + 1).every(t => !t.items.some(i => i.ingredientId === item.ingredientId));

                                                                return (
                                                                    <TableRow key={`${item.id}-${idx}`} className="h-12 border-b last:border-0 hover:bg-muted/5 transition-colors">
                                                                        <TableCell className="py-2">
                                                                            <span className="font-semibold text-sm">{item.ingredientName}</span>
                                                                        </TableCell>
                                                                        <TableCell className="text-center py-2">
                                                                            {item.photoUrl ? (
                                                                                <button
                                                                                    onClick={() => setLightboxImage({ url: item.photoUrl, name: item.ingredientName })}
                                                                                    className="relative h-8 w-12 rounded overflow-hidden border hover:opacity-80 transition-opacity mx-auto block bg-muted"
                                                                                >
                                                                                    <Image src={item.photoUrl} alt={item.ingredientName} fill className="object-cover" />
                                                                                </button>
                                                                            ) : (
                                                                                <span className="text-muted-foreground text-[10px]">-</span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-center py-2">
                                                                            {item.targetQty !== undefined && item.targetQty !== null ? (
                                                                                item.targetQty === 0 ? (
                                                                                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-bold whitespace-nowrap">
                                                                                        Secukupnya
                                                                                    </span>
                                                                                ) : (
                                                                                    <div className="flex flex-col items-center">
                                                                                        {(() => {
                                                                                            const formatted = formatRecipeQty(item.targetQty, item.unit);
                                                                                            const deficitNormalized = totalTargetNormalized - totalRealizedNormalized;
                                                                                            const deficitInOriginalUnit = deficitNormalized / getConversionFactor(item.unit);
                                                                                            const formattedDeficit = formatRecipeQty(deficitInOriginalUnit, item.unit);
                                                                                            return (
                                                                                                <>
                                                                                                    <span className="text-destructive font-bold text-sm">
                                                                                                        {formatted.stringValue} <span className="text-[10px] font-normal text-muted-foreground uppercase">{formatted.unit}</span>
                                                                                                    </span>
                                                                                                    {isUnderTarget && isLastTripForThisIngredient && (
                                                                                                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded-sm border border-yellow-200 font-bold whitespace-nowrap mt-0.5">
                                                                                                            Kurang: {formattedDeficit.stringValue} {formattedDeficit.unit}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                )
                                                                            ) : '-'}
                                                                        </TableCell>
                                                                        <TableCell className="text-center py-2 font-medium">
                                                                            {formatRecipeQty(item.estimatedQty, item.unit).stringValue} <span className="text-[10px] font-normal text-muted-foreground uppercase ml-1">{formatRecipeQty(item.estimatedQty, item.unit).unit}</span>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        );

                                        return (
                                            <>
                                                {masakanItems.length > 0 && renderTable(masakanItems, "Kebutuhan Masakan / Ompreng", "text-emerald-700")}
                                                {keringItems.length > 0 && renderTable(keringItems, "Kebutuhan Snack / Kering", "text-orange-700")}
                                                {operationalItems.length > 0 && renderTable(operationalItems, "Barang Operasional", "text-blue-700")}
                                            </>
                                        );
                                    })()}
                                </div>
                            ));
                        })()}
                    </div>

                    {/* History Section */}
                    {logs.length > 0 && (
                        <div className="space-y-3 pt-6 border-t mt-4">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                                <History className="h-4 w-4" /> Riwayat Perubahan
                            </h4>
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                {logs.map((log) => (
                                    <div key={log.id} className="flex flex-col gap-1 text-[10px] text-muted-foreground bg-muted/30 p-2 rounded border border-dashed hover:border-primary/20 transition-colors">
                                        <div className="flex items-center justify-between gap-2">
                                            <span>
                                                Diedit oleh <span className="font-medium text-foreground">{log.userName}</span>
                                            </span>
                                            <Badge variant="outline" className="text-[9px] shrink-0 font-normal bg-white">
                                                {format(new Date(log.createdAt), 'dd MMM HH:mm', { locale: id })}
                                            </Badge>
                                        </div>
                                        {log.details?.summary && (
                                            <div className="mt-1 flex flex-col gap-1 border-t pt-1 border-dotted">
                                                {log.details.summary.map((change: string, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                                                        <div className="w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                                                        <span>{change}</span>
                                                    </div>
                                                ))}
                                                {log.details.moreChanges > 0 && (
                                                    <div className="text-[9px] italic opacity-70">
                                                        ...dan {log.details.moreChanges} perubahan lainnya
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between sm:justify-between border-t pt-4">
                    <div className="flex gap-2">
                        {purchase.status === 'waiting' && role !== 'ASLAP' && (
                            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit / Update Realisasi
                            </Button>
                        )}
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent >

            <EditPurchaseDialog
                open={isEditOpen}
                onOpenChange={(open) => {
                    setIsEditOpen(open);
                    if (!open) setCurrentCompletionItems(undefined); // Clear on close
                }}
                purchase={purchase}
                initialCompletionItems={currentCompletionItems}
                onSuccess={() => {
                    onOpenChange(false); // Close Detail Dialog
                    if (onRefresh) onRefresh(); // Trigger refresh in parent
                }}
            />

            <AlertConfirm
                open={showFinalizeConfirm}
                onOpenChange={setShowFinalizeConfirm}
                title="Selesaikan Belanja"
                description="Kirim daftar belanja ke Aslap meskipun belum lengkap?"
                confirmText="Selesaikan"
                onConfirm={handleFinalize}
            />

            {/* Lightbox for viewing photos */}
            <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
                <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-0">
                    <DialogHeader className="p-4 pb-2">
                        <DialogTitle>Foto: {lightboxImage?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center p-4 pt-0">
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/50">
                            {lightboxImage && (
                                <Image
                                    src={lightboxImage.url}
                                    alt={lightboxImage.name}
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog >
    );
}
