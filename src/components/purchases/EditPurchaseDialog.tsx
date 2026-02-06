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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Plus, X, Search, ShoppingCart, Save, Ban, MessageSquare } from 'lucide-react';
import { CameraCapturePurchase } from '@/components/shared/CameraCapturePurchase';
import { editPurchase } from '@/app/actions/purchases';
import { searchIngredients } from '@/app/actions/menus';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EditPurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchase: any;
    onSuccess: () => void;
}

export function EditPurchaseDialog({ open, onOpenChange, purchase, onSuccess }: EditPurchaseDialogProps) {
    const [note, setNote] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (purchase && open) {
            setNote(purchase.note || '');
            // Map existing items
            setSelectedItems(purchase.items.map((i: any) => ({
                id: i.ingredientId || i.id, // Handle if flattened or nested
                name: i.ingredientName || i.name,
                unit: i.unit,
                qty: i.estimatedQty || i.qty,
                memo: i.memo,
                photoUrl: i.photoUrl
            })));
        }
    }, [purchase, open]);

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length > 1) {
            const results = await searchIngredients(term);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };

    const addItem = (ing: any) => {
        if (selectedItems.some(i => i.id === ing.id)) return;
        setSelectedItems([...selectedItems, { ...ing, qty: 1 }]);
        setSearchTerm('');
        setSearchResults([]);
    };

    const removeItem = (id: string) => {
        setSelectedItems(selectedItems.filter(i => i.id !== id));
    };

    const updateQty = (id: string, qty: number) => {
        setSelectedItems(selectedItems.map(i => i.id === id ? { ...i, qty } : i));
    };

    const updateMemo = (id: string, memo: string) => {
        setSelectedItems(selectedItems.map(i => i.id === id ? { ...i, memo } : i));
    };

    const updatePhoto = (id: string, photoUrl: string) => {
        setSelectedItems(selectedItems.map(i => i.id === id ? { ...i, photoUrl } : i));
    };

    const removePhoto = (id: string) => {
        setSelectedItems(selectedItems.map(i => i.id === id ? { ...i, photoUrl: undefined } : i));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await editPurchase(purchase.id, {
            note,
            items: selectedItems.map(i => ({ ingredientId: i.id, qty: i.qty, memo: i.memo, photoUrl: i.photoUrl }))
        });

        setLoading(false);

        if (res.success) {
            toast.success('Pembelian berhasil diperbarui');
            onOpenChange(false);
            onSuccess();
        } else {
            toast.error(res.error || 'Gagal memperbarui pembelian');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Update Realisasi Pembelian</DialogTitle>
                    <DialogDescription>
                        Sesuaikan jumlah barang dengan yang sebenarnya dibeli. Hapus barang jika tidak ada/habis.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Catatan (Alasan Perubahan)</Label>
                        <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Contoh: Stok sawi habis di pasar, diganti bayam (tambah item baru)..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Daftar Barang Realisasi</Label>

                        {/* Search to add replacement items */}
                        <div className="relative mb-2">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari barang pengganti/tambahan..."
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="pl-8"
                            />
                            {searchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
                                    {searchResults.map(result => (
                                        <button
                                            key={result.id}
                                            type="button"
                                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                                            onClick={() => addItem(result)}
                                        >
                                            <div className="font-medium">{result.name}</div>
                                            <div className="text-xs text-muted-foreground">Unit: {result.unit}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 mt-2 bg-muted/30 p-2 rounded-md border min-h-[100px]">
                            {selectedItems.map((item) => (
                                <div key={item.id} className={cn(
                                    "flex items-center justify-between p-2 rounded border shadow-sm transition-colors",
                                    item.qty === 0 ? "bg-destructive/5 border-destructive/20" : "bg-background"
                                )}>
                                    <div className="flex-1">
                                        <span className={cn(
                                            "font-medium text-sm block",
                                            item.qty === 0 && "text-muted-foreground line-through decoration-destructive"
                                        )}>{item.name}</span>
                                        {item.qty === 0 && <span className="text-[10px] text-destructive font-bold uppercase">Stok Habis / Kosong</span>}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="flex flex-col items-end">
                                            {/* <span className="text-[10px] text-muted-foreground uppercase">Realisasi</span> */}
                                            <div className="flex items-center space-x-1">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.1"
                                                    value={item.qty}
                                                    onChange={(e) => updateQty(item.id, parseFloat(e.target.value) || 0)}
                                                    className={cn(
                                                        "w-16 h-7 text-right text-sm",
                                                        item.qty === 0 && "text-destructive font-bold border-destructive bg-destructive/10"
                                                    )}
                                                />
                                                <span className="text-xs text-muted-foreground w-8">{item.unit}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                type="button"
                                                variant={item.qty === 0 ? "destructive" : "outline"}
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => updateQty(item.id, item.qty === 0 ? 1 : 0)}
                                                title={item.qty === 0 ? "Batalkan status Habis" : "Tandai Stok Habis / Kosong"}
                                            >
                                                <Ban className="h-4 w-4" />
                                            </Button>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant={item.memo ? "default" : "ghost"}
                                                        size="icon"
                                                        className={cn("h-7 w-7", item.memo ? "text-primary-foreground" : "text-muted-foreground")}
                                                        title="Tambah Catatan / Alasan"
                                                    >
                                                        <MessageSquare className="h-4 w-4" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-60 p-3">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs">Catatan per Item</Label>
                                                        <Input
                                                            value={item.memo || ''}
                                                            onChange={(e) => updateMemo(item.id, e.target.value)}
                                                            placeholder="Contoh: Stok Pasar Habis"
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <CameraCapturePurchase
                                                onCapture={(photoUrl) => updatePhoto(item.id, photoUrl)}
                                                currentImage={item.photoUrl}
                                                onRemove={() => removePhoto(item.id)}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={() => removeItem(item.id)}
                                                title="Hapus dari list"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {selectedItems.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full py-4 text-muted-foreground opacity-50">
                                    <ShoppingCart className="h-8 w-8 mb-2" />
                                    <span className="text-sm">List Kosong (Barang Habis Semua?)</span>
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            * Jika barang tidak ada, klik icon sampah untuk menghapus dari list pembelian.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
