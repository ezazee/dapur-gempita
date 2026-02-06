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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Plus, X, Search, ShoppingCart, Ban, MessageSquare } from 'lucide-react';
import { CameraCapturePurchase } from '@/components/shared/CameraCapturePurchase';
import { createPurchase } from '@/app/actions/purchases';
import { searchIngredients } from '@/app/actions/menus'; // Reusing search
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreatePurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CreatePurchaseDialog({ open, onOpenChange, onSuccess }: CreatePurchaseDialogProps) {
    const [note, setNote] = useState('');
    const [date, setDate] = useState<string>(() => {
        // Use local date instead of UTC to fix "yesterday" bug
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    });
    // const [menuDate, setMenuDate] = useState<string>(''); // Removed as per request
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedItems, setSelectedItems] = useState<Array<{
        id: string;
        name: string;
        qty: number;
        unit: string;
        memo?: string;
        photoUrl?: string;
    }>>([]);
    const [loading, setLoading] = useState(false);

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

        const res = await createPurchase({
            purchaseDate: new Date(date),
            note,
            items: selectedItems.map(i => ({ ingredientId: i.id, qty: i.qty, memo: i.memo, photoUrl: i.photoUrl }))
        });

        setLoading(false);

        if (res.success) {
            toast.success('Pembelian berhasil dibuat');
            onOpenChange(false);
            setNote('');
            setSelectedItems([]);
            // Reset dates if needed, but keeping Today is fine
            onSuccess();
        } else {
            toast.error(res.error || 'Gagal membuat pembelian');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Catat Pembelian Baru</DialogTitle>
                    <DialogDescription>
                        Rencana belanja bahan baku untuk hari ini.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Fixed Purchase Date */}
                    <div className="space-y-2">
                        <Label>Tanggal Pencatatan (Hari Ini)</Label>
                        <div className="flex gap-2">
                            <Input
                                type="date"
                                value={date}
                                disabled
                                className="bg-muted text-muted-foreground opacity-100 flex-1"
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        const { getMenuIngredientsForDate } = await import('@/app/actions/menus');
                                        const items = await getMenuIngredientsForDate(new Date(date));

                                        if (items.length === 0) {
                                            toast.warning('Tidak ada menu/bahan pada tanggal ini');
                                        } else {
                                            const newItems = [...selectedItems];
                                            items.forEach((item: any) => {
                                                const existing = newItems.find(i => i.id === item.id);
                                                if (!existing) {
                                                    newItems.push({ ...item, qty: item.qty });
                                                } else {
                                                    existing.qty = item.qty;
                                                }
                                            });
                                            setSelectedItems(newItems);
                                            toast.success(`Berhasil mengambil ${items.length} bahan dari menu`);
                                        }
                                    } catch (e) {
                                        toast.error('Gagal mengambil data menu');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                            >
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Ambil Checklist
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Klik "Ambil Checklist" untuk mengambil daftar belanja dari menu hari ini.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Catatan / Toko (Opsional)</Label>
                        <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Contoh: Belanja di Pasar Induk"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Daftar Barang</Label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari bahan..."
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

                        {/* Selected Items List */}
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
                                            <span className="text-[10px] text-muted-foreground uppercase">Estimasi</span>
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
                                    <span className="text-sm">Keranjang kosong</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading || selectedItems.length === 0}>
                            {loading ? 'Menyimpan...' : 'Simpan Pembelian'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
