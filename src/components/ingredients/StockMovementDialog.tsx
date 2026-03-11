'use client';

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getStockHistory } from "@/app/actions/ingredients";
import { Loader2, History, ArrowUpRight, ArrowDownLeft, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface StockMovementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ingredientId: string;
    ingredientName: string;
}

export function StockMovementDialog({ open, onOpenChange, ingredientId, ingredientName }: StockMovementDialogProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (open && ingredientId) {
            loadHistory();
        }
    }, [open, ingredientId]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await getStockHistory(ingredientId);
            setHistory(data);
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'IN':
                return <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100"><ArrowDownLeft className="h-3 w-3 mr-1" /> Masuk</Badge>;
            case 'OUT':
                return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100"><ArrowUpRight className="h-3 w-3 mr-1" /> Keluar</Badge>;
            case 'ADJUST':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Settings2 className="h-3 w-3 mr-1" /> Penyesuaian</Badge>;
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[850px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        Kartu Stok: {ingredientName}
                    </DialogTitle>
                    <DialogDescription>
                        Riwayat lengkap pergerakan stok bahan baku ini.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Tipe</TableHead>
                                    <TableHead className="text-right">Jumlah</TableHead>
                                    <TableHead className="text-right">Stok Akhir</TableHead>
                                    <TableHead>Oleh</TableHead>
                                    <TableHead>Keterangan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : history.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            Belum ada riwayat pergerakan stok.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    history.map((h) => (
                                        <TableRow key={h.id}>
                                            <TableCell className="text-[11px] whitespace-nowrap">
                                                {format(new Date(h.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                                            </TableCell>
                                            <TableCell>{getTypeBadge(h.type)}</TableCell>
                                            <TableCell className={`text-right font-medium ${h.type === 'IN' ? 'text-green-600' : h.type === 'OUT' ? 'text-red-600' : 'text-blue-600'}`}>
                                                {h.qty > 0 ? `+${h.qty}` : h.qty}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                                {h.balanceAfter}
                                            </TableCell>
                                            <TableCell className="text-[11px]">{h.creatorName}</TableCell>
                                            <TableCell className="text-[11px] min-w-[150px] break-words" title={h.note}>
                                                {h.note || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
