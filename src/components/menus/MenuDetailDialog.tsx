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
import { Calendar, Utensils, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    menu: any; // Using any for now to match strict page types
}

export function MenuDetailDialog({ open, onOpenChange, menu }: MenuDetailDialogProps) {
    if (!menu) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <div className="flex items-center justify-between mr-8">
                        <DialogTitle className="text-xl">{menu.name}</DialogTitle>
                        <Badge variant="outline" className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(menu.menuDate), 'dd MMMM yyyy', { locale: id })}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Description Section */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                            <FileText className="h-4 w-4" /> Deskripsi
                        </h4>
                        <div className="text-sm text-muted-foreground bg-secondary/20 p-3 rounded-md border">
                            {menu.description || 'Tidak ada deskripsi untuk menu ini.'}
                        </div>
                    </div>

                    {/* Ingredients Section */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                            <Utensils className="h-4 w-4" /> Komposisi Bahan
                        </h4>
                        <div className="border rounded-md overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-secondary text-secondary-foreground">
                                    <tr>
                                        <th className="px-4 py-2 font-medium">Bahan</th>
                                        <th className="px-4 py-2 font-medium text-right">Jumlah</th>
                                        <th className="px-4 py-2 font-medium text-center">Satuan</th>
                                        <th className="px-4 py-2 font-medium">Status / Catatan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {menu.ingredients.map((ing: any) => (
                                        <tr key={ing.id} className="hover:bg-muted/50">
                                            <td className="px-4 py-2">{ing.name}</td>
                                            <td className="px-4 py-2 text-right font-medium">{ing.qtyNeeded}</td>
                                            <td className="px-4 py-2 text-center text-muted-foreground">{ing.unit}</td>
                                            <td className="px-4 py-2">
                                                <div className="space-y-1">
                                                    {ing.evaluationStatus && (
                                                        <Badge variant="outline" className={cn(
                                                            "text-[10px] uppercase font-bold",
                                                            ing.evaluationStatus === 'PAS' && "text-green-600 border-green-200 bg-green-50",
                                                            ing.evaluationStatus === 'KURANG' && "text-red-600 border-red-200 bg-red-50",
                                                            ing.evaluationStatus === 'BERLEBIH' && "text-orange-600 border-orange-200 bg-orange-50",
                                                        )}>
                                                            {ing.evaluationStatus}
                                                        </Badge>
                                                    )}
                                                    {ing.evaluationNote && (
                                                        <p className="text-[10px] text-muted-foreground leading-tight italic">
                                                            "{ing.evaluationNote}"
                                                        </p>
                                                    )}
                                                    {!ing.evaluationStatus && !ing.evaluationNote && (
                                                        <span className="text-[10px] text-muted-foreground italic">-</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {menu.ingredients.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground italic">
                                                Tidak ada bahan yang tercatat.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
