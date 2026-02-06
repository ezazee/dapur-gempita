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
import { format } from 'date-fns';

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
                            Informasi lengkap produksi masakan
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Production Info */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                            <div>
                                <p className="text-sm text-muted-foreground">Menu</p>
                                <p className="font-semibold">{production.menuName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Tanggal</p>
                                <p className="font-semibold">
                                    {format(new Date(production.date), 'dd MMMM yyyy, HH:mm')}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Jumlah Porsi</p>
                                <Badge variant="secondary" className="mt-1">
                                    {production.portions} Porsi
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Chef</p>
                                <p className="font-semibold">{production.chefName || 'Unknown'}</p>
                            </div>
                        </div>

                        {/* Photo */}
                        {production.photoUrl && (
                            <div>
                                <p className="text-sm font-medium mb-2">Foto Hasil Masakan</p>
                                <div
                                    className="relative h-64 w-full cursor-pointer rounded-md overflow-hidden border"
                                    onClick={() => setLightboxImage(production.photoUrl)}
                                >
                                    <img
                                        src={production.photoUrl}
                                        alt="Foto masakan"
                                        className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Items Used */}
                        {production.items && production.items.length > 0 && (
                            <div>
                                <p className="text-sm font-medium mb-2">Bahan yang Digunakan</p>
                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Bahan</TableHead>
                                                <TableHead className="text-right">Qty Digunakan</TableHead>
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
                                <p className="text-sm font-medium mb-2">Catatan</p>
                                <div className="p-3 bg-muted rounded-md">
                                    <p className="text-sm">{production.note}</p>
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
                            <img
                                src={lightboxImage}
                                alt="Foto masakan"
                                className="max-w-full max-h-[80vh] object-contain rounded"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
