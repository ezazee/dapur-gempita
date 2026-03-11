'use client';

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
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar, Utensils, FileText, Users2, Zap, Beef, Droplets, Waves } from 'lucide-react';
import { cn, formatRecipeQty } from '@/lib/utils';

interface MenuDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    menu: any; // Using any for now to match strict page types
}

export function MenuDetailDialog({ open, onOpenChange, menu }: MenuDetailDialogProps) {
    if (!menu) return null;

    const isGrouped = menu.originalMenus && menu.originalMenus.length > 1;
    const originalMenus = menu.originalMenus || [menu];

    // Aggregations
    const totalCountKecil = originalMenus.reduce((sum: number, m: any) => sum + (m.countKecil || 0), 0);
    const totalCountBesar = originalMenus.reduce((sum: number, m: any) => sum + (m.countBesar || 0), 0);
    const totalCountBumil = originalMenus.reduce((sum: number, m: any) => sum + (m.countBumil || 0), 0);
    const totalCountBalita = originalMenus.reduce((sum: number, m: any) => sum + (m.countBalita || 0), 0);

    // Nutrition Data Aggregation (taking the one with values, usually only one type has it per category or they are merged)
    // Actually, for grouped view, let's just show the first available data for each category from any menu in the group
    const aggregatedNutrition: Record<string, any> = {};
    originalMenus.forEach((m: any) => {
        if (m.nutritionData) {
            Object.entries(m.nutritionData).forEach(([cat, data]) => {
                if (!aggregatedNutrition[cat]) aggregatedNutrition[cat] = data;
            });
        }
    });

    const allIngredients = originalMenus.flatMap((m: any) => m.ingredients || []);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mr-8">
                        <DialogTitle className="text-xl flex flex-wrap items-center gap-2">
                            {menu.name}
                            {isGrouped ? (
                                <Badge className="bg-blue-600 text-white border-blue-700">GABUNGAN</Badge>
                            ) : (
                                <Badge variant={menu.menuType === 'KERING' ? 'default' : 'secondary'} className={cn(
                                    "text-xs",
                                    menu.menuType === 'KERING' ? "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200" : "bg-primary/20 text-primary border-primary/20"
                                )}>
                                    {menu.menuType === 'KERING' ? 'PAKET KERING' : 'MENU OMPRENG'}
                                </Badge>
                            )}
                        </DialogTitle>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <Calendar className="h-3 w-3" />
                            {(() => {
                                try {
                                    return format(new Date(menu.menuDate || menu.date), 'dd MMMM yyyy', { locale: id });
                                } catch (e) {
                                    return 'Tanggal tidak valid';
                                }
                            })()}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-8 py-4">
                    {/* Daily Summary (Grand Total) */}
                    <div className="space-y-2">
                        <p className="text-[11px] font-bold text-primary flex items-center gap-2 uppercase tracking-wide">
                            <Users2 className="h-4 w-4" /> Total Sasaran Hari Ini (Gabungan)
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Porsi Besar = Besar + Bumil */}
                            <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg">
                                <p className="text-[9px] text-primary font-bold uppercase tracking-tighter mb-1">Porsi Besar (SD/SMP/SMA)</p>
                                <p className="text-[2xl] font-black text-primary leading-none">{totalCountBesar + totalCountBumil}</p>
                                {totalCountBumil > 0 && (
                                    <div className="mt-1.5 flex items-center gap-1">
                                        <span className="text-[8px] bg-pink-100 text-pink-700 border border-pink-200 px-1.5 py-0.5 rounded font-bold">Bumil/Busui: {totalCountBumil}</span>
                                    </div>
                                )}
                            </div>
                            {/* Porsi Kecil = Kecil + Balita */}
                            <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-lg">
                                <p className="text-[9px] text-blue-600 font-bold uppercase tracking-tighter mb-1">Porsi Kecil (PAUD/TK/SD 1-3)</p>
                                <p className="text-2xl font-black text-blue-700 leading-none">{totalCountKecil + totalCountBalita}</p>
                                {totalCountBalita > 0 && (
                                    <div className="mt-1.5 flex items-center gap-1">
                                        <span className="text-[8px] bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded font-bold">Balita: {totalCountBalita}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="text-right text-[10px] text-muted-foreground">
                            Total Pax: <span className="font-black text-foreground">{totalCountBesar + totalCountBumil + totalCountKecil + totalCountBalita}</span>
                        </p>
                    </div>

                    {/* Each Menu Section */}
                    {originalMenus.map((m: any, mIdx: number) => {
                        const mIngredients = m.ingredients || [];
                        const mNutrition = m.nutritionData || {};
                        const mTotalPax = (m.countKecil || 0) + (m.countBesar || 0) + (m.countBumil || 0) + (m.countBalita || 0);

                        return (
                            <div key={mIdx} className="space-y-6 relative">
                                {mIdx > 0 && <div className="border-t border-dashed border-border mt-8 pt-8" />}

                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                m.menuType === 'KERING' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                            )}>
                                                {m.menuType === 'KERING' ? <Utensils className="h-5 w-5" /> : <Utensils className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-lg font-bold text-foreground leading-tight">{m.name}</h4>
                                                    <Badge variant="secondary" className="text-[10px] h-5 bg-muted text-muted-foreground font-bold">
                                                        {mTotalPax} Pax
                                                    </Badge>
                                                </div>
                                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                                                    {m.menuType === 'KERING' ? 'Snack (Paket Kering)' : 'Masakan (Menu Ompreng)'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {m.description && (
                                        <div className="bg-secondary/20 p-3 rounded-xl border border-dashed text-sm text-muted-foreground">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Catatan Tambahan:</p>
                                            <p className="italic whitespace-pre-wrap">"{m.description}"</p>
                                        </div>
                                    )}

                                    {/* Portion Breakdown for this Menu — Consolidated 2-tile */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-primary/5 border border-primary/20 p-2.5 rounded-lg">
                                            <p className="text-[9px] text-primary font-bold uppercase tracking-tighter">Porsi Besar (SD/SMP/SMA)</p>
                                            <p className="text-lg font-black text-primary">{(m.countBesar || 0) + (m.countBumil || 0)} <span className="text-[10px] font-normal">Pax</span></p>
                                            {(m.countBumil > 0) && (
                                                <span className="text-[8px] bg-pink-100 text-pink-700 border border-pink-200 px-1 py-0.5 rounded font-bold mt-1 inline-block">Bumil / Busui: {m.countBumil}</span>
                                            )}
                                        </div>
                                        <div className="bg-blue-50/50 border border-blue-200 p-2.5 rounded-lg">
                                            <p className="text-[9px] text-blue-600 font-bold uppercase tracking-tighter">Porsi Kecil (PAUD/TK/SD 1-3)</p>
                                            <p className="text-lg font-black text-blue-700">{(m.countKecil || 0) + (m.countBalita || 0)} <span className="text-[10px] font-normal">Pax</span></p>
                                            {(m.countBalita > 0) && (
                                                <span className="text-[8px] bg-orange-100 text-orange-700 border border-orange-200 px-1 py-0.5 rounded font-bold mt-1 inline-block">Balita: {m.countBalita}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Nutrition for this Menu */}
                                    {Object.keys(mNutrition).length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                                                <FileText className="h-3 w-3" /> Kandungan Gizi per Kategori (Target)
                                            </p>
                                            <div className="space-y-2">
                                                {Object.entries(mNutrition)
                                                    .filter(([category]) => {
                                                        // Hide 'bumil' row if its values are identical to 'besar' (not overridden)
                                                        if (category === 'bumil' && mNutrition['besar']) {
                                                            const b = mNutrition['besar'] as any;
                                                            const bm = mNutrition['bumil'] as any;
                                                            return !(b.energi == bm.energi && b.protein == bm.protein && b.lemak == bm.lemak && b.karbo == bm.karbo);
                                                        }
                                                        // Hide 'balita' row if identical to 'kecil'
                                                        if (category === 'balita' && mNutrition['kecil']) {
                                                            const k = mNutrition['kecil'] as any;
                                                            const bt = mNutrition['balita'] as any;
                                                            return !(k.energi == bt.energi && k.protein == bt.protein && k.lemak == bt.lemak && k.karbo == bt.karbo);
                                                        }
                                                        return true;
                                                    })
                                                    .map(([category, data]: [string, any]) => {
                                                        // Context-aware labels
                                                        const bumilSameAsBesar = mNutrition['bumil'] && mNutrition['besar'] && (() => {
                                                            const b = mNutrition['besar'] as any; const bm = mNutrition['bumil'] as any;
                                                            return b.energi == bm.energi && b.protein == bm.protein && b.lemak == bm.lemak && b.karbo == bm.karbo;
                                                        })();
                                                        const balitaSameAsKecil = mNutrition['balita'] && mNutrition['kecil'] && (() => {
                                                            const k = mNutrition['kecil'] as any; const bt = mNutrition['balita'] as any;
                                                            return k.energi == bt.energi && k.protein == bt.protein && k.lemak == bt.lemak && k.karbo == bt.karbo;
                                                        })();

                                                        const catLabels: Record<string, string> = {
                                                            besar: bumilSameAsBesar ? 'Porsi Besar (termasuk Bumil/Busui)' : 'Porsi Besar — SD 4-6/SMP/SMA',
                                                            kecil: balitaSameAsKecil ? 'Porsi Kecil (termasuk Balita)' : 'Porsi Kecil — PAUD/TK/SD 1-3',
                                                            bumil: 'Bumil / Busui',
                                                            balita: 'Balita'
                                                        };

                                                        const catStyles: Record<string, string> = {
                                                            besar: 'bg-primary/5 border-primary/10 text-primary',
                                                            kecil: 'bg-blue-50 border-blue-100 text-blue-700',
                                                            bumil: 'bg-pink-50 border-pink-200 text-pink-700',
                                                            balita: 'bg-orange-50 border-orange-200 text-orange-700'
                                                        };

                                                        return (
                                                            <div key={category} className={cn(
                                                                "flex flex-col md:flex-row md:items-center justify-between p-3 rounded-xl border gap-3 transition-colors hover:bg-muted/30",
                                                                catStyles[category] || "bg-muted/5 border-muted"
                                                            )}>
                                                                <div className="flex items-center gap-3 min-w-[180px]">
                                                                    <div className="w-1.5 h-6 rounded-full bg-current opacity-40 shrink-0" />
                                                                    <span className="font-bold text-sm tracking-tight">
                                                                        {catLabels[category] || category.toUpperCase()}
                                                                    </span>
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="p-1.5 bg-white/60 rounded-lg border border-white/40 shadow-sm">
                                                                            <Zap className="h-3 w-3 text-amber-600" />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[9px] uppercase font-bold opacity-60">Energi</span>
                                                                            <p className="text-sm font-black leading-none">{data.energi || 0} <span className="text-[10px] font-normal opacity-70">Kal</span></p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <div className="p-1.5 bg-white/60 rounded-lg border border-white/40 shadow-sm">
                                                                            <Beef className="h-3 w-3 text-red-600" />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[9px] uppercase font-bold opacity-60">Protein</span>
                                                                            <p className="text-sm font-black leading-none">{data.protein || 0} <span className="text-[10px] font-normal opacity-70">gr</span></p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <div className="p-1.5 bg-white/60 rounded-lg border border-white/40 shadow-sm">
                                                                            <Droplets className="h-3 w-3 text-blue-600" />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[9px] uppercase font-bold opacity-60">Lemak</span>
                                                                            <p className="text-sm font-black leading-none">{data.lemak || 0} <span className="text-[10px] font-normal opacity-70">gr</span></p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <div className="p-1.5 bg-white/60 rounded-lg border border-white/40 shadow-sm">
                                                                            <Waves className="h-3 w-3 text-green-600" />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[9px] uppercase font-bold opacity-60">Karbo</span>
                                                                            <p className="text-sm font-black leading-none">{data.karbo || 0} <span className="text-[10px] font-normal opacity-70">gr</span></p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Ingredient Table for this Menu */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                                            <Utensils className="h-3 w-3" /> Komposisi Bahan Baku
                                        </p>
                                        <div className="border rounded-md overflow-hidden bg-background shadow-sm">
                                            <table className="w-full text-sm text-left border-collapse">
                                                <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                                                    <tr>
                                                        <th className="px-4 py-2 border-b">Nama Bahan</th>
                                                        <th className="px-4 py-2 border-b text-right">Gramasi/porsi</th>
                                                        <th className="px-4 py-2 border-b text-right">Total</th>
                                                        <th className="px-4 py-2 border-b text-center">Satuan</th>
                                                        <th className="px-4 py-2 border-b">Evaluasi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border text-[11px]">
                                                    {mIngredients.map((ing: any, idx: number) => {
                                                        const formattedQty = formatRecipeQty(ing.qtyNeeded, ing.unit);
                                                        const gramasiPerPorsi = ing.gramasi;
                                                        return (
                                                            <tr key={`${ing.id}-${idx}`} className="hover:bg-muted/20">
                                                                <td className="px-4 py-2 font-medium text-foreground">{ing.name}</td>
                                                                <td className="px-4 py-2 text-right text-muted-foreground whitespace-nowrap">
                                                                    {gramasiPerPorsi ? `${formatRecipeQty(gramasiPerPorsi, ing.unit).stringValue} ${formatRecipeQty(gramasiPerPorsi, ing.unit).unit}` : '-'}
                                                                </td>
                                                                <td className="px-4 py-2 text-right font-bold text-primary">{formattedQty.stringValue}</td>
                                                                <td className="px-4 py-2 text-center text-muted-foreground">{formattedQty.unit}</td>
                                                                <td className="px-4 py-2">
                                                                    <div className="flex items-center gap-2">
                                                                        {ing.evaluationStatus && (
                                                                            <Badge variant="outline" className={cn(
                                                                                "text-[9px] uppercase font-bold px-1.5 py-0",
                                                                                ing.evaluationStatus === 'PAS' && "text-green-600 border-green-200 bg-green-50",
                                                                                ing.evaluationStatus === 'KURANG' && "text-red-600 border-red-200 bg-red-50",
                                                                                ing.evaluationStatus === 'BERLEBIH' && "text-orange-600 border-orange-200 bg-orange-50",
                                                                            )}>
                                                                                {ing.evaluationStatus}
                                                                            </Badge>
                                                                        )}
                                                                        {ing.evaluationNote && (
                                                                            <span className="text-[9px] text-muted-foreground italic truncate max-w-[100px]" title={ing.evaluationNote}>
                                                                                "{ing.evaluationNote}"
                                                                            </span>
                                                                        )}
                                                                        {!ing.evaluationStatus && !ing.evaluationNote && <span className="text-muted-foreground">-</span>}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                    {mIngredients.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic bg-muted/5">
                                                                Tidak ada log bahan baku yang tercatat.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Edit History Section */}
                {originalMenus.some((m: any) => m.editHistory && m.editHistory.length > 0) && (
                    <div className="space-y-3 pt-4 border-t px-1">
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                            <FileText className="h-3 w-3" /> Riwayat Perubahan (Edit History)
                        </p>
                        <div className="space-y-2">
                            {originalMenus.map((m: any) => {
                                if (!m.editHistory || m.editHistory.length === 0) return null;
                                return m.editHistory.map((history: any, hIdx: number) => (
                                    <div key={`${m.id}-hist-${hIdx}`} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border text-[11px]">
                                        <div className="p-1.5 bg-background rounded-md border shadow-sm shrink-0">
                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="font-semibold text-foreground text-sm">
                                                Diedit oleh: <span className="text-primary">{history.editorName}</span> <Badge variant="outline" className="text-[8px] h-4 px-1 ml-1">{history.editorRole}</Badge>
                                            </div>
                                            <p className="text-muted-foreground">
                                                Pada: {format(new Date(history.timestamp), 'dd MMM yyyy HH:mm', { locale: id })}
                                            </p>
                                            {isGrouped && (
                                                <p className="text-muted-foreground mt-1 text-[10px] italic">
                                                    Bagian: {m.menuType === 'KERING' ? 'Paket Kering' : 'Menu Masak'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ));
                            })}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
