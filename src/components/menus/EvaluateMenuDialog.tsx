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
import { cn } from '@/lib/utils';

interface EvaluateMenuDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    menu: any;
    onSuccess: () => void;
}

type EvalStatus = 'PAS' | 'KURANG' | 'BERLEBIH';

interface IngredientEval {
    ingredientId: string;
    evaluationStatus: EvalStatus;
    evaluationNote: string;
}

export function EvaluateMenuDialog({ open, onOpenChange, menu, onSuccess }: EvaluateMenuDialogProps) {
    const [evaluations, setEvaluations] = useState<IngredientEval[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && menu && menu.ingredients) {
            const initialEvals = menu.ingredients.map((ing: any) => ({
                ingredientId: ing.id,
                evaluationStatus: ing.evaluationStatus || 'PAS',
                evaluationNote: ing.evaluationNote || ''
            }));
            setEvaluations(initialEvals);
        }
    }, [open, menu]);

    const handleStatusChange = (ingredientId: string, status: EvalStatus) => {
        setEvaluations(prev => prev.map(ev =>
            ev.ingredientId === ingredientId ? { ...ev, evaluationStatus: status } : ev
        ));
    };

    const handleNoteChange = (ingredientId: string, note: string) => {
        setEvaluations(prev => prev.map(ev =>
            ev.ingredientId === ingredientId ? { ...ev, evaluationNote: note } : ev
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload = evaluations.map(ev => ({
            ingredientId: ev.ingredientId,
            evaluationStatus: ev.evaluationStatus,
            evaluationNote: ev.evaluationNote.trim() === '' ? undefined : ev.evaluationNote
        }));

        const res = await evaluateMenuIngredients(menu.id, payload);
        setLoading(false);

        if (res.success) {
            toast.success('Evaluasi bahan berhasil disimpan');
            onOpenChange(false);
            onSuccess();
        } else {
            toast.error(res.error || 'Gagal menyimpan evaluasi');
        }
    };

    if (!menu) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[95vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl">Evaluasi & Pembanding Bahan</DialogTitle>
                    <DialogDescription className="text-base">
                        Bandingkan pemakaian aktual dengan standar gramasi untuk menu <b>{menu.name}</b>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 space-y-4 py-4 bg-muted/5">
                        {menu.ingredients.map((ing: any) => {
                            const currentEval = evaluations.find(e => e.ingredientId === ing.id);
                            const status = currentEval?.evaluationStatus || 'PAS';
                            const standardGramasi = ing.gramasi;

                            return (
                                <div key={ing.id} className={cn(
                                    "p-4 border-2 rounded-xl transition-all duration-200 bg-card",
                                    status === 'PAS' && "border-green-100 hover:border-green-200",
                                    status === 'KURANG' && "border-red-100 hover:border-red-200",
                                    status === 'BERLEBIH' && "border-blue-100 hover:border-blue-200"
                                )}>
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        {/* Left: Ingredient Info & Target */}
                                        <div className="flex-1 space-y-1">
                                            <h4 className="font-bold text-lg text-foreground">{ing.name}</h4>
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="flex items-center text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                                    <Scale className="h-3 w-3 mr-1" />
                                                    Target: <span className="font-semibold text-foreground ml-1">{standardGramasi ? `${standardGramasi} ${ing.unit}/porsi` : '-'}</span>
                                                </div>
                                                <div className="text-muted-foreground font-medium">
                                                    Total Sah: <span className="text-primary">{ing.qtyNeeded} {ing.unit}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Status Selector */}
                                        <div className="flex gap-1 bg-muted p-1 rounded-lg h-fit">
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange(ing.id, 'KURANG')}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                                    status === 'KURANG' ? "bg-red-500 text-white shadow-sm" : "text-muted-foreground hover:bg-muted-foreground/10"
                                                )}
                                            >
                                                <ArrowDown className="h-3 w-3" /> KURANG
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange(ing.id, 'PAS')}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                                    status === 'PAS' ? "bg-green-600 text-white shadow-sm" : "text-muted-foreground hover:bg-muted-foreground/10"
                                                )}
                                            >
                                                <Check className="h-3 w-3" /> PAS
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange(ing.id, 'BERLEBIH')}
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
                                            onChange={(e) => handleNoteChange(ing.id, e.target.value)}
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
