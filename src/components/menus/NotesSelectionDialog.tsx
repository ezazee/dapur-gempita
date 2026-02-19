'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
} from "@/components/ui/table";
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon, Search, Check } from 'lucide-react';
import { getMenus } from '@/app/actions/menus';
import { toast } from 'sonner';

interface NotesSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (menu: any) => void;
}

export function NotesSelectionDialog({ open, onOpenChange, onSelect }: NotesSelectionDialogProps) {
    const [menus, setMenus] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (open) {
            fetchMenus();
        }
    }, [open]);

    const fetchMenus = async () => {
        setLoading(true);
        try {
            // Fetch comprehensive list of past menus
            const from = new Date('2024-01-01');
            const to = new Date();
            to.setFullYear(to.getFullYear() + 1);

            const data = await getMenus(from, to);
            setMenus(data);
        } catch (error) {
            toast.error('Gagal mengambil data notes');
        } finally {
            setLoading(false);
        }
    };

    const filteredMenus = menus.filter(menu =>
        menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (menu.description && menu.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleSelect = (menu: any) => {
        onSelect(menu);
        onOpenChange(false);
        toast.success(`Menu "${menu.name}" berhasil dimuat.`);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Pilih dari Notes / Riwayat Menu</DialogTitle>
                    <DialogDescription>
                        Pilih menu yang pernah dibuat sebelumnya untuk menyalin resepnya.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center space-x-2 my-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari menu berdasarkan nama atau deskripsi..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>

                <div className="border rounded-md overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Tanggal</TableHead>
                                <TableHead>Nama Menu</TableHead>
                                <TableHead className="w-[100px] text-center">Bahan</TableHead>
                                <TableHead className="w-[80px] text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        Memuat data...
                                    </TableCell>
                                </TableRow>
                            ) : filteredMenus.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                        Tidak ada menu ditemukan.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMenus.map((menu) => (
                                    <TableRow key={menu.id}>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(new Date(menu.menuDate), 'dd MMM yyyy', { locale: id })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{menu.name}</div>
                                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                {menu.description}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                                {menu.ingredients.length}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                onClick={() => handleSelect(menu)}
                                                className="h-8"
                                            >
                                                Pilih
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
