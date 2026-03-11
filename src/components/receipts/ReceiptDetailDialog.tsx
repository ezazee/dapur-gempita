'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { cn, formatRecipeQty, formatMemo } from '@/lib/utils';

interface ReceiptDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    receipt: any;
}

export function ReceiptDetailDialog({ open, onOpenChange, receipt }: ReceiptDetailDialogProps) {
    const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

    if (!receipt) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detail Penerimaan Barang</DialogTitle>
                        <DialogDescription>
                            Informasi lengkap penerimaan barang yang sudah dikonfirmasi
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Receipt Info */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                            <div>
                                <p className="text-sm text-muted-foreground">Tanggal Penerimaan</p>
                                <p className="font-medium">
                                    {(() => {
                                        try {
                                            return format(new Date(receipt.date || receipt.receivedAt), 'dd MMMM yyyy, HH:mm');
                                        } catch (e) {
                                            return 'Tanggal tidak valid';
                                        }
                                    })()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Diterima Oleh</p>
                                <p className="font-medium">{receipt.receiverName || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                    {receipt.status}
                                </Badge>
                            </div>
                            {receipt.note && (
                                <div className="col-span-2">
                                    <p className="text-sm text-muted-foreground">Catatan</p>
                                    <p className="font-medium">{formatMemo(receipt.note)}</p>
                                </div>
                            )}
                        </div>

                        {/* Items Table */}
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama Bahan</TableHead>
                                        <TableHead className="text-center">Berat Kotor</TableHead>
                                        <TableHead className="text-center">Berat Bersih</TableHead>
                                        <TableHead className="text-center">Foto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {receipt.items?.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.ingredientName}</TableCell>
                                            <TableCell className="text-center">
                                                {formatRecipeQty(item.grossWeight, item.unit).stringValue} {formatRecipeQty(item.grossWeight, item.unit).unit}
                                            </TableCell>
                                            <TableCell className={cn("text-center font-semibold", item.netWeight <= 0 ? "text-destructive" : "text-green-600")}>
                                                {formatRecipeQty(item.netWeight, item.unit).stringValue} {formatRecipeQty(item.netWeight, item.unit).unit}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.photoUrl ? (
                                                    <img
                                                        src={item.photoUrl}
                                                        alt={item.ingredientName}
                                                        className="w-16 h-16 object-cover rounded cursor-pointer mx-auto hover:opacity-80"
                                                        onClick={() => setLightboxImage({ url: item.photoUrl, name: item.ingredientName })}
                                                    />
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">-</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lightbox for viewing photos */}
            <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
                <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-0">
                    <DialogHeader className="p-4 pb-2">
                        <DialogTitle>Foto: {lightboxImage?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center p-4 pt-0">
                        {lightboxImage && (
                            <img
                                src={lightboxImage.url}
                                alt={lightboxImage.name}
                                className="max-w-full max-h-[80vh] object-contain rounded"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
