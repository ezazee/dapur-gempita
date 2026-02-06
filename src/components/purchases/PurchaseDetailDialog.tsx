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
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar, Package, FileText, ShoppingCart, Edit, History } from 'lucide-react';
import { EditPurchaseDialog } from './EditPurchaseDialog';
import { useAuth } from '@/hooks/useAuth';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface PurchaseDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchase: any;
    onRefresh?: () => void;
}

export function PurchaseDetailDialog({ open, onOpenChange, purchase, onRefresh }: PurchaseDetailDialogProps) {
    const { role } = useAuth();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

    useEffect(() => {
        if (open && purchase) {
            import('@/app/actions/purchases').then(({ getPurchaseLogs }) => {
                getPurchaseLogs(purchase.id).then(setLogs);
            });
        }
    }, [open, purchase]);

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
                            <Calendar className="h-3 w-3" />
                            {format(new Date(purchase.purchaseDate), 'dd MMMM yyyy', { locale: id })}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Dibuat oleh: <span className="font-medium text-foreground">{purchase.creatorName}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* ... Status & Note ... */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                                <ShoppingCart className="h-4 w-4" /> Status
                            </h4>
                            <div className="text-sm">
                                <Badge variant={purchase.status === 'approved' ? 'default' : purchase.status === 'rejected' ? 'destructive' : 'secondary'}>
                                    {purchase.status === 'approved' ? 'Diterima' : purchase.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                                </Badge>
                            </div>
                        </div>
                        {purchase.note && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                                    <FileText className="h-4 w-4" /> Catatan
                                </h4>
                                <div className="text-sm text-muted-foreground bg-secondary/20 p-2 rounded-md border italic">
                                    "{purchase.note}"
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Items Table */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                            <Package className="h-4 w-4" /> Daftar Barang
                        </h4>
                        <div className="border rounded-md overflow-hidden">
                            <Table>
                                <TableHeader className="bg-secondary">
                                    <TableRow>
                                        <TableHead>Nama Bahan</TableHead>
                                        <TableHead className="text-center">Foto</TableHead>
                                        <TableHead className="text-right">Estimasi Jumlah</TableHead>
                                        <TableHead className="text-center">Satuan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchase.items.map((item: any) => (
                                        <TableRow key={item.id} className="hover:bg-muted/50">
                                            <TableCell className="font-medium">
                                                <span className={item.estimatedQty === 0 ? "text-muted-foreground line-through decoration-destructive" : ""}>
                                                    {item.ingredientName}
                                                </span>
                                                {item.estimatedQty === 0 && (
                                                    <Badge variant="destructive" className="ml-2 text-[10px] h-5 px-1 py-0">HABIS</Badge>
                                                )}
                                                {item.memo && (
                                                    <div className="text-xs text-muted-foreground italic mt-0.5 flex items-start gap-1">
                                                        <span className="shrink-0 text-[10px] border px-1 rounded bg-secondary">Catatan:</span> {item.memo}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.photoUrl ? (
                                                    <img
                                                        src={item.photoUrl}
                                                        alt={`Foto ${item.ingredientName}`}
                                                        className="h-16 w-16 object-cover rounded border mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                                                        onClick={() => setLightboxImage({ url: item.photoUrl, name: item.ingredientName })}
                                                    />
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.estimatedQty === 0 ? (
                                                    <span className="text-muted-foreground text-xs italic">Kosong</span>
                                                ) : (
                                                    item.estimatedQty
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground">
                                                {item.estimatedQty === 0 ? "-" : item.unit}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {purchase.items.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-6 text-muted-foreground italic">
                                                Tidak ada barang yang tercatat.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* History Section */}
                    {logs.length > 0 && (
                        <div className="space-y-3 pt-4 border-t">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                                <History className="h-4 w-4" /> Riwayat Perubahan
                            </h4>
                            <div className="space-y-2">
                                {logs.map((log) => (
                                    <div key={log.id} className="text-xs flex items-start gap-2 text-muted-foreground">
                                        <Badge variant="outline" className="text-[10px] shrink-0">
                                            {format(new Date(log.createdAt), 'dd MMM HH:mm', { locale: id })}
                                        </Badge>
                                        <span>
                                            Diedit oleh <span className="font-medium text-foreground">{log.userName}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between sm:justify-between">
                    <div className="flex gap-2">
                        {purchase.status === 'waiting' && role !== 'PENERIMA' && (
                            <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit / Update Realisasi
                            </Button>
                        )}
                    </div>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>

            <EditPurchaseDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                purchase={purchase}
                onSuccess={() => {
                    onOpenChange(false); // Close Edit Dialog
                    if (onRefresh) onRefresh(); // Trigger refresh in parent
                }}
            />

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
        </Dialog>
    );
}
