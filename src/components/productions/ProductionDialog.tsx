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
import { CameraCapturePurchase } from '@/components/shared/CameraCapturePurchase';
import { createProduction, getTodaysMenu } from '@/app/actions/productions';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

interface ProductionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function ProductionDialog({ open, onOpenChange, onSuccess }: ProductionDialogProps) {
    const [menu, setMenu] = useState<any>(null);
    const [totalPortions, setTotalPortions] = useState(0);
    const [note, setNote] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingMenu, setFetchingMenu] = useState(false);

    const fetchTodaysMenu = async () => {
        setFetchingMenu(true);
        try {
            const data = await getTodaysMenu();
            if (!data) {
                toast.error('Menu hari ini belum dibuat');
                return;
            }
            setMenu(data);
            // Initialize items with available stock from receipts (auto-filled)
            setItems((data.ingredients || []).map((i: any) => ({
                id: i.id,
                name: i.name,
                unit: i.unit,
                availableStock: i.availableStock || 0,
                qtyUsed: i.availableStock || 0 // Auto-fill dengan stok tersedia
            })));
            toast.success(`Menu "${data.name}" berhasil dimuat`);
        } catch (error) {
            toast.error('Gagal memuat menu');
        } finally {
            setFetchingMenu(false);
        }
    };

    const updateItemQty = (id: string, qty: number) => {
        setItems(items.map(i => i.id === id ? { ...i, qtyUsed: qty } : i));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!menu) {
            toast.error('Silakan tarik menu terlebih dahulu');
            return;
        }

        setLoading(true);

        const res = await createProduction({
            menuId: menu.id,
            totalPortions,
            note,
            photoUrl,
            items: items.map(i => ({ ingredientId: i.id, qtyUsed: i.qtyUsed }))
        });

        setLoading(false);

        if (res.success) {
            toast.success('Produksi berhasil dicatat. Stok berkurang.');
            onOpenChange(false);
            // Reset form
            setMenu(null);
            setTotalPortions(0);
            setNote('');
            setPhotoUrl('');
            setItems([]);
            onSuccess();
        } else {
            toast.error(res.error || 'Gagal mencatat produksi');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Catat Produksi Harian</DialogTitle>
                    <DialogDescription>
                        Tarik menu hari ini dan input hasil masakan.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Menu Hari Ini</Label>
                        {!menu ? (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={fetchTodaysMenu}
                                disabled={fetchingMenu}
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${fetchingMenu ? 'animate-spin' : ''}`} />
                                {fetchingMenu ? 'Memuat Menu...' : 'Tarik Menu Hari Ini'}
                            </Button>
                        ) : (
                            <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-md">
                                <div className="flex items-center space-x-2">
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                    <div>
                                        <p className="font-semibold text-sm">{menu.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(menu.date).toLocaleDateString('id-ID', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setMenu(null);
                                        setItems([]);
                                    }}
                                >
                                    Ganti
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Jumlah Porsi Dihasilkan</Label>
                        <Input
                            type="number"
                            min="1"
                            value={totalPortions}
                            onChange={(e) => setTotalPortions(parseInt(e.target.value) || 0)}
                            required
                            disabled={!menu}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Foto Hasil Masakan</Label>
                        <CameraCapturePurchase
                            onCapture={setPhotoUrl}
                            currentImage={photoUrl}
                        />
                        <p className="text-xs text-muted-foreground">Upload foto masakan yang sudah jadi</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Pemakaian Bahan (Otomatis dari Penerimaan)</Label>
                        <div className="bg-muted/30 border rounded-md p-2 space-y-2">
                            {items.length > 0 ? (
                                items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-sm">
                                        <div>
                                            <span className="font-medium">{item.name}</span>
                                            <p className="text-xs text-muted-foreground">
                                                Stok tersedia: {item.availableStock} {item.unit}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={item.qtyUsed}
                                                onChange={(e) => updateItemQty(item.id, parseFloat(e.target.value) || 0)}
                                                className="w-20 h-7 text-right"
                                            />
                                            <span className="w-8 text-xs">{item.unit}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground text-xs italic text-center py-2">
                                    Tarik menu terlebih dahulu
                                </p>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            💡 Qty otomatis terisi sesuai stok dari penerimaan
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Catatan (Opsional)</Label>
                        <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Contoh: Rasa pas, stok sisa sedikit."
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading || !menu}>
                            {loading ? 'Menyimpan...' : 'Simpan Produksi'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
