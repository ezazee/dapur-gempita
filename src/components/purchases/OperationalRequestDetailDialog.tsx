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
import { EditOperationalPurchaseDialog } from './EditOperationalPurchaseDialog';
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
import { formatRecipeQty, cn } from '@/lib/utils';

interface PurchaseDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    request?: any;
    purchase?: any;
    onEdit?: () => void;
    onRefresh?: () => void;
}

export function OperationalRequestDetailDialog({ open, onOpenChange, request, purchase: propPurchase, onEdit, onRefresh: propRefresh }: PurchaseDetailDialogProps) {
    const purchase = request || propPurchase;
    const onRefresh = onEdit || propRefresh;
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
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between mr-8">
                        <DialogTitle className="text-xl">Detail Pembelian</DialogTitle>
                        <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(purchase.purchaseDate), 'dd MMMM yyyy', { locale: id })}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Dibuat oleh: <span className="font-medium text-foreground">{purchase.creatorName}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Status & Note Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                                <ShoppingCart className="h-4 w-4" /> Status
                            </h4>
                            <div className="text-sm">
                                {getStatusBadge(purchase.status)}
                            </div>
                        </div>

                        {/* TOKO / CATATAN */}
                        {(() => {
                            const mainStore = (purchase.note || '').trim();

                            // Collect unique REAL store names from item memos (not ASLAP/request memos)
                            const parseMemoForStore = (m: string) => {
                                const match = /\[REQ:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]\s*(.*)/i.exec(m);
                                if (match) return match[1].trim();

                                const up = m.toUpperCase();
                                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m);
                                if (isUuid || up.includes('REQUEST') || up.includes('ASLAP') || up.includes('PERMINTAAN')) return '';

                                return m.trim();
                            };

                            const extraStores = new Set<string>();
                            purchase.items.forEach((item: any) => {
                                const m = (item.memo || '').trim();
                                const store = parseMemoForStore(m);

                                if (store && store.toLowerCase() !== mainStore.toLowerCase()) {
                                    extraStores.add(store);
                                }
                            });

                            const allStores = [
                                ...(mainStore ? [{ label: 'Toko Utama', name: mainStore, isMain: true }] : []),
                                ...Array.from(extraStores).map((s, i) => ({ label: `Toko ${i + 2}`, name: s, isMain: false })),
                            ];

                            if (allStores.length === 0) return null;

                            if (purchase.status === 'requested') return null; // Hide store info until it is processed by Keuangan

                            return (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                                        <ShoppingBag className="h-4 w-4" /> Tempat Belanja
                                    </h4>
                                    <div className="flex flex-col gap-1.5">
                                        {allStores.map((store, idx) => (
                                            <div key={idx} className={cn(
                                                "flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg border font-medium",
                                                store.isMain
                                                    ? "bg-primary/5 border-primary/20 text-foreground"
                                                    : "bg-muted/40 border-border text-muted-foreground"
                                            )}>
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                                    store.isMain
                                                        ? "bg-primary text-white"
                                                        : "bg-muted-foreground/20 text-muted-foreground"
                                                )}>
                                                    {idx + 1}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{store.label}</span>
                                                    <span className="truncate">{store.name}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
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
                                                            if (!item.targetQty) return false;
                                                            const totalRealized = purchase.items
                                                                .filter((i: any) => i.ingredientId === item.ingredientId)
                                                                .reduce((sum: number, i: any) => sum + Number(i.estimatedQty), 0);
                                                            const target = Number(item.targetQty);
                                                            return target > totalRealized;
                                                        })
                                                        .map((item: any) => {
                                                            const totalRealized = purchase.items
                                                                .filter((i: any) => i.ingredientId === item.ingredientId)
                                                                .reduce((sum: number, i: any) => sum + Number(i.estimatedQty), 0);
                                                            const target = Number(item.targetQty);
                                                            const deficit = target - totalRealized;

                                                            return {
                                                                id: item.ingredientId,
                                                                name: item.ingredientName,
                                                                unit: item.unit,
                                                                qty: deficit,
                                                                targetQty: item.targetQty,
                                                                originalUnit: item.unit,
                                                                originalMemo: item.memo,
                                                            };
                                                        });

                                                    const uniqueItemsToComplete = Array.from(new Map(itemsToComplete.map((i: any) => [i.id, i])).values());
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

                    {/* Items Table — grouped by request, with completion items merged in */}
                    <div className="space-y-4">
                        {(() => {
                            if (!purchase.items || purchase.items.length === 0) {
                                return (
                                    <div className="text-sm text-muted-foreground text-center py-6">
                                        Belum ada barang dalam pembelian ini.
                                    </div>
                                );
                            }

                            const isUuidStr = (m: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m || '');
                            const isEmbeddedReq = (m: string) => /\[REQ:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]/i.test(m || '');

                            const isAslapKw = (m: string) => {
                                const up = (m || '').toUpperCase();
                                return up.includes('REQUEST') || up.includes('ASLAP') || up.includes('PERMINTAAN');
                            };

                            const isRequestMemo = (m: string) => isUuidStr(m) || isAslapKw(m) || isEmbeddedReq(m);

                            // Separate items into: request-origin items vs completion items
                            const requestItems = purchase.items.filter((i: any) => isRequestMemo((i.memo || '').trim()));
                            const completionItems = purchase.items.filter((i: any) => !isRequestMemo((i.memo || '').trim()));

                            // Build request groups (keyed by UUID/ASLAP memo)
                            const requestGroups: Record<string, { label: string; ingredientIds: Set<string>; items: any[]; extras: { store: string; ingredientId: string; qty: number; photoUrl?: string }[] }> = {};
                            const requestOrder: string[] = [];

                            requestItems.forEach((item: any) => {
                                const m = (item.memo || '').trim();
                                let key = '__ASLAP__';

                                const embeddedMatch = /\[REQ:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i.exec(m);
                                if (embeddedMatch) {
                                    key = embeddedMatch[1];
                                } else if (isUuidStr(m)) {
                                    key = m;
                                } else if (m) {
                                    key = m;
                                }

                                if (!requestGroups[key]) {
                                    if (!requestOrder.includes(key)) requestOrder.push(key);
                                    requestGroups[key] = { label: '', ingredientIds: new Set(), items: [], extras: [] };
                                }
                                requestGroups[key].items.push(item);
                                requestGroups[key].ingredientIds.add(item.ingredientId);
                            });

                            // Label groups
                            requestOrder.forEach((key, i) => {
                                if (requestGroups[key]) requestGroups[key].label = `Request #${i + 1} dari ASLAP`;
                            });

                            // Match completion items into request groups by ingredientId
                            const unmatchedCompletion: any[] = [];
                            completionItems.forEach((item: any) => {
                                const matchedKey = requestOrder.find(k => requestGroups[k].ingredientIds.has(item.ingredientId));
                                if (matchedKey) {
                                    let storeName = purchase.note || 'Toko Utama';
                                    const m = (item.memo || '').trim();

                                    const embeddedMatch = /\[REQ:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]\s*(.*)/i.exec(m);
                                    if (embeddedMatch && embeddedMatch[1]) {
                                        storeName = embeddedMatch[1].trim();
                                    } else if (!isUuidStr(m) && !isAslapKw(m) && m) {
                                        storeName = m;
                                    }

                                    requestGroups[matchedKey].extras.push({
                                        store: storeName,
                                        ingredientId: item.ingredientId,
                                        qty: Number(item.estimatedQty || 0),
                                        photoUrl: item.photoUrl,
                                    });
                                } else {
                                    unmatchedCompletion.push(item);
                                }
                            });

                            // Render a group's table with merged extras
                            const renderGroupTable = (groupKey: string) => {
                                const group = requestGroups[groupKey];
                                // Aggregate base request items by ingredientId
                                const ingMap: Record<string, { name: string; unit: string; targetQty: number; stores: { store: string; qty: number; photoUrl?: string }[]; photoUrl?: string }> = {};
                                group.items.forEach((item: any) => {
                                    const id = item.ingredientId;
                                    if (!ingMap[id]) {
                                        ingMap[id] = { name: item.ingredientName, unit: item.unit, targetQty: 0, stores: [], photoUrl: undefined };
                                    }
                                    if ((item.targetQty || 0) > ingMap[id].targetQty) ingMap[id].targetQty = Number(item.targetQty);

                                    let storeName = purchase.note || 'Toko Utama';
                                    const m = (item.memo || '').trim();
                                    const embeddedMatch = /\[REQ:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]\s*(.*)/i.exec(m);
                                    if (embeddedMatch && embeddedMatch[1]) {
                                        storeName = embeddedMatch[1].trim();
                                    } else if (!isUuidStr(m) && !isAslapKw(m) && m) {
                                        storeName = m;
                                    }

                                    ingMap[id].stores.push({ store: storeName, qty: Number(item.estimatedQty || 0), photoUrl: item.photoUrl });
                                    if (item.photoUrl) ingMap[id].photoUrl = item.photoUrl;
                                });
                                // Merge completion items (extras) into matching ingredients
                                group.extras.forEach(ex => {
                                    if (ingMap[ex.ingredientId]) {
                                        ingMap[ex.ingredientId].stores.push({ store: ex.store, qty: ex.qty, photoUrl: ex.photoUrl });
                                        if (ex.photoUrl) ingMap[ex.ingredientId].photoUrl = ex.photoUrl;
                                    }
                                });

                                return Object.values(ingMap).map((item, idx) => {
                                    const totalBeli = item.stores.reduce((s, p) => s + p.qty, 0);
                                    const isUnder = item.targetQty > 0 && totalBeli < item.targetQty;
                                    const isOk = item.targetQty > 0 && totalBeli >= item.targetQty;
                                    const hasMultiStore = item.stores.length > 1;
                                    const targetFmt = formatRecipeQty(item.targetQty, item.unit);
                                    const beliFmt = formatRecipeQty(totalBeli, item.unit);
                                    const kurangFmt = formatRecipeQty(item.targetQty - totalBeli, item.unit);

                                    return (
                                        <TableRow key={idx} className="border-b last:border-0 align-top hover:bg-muted/10">
                                            <TableCell className="py-3">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="font-semibold text-sm">{item.name}</span>
                                                    {hasMultiStore && (
                                                        <div className="ml-2 flex flex-col gap-0.5 border-l-2 border-slate-200 pl-2">
                                                            {item.stores.map((s, sIdx) => {
                                                                const sFmt = formatRecipeQty(s.qty, item.unit);
                                                                return (
                                                                    <div key={sIdx} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                        <ShoppingBag className="h-2.5 w-2.5 shrink-0 text-slate-400" />
                                                                        <span className="font-semibold text-foreground">{sFmt.stringValue} {sFmt.unit}</span>
                                                                        <span>— {s.store}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-3">
                                                {item.photoUrl ? (
                                                    <button type="button" onClick={() => setLightboxImage({ url: item.photoUrl!, name: item.name })} className="relative h-8 w-12 rounded overflow-hidden border hover:opacity-80 mx-auto block">
                                                        <Image src={item.photoUrl} alt={item.name} fill className="object-cover" />
                                                    </button>
                                                ) : <span className="text-muted-foreground text-[10px]">-</span>}
                                            </TableCell>
                                            <TableCell className="text-center py-3">
                                                {item.targetQty > 0 ? (
                                                    <span className="font-bold text-sm">{targetFmt.stringValue} <span className="text-[10px] font-normal text-muted-foreground">{targetFmt.unit}</span></span>
                                                ) : (
                                                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-bold">Secukupnya</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center py-3">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={cn("font-bold text-sm", isOk ? "text-emerald-600" : isUnder ? "text-amber-600" : "text-foreground")}>
                                                        {beliFmt.stringValue} <span className="text-[10px] font-normal text-muted-foreground">{beliFmt.unit}</span>
                                                    </span>
                                                    {isOk && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200 font-bold flex items-center gap-0.5"><CheckCircle className="h-2.5 w-2.5" /> Lengkap</span>}
                                                    {isUnder && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full border border-red-200 font-bold whitespace-nowrap">Kurang {kurangFmt.stringValue} {kurangFmt.unit}</span>}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                });
                            };

                            // Render unmatched manual items
                            const renderManualTable = (items: any[]) => {
                                const ingMap: Record<string, { name: string; unit: string; qty: number; targetQty: number; photoUrl?: string }> = {};
                                items.forEach((item: any) => {
                                    const id = item.ingredientId;
                                    if (!ingMap[id]) ingMap[id] = { name: item.ingredientName, unit: item.unit, qty: 0, targetQty: 0, photoUrl: undefined };
                                    ingMap[id].qty += Number(item.estimatedQty || 0);
                                    if ((item.targetQty || 0) > ingMap[id].targetQty) ingMap[id].targetQty = Number(item.targetQty);
                                    if (item.photoUrl) ingMap[id].photoUrl = item.photoUrl;
                                });
                                return Object.values(ingMap).map((item, idx) => {
                                    const beliFmt = formatRecipeQty(item.qty, item.unit);
                                    return (
                                        <TableRow key={idx} className="border-b last:border-0 align-top hover:bg-muted/10">
                                            <TableCell className="py-3"><span className="font-semibold text-sm">{item.name}</span></TableCell>
                                            <TableCell className="text-center py-3">
                                                {item.photoUrl ? <button type="button" onClick={() => setLightboxImage({ url: item.photoUrl!, name: item.name })} className="relative h-8 w-12 rounded overflow-hidden border hover:opacity-80 mx-auto block"><Image src={item.photoUrl} alt={item.name} fill className="object-cover" /></button> : <span className="text-muted-foreground text-[10px]">-</span>}
                                            </TableCell>
                                            <TableCell className="text-center py-3"><span className="text-[10px] text-muted-foreground">-</span></TableCell>
                                            <TableCell className="text-center py-3">
                                                <span className="font-bold text-sm">{beliFmt.stringValue} <span className="text-[10px] font-normal text-muted-foreground">{beliFmt.unit}</span></span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                });
                            };

                            const renderSection = (keyStr: string, label: string, isRequest: boolean, renderRows: () => JSX.Element[], itemCount: number) => (
                                <div key={keyStr} className={cn("border rounded-xl overflow-hidden shadow-sm", isRequest ? "border-primary/20" : "border-slate-200")}>
                                    <div className={cn("flex items-center justify-between px-4 py-2.5 border-b", isRequest ? "bg-primary/5" : "bg-muted/30")}>
                                        <div className="flex items-center gap-2">
                                            <ClipboardList className={cn("h-3.5 w-3.5", isRequest ? "text-primary" : "text-muted-foreground")} />
                                            <span className={cn("text-xs font-bold", isRequest ? "text-primary" : "text-muted-foreground")}>{label}</span>
                                        </div>
                                        <Badge variant={isRequest ? "default" : "secondary"} className="text-[10px]">{itemCount} item</Badge>
                                    </div>
                                    <Table>
                                        <TableHeader className="bg-muted/20">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="text-xs font-semibold">Nama Barang</TableHead>
                                                <TableHead className="w-[80px] text-center text-xs font-semibold">Foto</TableHead>
                                                <TableHead className="w-[110px] text-center text-xs font-semibold">Target</TableHead>
                                                <TableHead className="w-[110px] text-center text-xs font-semibold">Total Beli</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>{renderRows()}</TableBody>
                                    </Table>
                                </div>
                            );

                            return (
                                <>
                                    {requestOrder.map((key, i) => {
                                        const group = requestGroups[key];
                                        const uniqueIngIds = new Set([...group.items.map((it: any) => it.ingredientId)]);
                                        return renderSection(key, group.label, true, () => renderGroupTable(key), uniqueIngIds.size);
                                    })}
                                    {unmatchedCompletion.length > 0 && renderSection(
                                        'manual-items', 'Barang Manual / Tambahan', false,
                                        () => renderManualTable(unmatchedCompletion),
                                        unmatchedCompletion.length
                                    )}
                                    {requestOrder.length === 0 && completionItems.length === 0 && unmatchedCompletion.length === 0 && (
                                        <div className="text-sm text-muted-foreground text-center py-6">Belum ada barang.</div>
                                    )}
                                </>
                            );
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

            <EditOperationalPurchaseDialog
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
