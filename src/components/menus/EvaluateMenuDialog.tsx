'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { evaluateMenuIngredients } from '@/app/actions/menus';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowDown, ArrowUp, MessageSquare, Scale } from 'lucide-react';
import { cn, formatRecipeQty } from '@/lib/utils';

interface EvaluateMenuDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    menu: any;
    onSuccess: () => void;
}

type EvalStatus = 'PAS' | 'KURANG' | 'BERLEBIH';

interface IngredientEval {
    miId: string;
    menuId?: string; // Track which menu this miId belongs to
    evaluationStatus: EvalStatus;
    evaluationNote: string;
}

export function EvaluateMenuDialog({ open, onOpenChange, menu, onSuccess }: EvaluateMenuDialogProps) {
    const [evaluations, setEvaluations] = useState<IngredientEval[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeSubMenuId, setActiveSubMenuId] = useState<string | null>(null);

    useEffect(() => {
        if (open && menu) {
            const ingredients = menu.ingredients || [];
            const initialEvals = ingredients.map((ing: any) => ({
                miId: ing.miId,
                menuId: ing.menuId,
                evaluationStatus: ing.evaluationStatus || 'PAS',
                evaluationNote: ing.evaluationNote || ''
            }));
            setEvaluations(initialEvals);

            // Set initial active sub-menu
            if (menu.originalMenus && menu.originalMenus.length > 0) {
                const initialSub = menu.originalMenus.find((m: any) => m.menuType === 'OMPRENG') || menu.originalMenus[0];
                setActiveSubMenuId(initialSub.id);
            } else {
                setActiveSubMenuId(menu.id);
            }
        }
    }, [open, menu]);

    const handleStatusChange = (miId: string, status: EvalStatus) => {
        setEvaluations(prev => prev.map(ev =>
            ev.miId === miId ? { ...ev, evaluationStatus: status } : ev
        ));
    };

    const handleNoteChange = (miId: string, note: string) => {
        setEvaluations(prev => prev.map(ev =>
            ev.miId === miId ? { ...ev, evaluationNote: note } : ev
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        let hasError = false;
        const originalMenus = menu.originalMenus || [menu];

        for (const m of originalMenus) {
            // Filter evaluations belonging to THIS menu
            const menuSpecificEvals = evaluations
                .filter(ev => {
                    // Try to match by menuId if present, or assume if it's a singleton
                    if (originalMenus.length === 1) return true;
                    // For grouped menus, we need to know which miId belongs to which menuId
                    // We'll rely on the miId being unique globally and found in the DB for this menu
                    return true; // We'll send ALL, and the server will only update those found for this menuId
                })
                .map(ev => ({
                    miId: ev.miId,
                    evaluationStatus: ev.evaluationStatus,
                    evaluationNote: ev.evaluationNote.trim() === '' ? undefined : ev.evaluationNote
                }));

            const res = await evaluateMenuIngredients(m.id, menuSpecificEvals);
            if (!res.success) {
                hasError = true;
            }
        }

        setLoading(false);

        if (!hasError) {
            toast.success('Evaluasi bahan berhasil disimpan');
            onOpenChange(false);
            onSuccess();
        } else {
            toast.error('Gagal menyimpan beberapa atau seluruh evaluasi');
        }
    };

    if (!menu) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[95vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl">Evaluasi & Pembanding Bahan</DialogTitle>
                    <DialogDescription className="text-base" asChild>
                        <div className="space-y-4">
                            <p>Bandingkan pemakaian aktual dengan standar gramasi untuk menu <b>{menu.name}</b>.</p>

                            {menu.originalMenus && menu.originalMenus.length > 1 && (
                                <div className="flex gap-2 p-1 bg-muted rounded-lg mt-4 max-w-md">
                                    {menu.originalMenus.map((m: any) => {
                                        // Label logic: Prefix type to make it unique and descriptive
                                        const typeName = m.menuType === 'OMPRENG' ? 'Masak' : 'Kering';
                                        const label = `${typeName}: ${m.name}`;

                                        return (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => setActiveSubMenuId(m.id)}
                                                className={cn(
                                                    "flex-1 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all truncate min-w-0 max-w-[200px]",
                                                    activeSubMenuId === m.id ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:bg-white/50"
                                                )}
                                                title={label}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-blue-600">Kecil: {menu.countKecil || 0}</span>
                                <span className="text-primary">Besar: {menu.countBesar || 0}</span>
                                <span className="text-pink-600">Bumil / Busui: {menu.countBumil || 0}</span>
                                <span className="text-orange-600">Balita: {menu.countBalita || 0}</span>
                            </div>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 space-y-4 py-4 bg-muted/5">
                        {menu.ingredients
                            .filter((ing: any) => !activeSubMenuId || ing.menuId === activeSubMenuId)
                            .map((ing: any, idx: number) => {
                                const currentEval = evaluations.find(e => e.miId === ing.miId);
                                const status = currentEval?.evaluationStatus || 'PAS';
                                const standardGramasi = ing.gramasi;

                                return (
                                    <div key={ing.miId || idx} className={cn(
                                        "p-4 border-2 rounded-xl transition-all duration-200 bg-card",
                                        status === 'PAS' && "border-green-100 hover:border-green-200",
                                        status === 'KURANG' && "border-red-100 hover:border-red-200",
                                        status === 'BERLEBIH' && "border-blue-100 hover:border-blue-200"
                                    )}>
                                        <div className="flex flex-col md:flex-row justify-between gap-4">
                                            {/* Left: Ingredient Info & Target */}
                                            <div className="flex-1 space-y-1">
                                                <h4 className="font-bold text-lg text-foreground">{ing.name}</h4>
                                                <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
                                                    <div className="flex items-center text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                                                        <Scale className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                                                        <span>Target:</span>
                                                        <span className="font-semibold text-foreground ml-1.5 whitespace-nowrap">
                                                            {standardGramasi ? `${formatRecipeQty(standardGramasi, ing.unit).stringValue} ${formatRecipeQty(standardGramasi, ing.unit).unit}/porsi` : '-'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center text-muted-foreground font-medium px-2 py-1">
                                                        <span>Total Sah:</span>
                                                        <span className="text-primary font-bold ml-1.5 whitespace-nowrap">
                                                            {formatRecipeQty(ing.qtyNeeded, ing.unit).stringValue} {formatRecipeQty(ing.qtyNeeded, ing.unit).unit}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Status Selector */}
                                            <div className="flex gap-1 bg-muted p-1 rounded-lg h-fit">
                                                <button
                                                    type="button"
                                                    onClick={() => handleStatusChange(ing.miId, 'KURANG')}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                                        status === 'KURANG' ? "bg-red-500 text-white shadow-sm" : "text-muted-foreground hover:bg-muted-foreground/10"
                                                    )}
                                                >
                                                    <ArrowDown className="h-3 w-3" /> KURANG
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleStatusChange(ing.miId, 'PAS')}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                                        status === 'PAS' ? "bg-green-600 text-white shadow-sm" : "text-muted-foreground hover:bg-muted-foreground/10"
                                                    )}
                                                >
                                                    <Check className="h-3 w-3" /> PAS
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleStatusChange(ing.miId, 'BERLEBIH')}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                                        status === 'BERLEBIH' ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:bg-muted-foreground/10"
                                                    )}
                                                >
                                                    <ArrowUp className="h-3 w-3" /> BERLEBIH
                                                </button>
                                            </div>
                                        </div>

                                        {/* Note Input */}
                                        <div className="mt-4 relative">
                                            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                            <Input
                                                placeholder="Tambah catatan untuk bahan ini..."
                                                value={currentEval?.evaluationNote || ''}
                                                onChange={(e) => handleNoteChange(ing.miId, e.target.value)}
                                                className="h-10 pl-9 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    <DialogFooter className="p-6 border-t bg-card">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Batal
                        </Button>
                        <Button type="submit" size="lg" className="px-8" disabled={loading}>
                            {loading ? 'Menyimpan...' : 'Simpan Seluruh Evaluasi'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
