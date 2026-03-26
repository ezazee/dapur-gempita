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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { CameraCapturePurchase } from '@/components/shared/CameraCapturePurchase';
import { createProduction, getTodaysMenus } from '@/app/actions/productions';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle2, Users, Utensils, Baby, Heart } from 'lucide-react';
import { formatRecipeQty, denormalizeQty, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ProductionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    menuId?: string;
}

interface MenuProductionState {
    menu: any;
    countKecil: number | string;
    countBesar: number | string;
    countBumil: number | string;
    countBalita: number | string;
    photoUrl: string;
    items: {
        id: string;
        name: string;
        originalUnit: string;
        displayUnit: string;
        availableStock: number;
        targetQty: number;
        qtyUsed: number | string
    }[];
}

export function ProductionDialog({ open, onOpenChange, onSuccess, menuId }: ProductionDialogProps) {
    const [menuStates, setMenuStates] = useState<Record<string, MenuProductionState>>({});
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingMenu, setFetchingMenu] = useState(false);

    useEffect(() => {
        if (open) {
            fetchMenus();
        } else {
            setMenuStates({});
            setNote('');
        }
    }, [open, menuId]);

    const fetchMenus = async () => {
        setFetchingMenu(true);
        try {
            const allMenus = await getTodaysMenus(menuId);
            const menus = allMenus.filter((m: any) => !m.isCompleted);

            if (menus.length === 0 && allMenus.length > 0) {
                toast.info('Semua menu untuk hari ini sudah dicatat produksinya');
                onOpenChange(false);
                return;
            }

            if (!menus || menus.length === 0) {
                toast.error('Menu hari ini belum dibuat');
                return;
            }

            const newStates: Record<string, MenuProductionState> = {};
            menus.forEach((m: any) => {
                const items = (m.ingredients || []).map((i: any) => {
                    const stockVal = Number(i.availableStock || 0);
                    const formatted = formatRecipeQty(stockVal, i.unit);
                    return {
                        id: i.id,
                        name: i.name,
                        originalUnit: i.unit,
                        displayUnit: formatted.unit,
                        availableStock: formatted.value,
                        targetQty: denormalizeQty(i.stdQty || 0, i.unit, formatted.unit),
                        qtyUsed: formatted.value
                    };
                });

                newStates[m.id] = {
                    menu: m,
                    countKecil: m.countKecil || 0,
                    countBesar: m.countBesar || 0,
                    countBumil: m.countBumil || 0,
                    countBalita: m.countBalita || 0,
                    photoUrl: '',
                    items
                };
            });

            setMenuStates(newStates);
            toast.success(`Sinkronisasi Stok: ${menus.length} Menu ditemukan`);
        } catch (error) {
            toast.error('Gagal memuat menu');
        } finally {
            setFetchingMenu(false);
        }
    };

    const updatePortion = (mId: string, field: string, value: string) => {
        setMenuStates(prev => ({
            ...prev,
            [mId]: { ...prev[mId], [field]: value }
        }));
    };

    const updateItemQty = (mId: string, itemId: string, value: number | string) => {
        setMenuStates(prev => ({
            ...prev,
            [mId]: {
                ...prev[mId],
                items: prev[mId].items.map(i => i.id === itemId ? { ...i, qtyUsed: value } : i)
            }
        }));
    };

    const updatePhoto = (mId: string, url: string) => {
        setMenuStates(prev => ({
            ...prev,
            [mId]: { ...prev[mId], photoUrl: url }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();



        const submissions = Object.values(menuStates).map(state => {
            const k = parseInt(String(state.countKecil)) || 0;
            const b = parseInt(String(state.countBesar)) || 0;
            const p = parseInt(String(state.countBumil)) || 0;
            const l = parseInt(String(state.countBalita)) || 0;

            return {
                menuId: state.menu.id,
                countKecil: k,
                countBesar: b,
                countBumil: p,
                countBalita: l,
                totalPortions: k + b + p + l,
                note: note, // Shared note or maybe per menu? User didn't specify, I'll keep one.
                photoUrl: state.photoUrl,
                items: state.items.map(item => ({
                    ingredientId: item.id,
                    qtyUsed: denormalizeQty(
                        typeof item.qtyUsed === 'string' ? parseFloat(item.qtyUsed) : item.qtyUsed,
                        item.displayUnit,
                        item.originalUnit
                    )
                }))
            };
        });

        if (submissions.length === 0) return;

        setLoading(true);
        const res = await createProduction(submissions);
        setLoading(false);

        if (res.success) {
            toast.success('Produksi berhasil disimpan');
            onOpenChange(false);
            onSuccess();
        } else {
            toast.error(res.error || 'Gagal menyimpan');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-8">
                        <div>
                            <DialogTitle>Catat Hasil Masakan</DialogTitle>
                            <DialogDescription>Input porsi riil dan pemakaian stok bahan baku</DialogDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchMenus} disabled={fetchingMenu} className="h-8">
                            <RefreshCw className={cn("h-3 w-3 mr-2", fetchingMenu && "animate-spin")} />
                            Refresh Stok
                        </Button>
                    </div>
                </DialogHeader>

                {Object.keys(menuStates).length === 0 ? (
                    <div className="py-12 flex flex-col items-center gap-4 text-center">
                        <Utensils className="h-12 w-12 text-muted-foreground opacity-20" />
                        <p className="text-muted-foreground">Memuat data menu...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-10 pt-2 pb-6">
                        {Object.entries(menuStates).map(([mId, state], idx) => (
                            <div key={mId} className={cn("space-y-6", idx > 0 && "pt-10 border-t-2 border-dashed")}>
                                {/* Menu Header */}
                                <div className="flex items-center justify-between bg-muted/40 p-4 rounded-xl border border-muted/50">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-12 w-12 rounded-full flex items-center justify-center font-black text-xl shadow-inner",
                                            state.menu.menuType === 'OMPRENG' ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                                        )}>
                                            {state.menu.menuType === 'OMPRENG' ? '🥘' : '🍪'}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-xl">{state.menu.name}</h3>
                                            <Badge variant="outline" className={cn(
                                                "text-[10px] uppercase font-bold",
                                                state.menu.menuType === 'OMPRENG' ? "border-blue-200 text-blue-700 bg-blue-50" : "border-amber-200 text-amber-700 bg-amber-50"
                                            )}>
                                                {state.menu.menuType === 'OMPRENG' ? 'Masakan Utama (Ompreng)' : 'Menu Kering / Snack'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Total Porsi Masak</p>
                                        <p className="text-2xl font-black text-primary">
                                            {(parseInt(String(state.countKecil)) || 0) + (parseInt(String(state.countBesar)) || 0) + (parseInt(String(state.countBumil)) || 0) + (parseInt(String(state.countBalita)) || 0)}
                                        </p>
                                    </div>
                                </div>

                                {/* Portions Grid */}
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Jumlah Porsi Riil Dihasilkan</Label>
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase flex flex-col gap-0.5">
                                                <span className="flex items-center gap-1.5 font-bold"><Users className="h-3 w-3" /> Porsi Kecil</span>
                                                <span className="text-[8px] text-muted-foreground lowercase">PAUD / TK / SD 1-3</span>
                                            </Label>
                                            <Input type="number" value={state.countKecil} onChange={(e) => updatePortion(mId, 'countKecil', e.target.value)} className="h-10 font-bold" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase flex flex-col gap-0.5 text-primary">
                                                <span className="flex items-center gap-1.5 font-bold"><Users className="h-3 w-3" /> Porsi Besar</span>
                                                <span className="text-[8px] text-primary/60 lowercase">SD 4-6 / SMP / SMA</span>
                                            </Label>
                                            <Input type="number" value={state.countBesar} onChange={(e) => updatePortion(mId, 'countBesar', e.target.value)} className="h-10 font-bold border-primary/30" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase flex flex-col gap-0.5">
                                                <span className="flex items-center gap-1.5 text-pink-600"><Heart className="h-3 w-3" /> Bumil / Busui</span>
                                                <span className="text-[8px] text-muted-foreground lowercase">Nilai gizi mengikuti Porsi Besar</span>
                                            </Label>
                                            <Input type="number" value={state.countBumil} onChange={(e) => updatePortion(mId, 'countBumil', e.target.value)} className="h-10 font-bold" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase flex flex-col gap-0.5">
                                                <span className="flex items-center gap-1.5 text-orange-600"><Baby className="h-3 w-3" /> Balita</span>
                                                <span className="text-[8px] text-muted-foreground lowercase">Nilai gizi mengikuti Porsi Kecil</span>
                                            </Label>
                                            <Input type="number" value={state.countBalita} onChange={(e) => updatePortion(mId, 'countBalita', e.target.value)} className="h-10 font-bold" />
                                        </div>
                                    </div>
                                </div>

                                {/* Cooking Instructions (Tata Cara Masak) */}
                                {state.menu.description && (
                                    <div className="bg-blue-50/30 border border-blue-200 rounded-xl p-4 space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-blue-800 flex items-center gap-2">
                                            <Utensils className="h-3 w-3" /> Tata Cara Masak / Catatan Ahli Gizi
                                        </Label>
                                        <div className="text-sm text-blue-900 italic whitespace-pre-wrap pl-5 border-l-4 border-blue-200 py-1">
                                            "{state.menu.description}"
                                        </div>
                                    </div>
                                )}

                                {/* Ingredients Table Header */}
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                        <span>Pemakaian Bahan Baku ({state.menu.menuType})</span>
                                        <span className="text-[10px] text-blue-600 capitalize">Otomatis Terhitung Dari Porsi</span>
                                    </Label>
                                    <div className="border rounded-lg overflow-hidden shadow-sm">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="text-[11px] uppercase font-bold">Nama Bahan</TableHead>
                                                    <TableHead className="text-center text-[11px] uppercase font-bold">Target</TableHead>
                                                    <TableHead className="text-center text-[11px] uppercase font-bold">Stok</TableHead>
                                                    <TableHead className="text-right text-[11px] uppercase font-bold pr-6">Qty Digunakan</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {state.items.map((item) => (
                                                    <TableRow key={item.id} className="hover:bg-muted/10 h-10">
                                                        <TableCell className="py-2">
                                                            <div className="font-semibold text-xs">{item.name}</div>
                                                            {item.availableStock <= 0 && <Badge variant="destructive" className="mt-0.5 h-3 px-1 text-[7px] font-black">HABIS</Badge>}
                                                        </TableCell>
                                                        <TableCell className="text-center text-[10px] font-medium text-blue-600">
                                                            {item.targetQty} {item.displayUnit}
                                                        </TableCell>
                                                        <TableCell className="text-center text-[10px]">
                                                            <span className={cn("font-bold", item.availableStock <= 0 ? "text-destructive" : "text-foreground")}>
                                                                {item.availableStock} {item.displayUnit}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right pr-4">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <Input
                                                                    type="number"
                                                                    step="any"
                                                                    value={item.qtyUsed}
                                                                    onChange={(e) => updateItemQty(mId, item.id, e.target.value)}
                                                                    className="w-16 h-7 text-right font-mono text-[10px] focus:ring-1 focus:ring-primary"
                                                                    disabled={item.availableStock <= 0}
                                                                />
                                                                <span className="text-[9px] font-bold text-muted-foreground w-6 text-left">{item.displayUnit}</span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Photo Capture */}
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bukti Hasil {state.menu.menuType === 'OMPRENG' ? 'Masakan' : 'Snack'}</Label>
                                    <div className="border-2 border-dashed border-muted rounded-xl p-6 bg-muted/10 flex flex-col items-center">
                                        <CameraCapturePurchase onCapture={(url) => updatePhoto(mId, url)} currentImage={state.photoUrl} onRemove={() => updatePhoto(mId, '')} />
                                        <p className="text-[10px] text-muted-foreground mt-3 italic text-center font-medium">
                                            Wajib lampirkan foto hasil jadi <span className="text-primary font-bold">{state.menu.name}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Global Notes */}
                        <div className="pt-6">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Catatan Dapur Keseluruhan (Opsional)</Label>
                            <Textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Contoh: Tekstur lembut, rasa gurih, bumbu meresap untuk semua sajian."
                                className="min-h-[100px] mt-2 resize-none text-sm"
                            />
                        </div>

                        <DialogFooter className="border-t pt-6">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-full px-6">
                                Batal
                            </Button>
                            <Button type="submit" disabled={loading} className="rounded-full px-12 h-12 text-lg font-black shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95">
                                {loading ? (
                                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="mr-2 h-5 w-5" />
                                )}
                                Simpan Produksi Hari Ini
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
