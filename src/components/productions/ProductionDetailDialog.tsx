'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { format } from 'date-fns';
import { ChefHat, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductionDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    production: any;
}

export function ProductionDetailDialog({ open, onOpenChange, production }: ProductionDetailDialogProps) {
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    if (!production) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detail Produksi</DialogTitle>
                        <DialogDescription>
                            Informasi lengkap produksi {production.menuType === 'KERING' ? 'snack/kering' : 'masakan/ompreng'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Production Info */}
                        <div className={cn(
                            "grid grid-cols-2 gap-4 p-5 rounded-2xl border-2 transition-all",
                            production.menuType === 'KERING'
                                ? "bg-amber-50/50 border-amber-100"
                                : "bg-blue-50/50 border-blue-100"
                        )}>
                            <div className="col-span-2 flex justify-between items-center mb-2">
                                <Badge variant={production.menuType === 'KERING' ? 'outline' : 'secondary'} className={cn(
                                    "text-[10px] font-bold uppercase",
                                    production.menuType === 'KERING' ? "border-amber-200 text-amber-700 bg-amber-50" : "bg-blue-100 text-blue-700 font-black"
                                )}>
                                    {production.menuType === 'KERING' ? '🍪 Snack / Kering' : '🥘 Menu Masak (Ompreng)'}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground font-medium">ID: {production.id?.substring(0, 8)}</span>
                            </div>
                            <div className="border-t border-dashed col-span-2 my-1 opacity-50" />
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Menu</p>
                                <p className="font-bold text-lg leading-tight">{production.menuName}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Tanggal</p>
                                <p className="font-semibold text-sm">
                                    {(() => {
                                        try {
                                            return format(new Date(production.date || production.productionDate), 'dd MMMM yyyy');
                                        } catch (e) {
                                            return 'Tanggal tidak valid';
                                        }
                                    })()}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                    Jam: {(() => {
                                        try {
                                            return format(new Date(production.date || production.productionDate), 'HH:mm');
                                        } catch (e) {
                                            return '--:--';
                                        }
                                    })()}
                                </p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Jumlah Realisasi Porsi</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    <div className="flex flex-col items-center justify-center px-3 py-1 bg-blue-50 border border-blue-100 rounded text-[10px] font-bold">
                                        <span className="text-blue-600 uppercase tracking-tighter">Porsi Kecil</span>
                                        <span className="text-sm font-black text-blue-700">{production.countKecil || 0}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center px-3 py-1 bg-primary/5 border border-primary/10 rounded text-[10px] font-bold">
                                        <span className="text-primary uppercase tracking-tighter">Porsi Besar</span>
                                        <span className="text-sm font-black text-primary">{production.countBesar || 0}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center px-3 py-1 bg-pink-50 border border-pink-100 rounded text-[10px] font-bold">
                                        <span className="text-pink-600 uppercase tracking-tighter">Bumil / Busui</span>
                                        <span className="text-sm font-black text-pink-700">{production.countBumil || 0}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center px-3 py-1 bg-orange-50 border border-orange-100 rounded text-[10px] font-bold">
                                        <span className="text-orange-600 uppercase tracking-tighter">Balita</span>
                                        <span className="text-sm font-black text-orange-700">{production.countBalita || 0}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center px-3 py-1 bg-muted border rounded text-[10px] font-bold">
                                        <span className="text-muted-foreground uppercase tracking-tighter">Total</span>
                                        <span className="text-sm font-black">{production.portions}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-2">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Chef Pelaksana</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center text-xs font-bold text-primary shadow-sm">
                                        {(production.chefName || 'U')[0]}
                                    </div>
                                    <p className="font-bold text-sm">{production.chefName || 'Unknown'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Cooking Instructions (Tata Cara Masak) */}
                        {production.description && (
                            <div className={cn(
                                "p-4 rounded-xl border-l-4 shadow-sm",
                                production.menuType === 'KERING'
                                    ? "bg-amber-50/30 border-amber-400 border-y border-r"
                                    : "bg-blue-50/30 border-blue-400 border-y border-r"
                            )}>
                                <h4 className={cn(
                                    "text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2",
                                    production.menuType === 'KERING' ? "text-amber-700" : "text-blue-700"
                                )}>
                                    <ChefHat className="h-3.5 w-3.5" /> Tata Cara Masak / Catatan Ahli Gizi
                                </h4>
                                <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap pl-5 italic border-l border-muted">
                                    {production.description}
                                </div>
                            </div>
                        )}

                        {/* Photo */}
                        {production.photoUrl && (
                            <div>
                                <p className="text-sm font-medium mb-2">Foto Hasil Masakan</p>
                                <div
                                    className="relative h-64 w-full cursor-pointer rounded-md overflow-hidden border"
                                    onClick={() => setLightboxImage(production.photoUrl)}
                                >
                                    <Image
                                        src={production.photoUrl}
                                        alt="Foto masakan"
                                        fill
                                        className="object-cover hover:opacity-90 transition-opacity"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Items Used */}
                        {production.items && production.items.length > 0 && (
                            <div>
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Utensils className="h-3.5 w-3.5 text-primary" /> Bahan yang Digunakan
                                </h4>
                                <div className="border rounded-xl overflow-hidden shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow className="hover:bg-transparent border-b-2">
                                                <TableHead className="text-[10px] font-black uppercase h-8">Bahan</TableHead>
                                                <TableHead className="text-right text-[10px] font-black uppercase h-8">Qty Digunakan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {production.items.map((item: any, idx: number) => (
                                                <TableRow key={idx}>
                                                    <TableCell>{item.ingredientName}</TableCell>
                                                    <TableCell className="text-right">
                                                        {item.qtyUsed} {item.unit}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {production.note && (
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Catatan</p>
                                <div className="p-3 bg-muted rounded-md border text-sm italic">
                                    {production.note}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Lightbox for photo */}
            {lightboxImage && (
                <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
                    <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-0">
                        <DialogHeader className="p-4 pb-2">
                            <DialogTitle>Foto Hasil Masakan</DialogTitle>
                        </DialogHeader>
                        <div className="flex items-center justify-center p-4 pt-0">
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/50">
                                <Image
                                    src={lightboxImage}
                                    alt="Foto masakan"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
