'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, History } from 'lucide-react';
import { getMenus } from '@/app/actions/menus';

interface HistorySelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (menu: any) => void;
}

export function HistorySelectionDialog({ open, onOpenChange, onSelect }: HistorySelectionDialogProps) {
    const [menus, setMenus] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (open) {
            fetchMenus();
        }
    }, [open]);

    const fetchMenus = async () => {
        setLoading(true);
        const data = await getMenus();
        setMenus(data);
        setLoading(false);
    };

    const filtered = menus.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] md:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Pilih dari Riwayat Menu</DialogTitle>
                    <DialogDescription>
                        Pilih menu yang pernah dibuat sebelumnya untuk menduplikasi bahan-bahannya.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative mb-4">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari nama menu..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Tidak ada riwayat menu ditemukan.
                        </div>
                    ) : (
                        filtered.map((menu) => (
                            <div
                                key={menu.id}
                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                onClick={() => onSelect(menu)}
                            >
                                <div className="flex-1 min-w-0 mr-4">
                                    <h4 className="font-semibold truncate">{menu.name}</h4>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(menu.menuDate).toLocaleDateString('id-ID', { dateStyle: 'long' })} • {menu.ingredients.length} Bahan
                                    </p>
                                </div>
                                <Button size="sm" variant="ghost">Pilih</Button>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
