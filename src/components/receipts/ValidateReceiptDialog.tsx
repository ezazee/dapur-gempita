'use client';

import { useState } from 'react';
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
import { createReceipt } from '@/app/actions/receipts';
import { toast } from 'sonner';

interface ValidateReceiptDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchase: any; // The selected purchase to validate
    onSuccess: () => void;
}

export function ValidateReceiptDialog({ open, onOpenChange, purchase, onSuccess }: ValidateReceiptDialogProps) {
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<{ id: string, grossWeight: number, netWeight: number, photoUrl?: string }[]>(
        purchase?.items.map((i: any) => ({
            id: i.ingredientId,
            grossWeight: 0,
            netWeight: i.estimatedQty,
            photoUrl: undefined
        })) || []
    );

    const updateItem = (ingredientId: string, field: 'grossWeight' | 'netWeight', value: number) => {
        setItems(items.map(item =>
            item.id === ingredientId ? { ...item, [field]: value } : item
        ));
    };

    const updatePhoto = (ingredientId: string, photoUrl: string) => {
        setItems(items.map(item =>
            item.id === ingredientId ? { ...item, photoUrl } : item
        ));
    };

    const removePhoto = (ingredientId: string) => {
        setItems(items.map(item =>
            item.id === ingredientId ? { ...item, photoUrl: undefined } : item
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await createReceipt({
            purchaseId: purchase.id,
            note,
            items: items.map(i => ({
                ingredientId: i.id,
                photoUrl: i.photoUrl,
                grossWeight: i.grossWeight,
                netWeight: i.netWeight
            }))
        });

        setLoading(false);

        if (res.success) {
            toast.success('Penerimaan berhasil dikonfirmasi');
            onOpenChange(false);
            onSuccess();
        } else {
            toast.error(res.error || 'Gagal memproses penerimaan');
        }
    };

    if (!purchase) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Konfirmasi Penerimaan Barang</DialogTitle>
                    <DialogDescription>
                        Ambil foto barang yang diterima dan konfirmasi penerimaan.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted p-3 rounded-md mb-4 text-sm">
                    <p className="font-semibold">Info Pembelian:</p>
                    <p>Dari: {purchase.creatorName}</p>
                    <p>Catatan: "{purchase.note || '-'}"</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Daftar Barang yang Diterima</Label>
                        <div className="border rounded-md overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama Bahan</TableHead>
                                        <TableHead className="text-center">Estimasi</TableHead>
                                        <TableHead className="text-center">Berat Kotor</TableHead>
                                        <TableHead className="text-center">Berat Bersih</TableHead>
                                        <TableHead className="text-center">Foto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchase.items.map((pItem: any) => {
                                        const current = items.find(i => i.id === pItem.ingredientId);
                                        return (
                                            <TableRow key={pItem.id}>
                                                <TableCell className="font-medium">{pItem.ingredientName}</TableCell>
                                                <TableCell className="text-center text-muted-foreground text-sm">
                                                    {pItem.estimatedQty} {pItem.unit}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={current?.grossWeight || ''}
                                                            onChange={(e) => updateItem(pItem.ingredientId, 'grossWeight', parseFloat(e.target.value) || 0)}
                                                            required
                                                            className="h-8 w-20 text-center"
                                                        />
                                                        <span className="text-xs text-muted-foreground">{pItem.unit}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={current?.netWeight || ''}
                                                            onChange={(e) => updateItem(pItem.ingredientId, 'netWeight', parseFloat(e.target.value) || 0)}
                                                            required
                                                            className="h-8 w-20 text-center border-green-200 focus-visible:ring-green-500"
                                                        />
                                                        <span className="text-xs text-muted-foreground">{pItem.unit}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <CameraCapturePurchase
                                                        onCapture={(photoUrl) => updatePhoto(pItem.ingredientId, photoUrl)}
                                                        currentImage={current?.photoUrl}
                                                        onRemove={() => removePhoto(pItem.ingredientId)}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Catatan Penerimaan (Opsional)</Label>
                        <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Contoh: Barang lengkap, kualitas bagus."
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Menyimpan...' : 'Konfirmasi Penerimaan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
