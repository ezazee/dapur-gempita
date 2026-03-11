'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/RouteGuard';
import { getStockMovements } from '@/app/actions/monitoring';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { DateFilter } from '@/components/shared/DateFilter';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';

export default function StockMovementsPage() {
    const [movements, setMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [total, setTotal] = useState(0);
    const [filterDate, setFilterDate] = useState({
        startDate: '',
        endDate: ''
    });
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (!isInitialized) return;
        setPage(1);
        fetchData();
    }, [filterDate, isInitialized]);

    useEffect(() => {
        if (!isInitialized) return;
        fetchData();
    }, [page]);

    const fetchData = async () => {
        setLoading(true);
        const { data, total } = await getStockMovements({
            page,
            pageSize,
            startDate: filterDate.startDate || undefined,
            endDate: filterDate.endDate || undefined
        });
        setMovements(data);
        setTotal(total);
        setLoading(false);
    };


    const totalPages = Math.ceil(total / pageSize);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'IN': return <ArrowDownRight className="w-4 h-4 text-success" />;
            case 'OUT': return <ArrowUpRight className="w-4 h-4 text-destructive" />;
            default: return <RefreshCw className="w-4 h-4 text-primary" />;
        }
    };

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'KEUANGAN', 'ASLAP', 'KEPALA_DAPUR', 'CHEF']}>
            <DashboardLayout
                title="Pergerakan Stok"
                description="Log perubahan stok bahan baku (Masuk/Keluar)."
            >
                <DateFilter
                    onFilter={(startDate, endDate) => setFilterDate({ startDate, endDate })}
                    isLoading={loading}
                    className="mb-6"
                />

                <div className="bg-background rounded-lg border overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground border-b">
                            <tr>
                                <th className="p-4">Waktu</th>
                                <th className="p-4">Bahan</th>
                                <th className="p-4">Tipe</th>
                                <th className="p-4 text-right">Jumlah</th>
                                <th className="p-4 text-right">Stok Akhir</th>
                                <th className="p-4">Dibuat Oleh</th>
                                <th className="p-4">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movements.map((move) => (
                                <tr key={move.id} className="border-b last:border-0 hover:bg-muted/10">
                                    <td className="p-4 whitespace-nowrap">
                                        {format(new Date(move.date), 'dd/MM/yy HH:mm')}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium">{move.ingredientName}</span>
                                            {(() => {
                                                switch (move.ingredientCategory) {
                                                    case 'OPERASIONAL': return <Badge variant="outline" className="w-fit text-[10px] bg-primary/5 text-primary border-primary/20">Barang Operasional</Badge>;
                                                    case 'KERING': return <Badge variant="outline" className="w-fit text-[10px] bg-accent/10 text-accent-foreground border-accent/20">Bahan Makanan Kering</Badge>;
                                                    case 'MASAK': return <Badge variant="outline" className="w-fit text-[10px] bg-success/10 text-success border-success/20">Bahan Makanan Masak</Badge>;
                                                    default: return move.ingredientCategory ? <Badge variant="outline" className="w-fit text-[10px]">{move.ingredientCategory}</Badge> : null;
                                                }
                                            })()}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1">
                                            {getTypeIcon(move.type)}
                                            <Badge variant="outline" className="text-xs">{move.type}</Badge>
                                        </div>
                                    </td>
                                    <td className={`p-4 text-right font-mono ${move.type === 'OUT' ? 'text-destructive' : 'text-success'}`}>
                                        {move.type === 'OUT' ? '-' : '+'}{move.qty} {move.unit}
                                    </td >
                                    <td className="p-4 text-right font-mono font-semibold">
                                        {move.balanceAfter} {move.unit}
                                    </td>
                                    <td className="p-4 text-muted-foreground">{move.creatorName}</td>
                                    <td className="p-4 text-xs text-muted-foreground max-w-xs truncate" title={move.note}>
                                        {move.note}
                                    </td>
                                </tr>
                            ))}
                            {movements.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-muted-foreground">Belum ada data pergerakan stok.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-muted/20 p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground">
                            Menampilkan <span className="font-medium">{(page - 1) * pageSize + 1}</span> sampai <span className="font-medium">{Math.min(page * pageSize, total)}</span> dari <span className="font-medium">{total}</span> pergerakan stok
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Sebelumnya
                            </Button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    // Basic logic to show pages around current
                                    let pageNum = page;
                                    if (page <= 3) pageNum = i + 1;
                                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = page - 2 + i;

                                    if (pageNum < 1 || pageNum > totalPages) return null;

                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={page === pageNum ? "default" : "outline"}
                                            size="sm"
                                            className="w-8 h-8 p-0"
                                            onClick={() => setPage(pageNum)}
                                            disabled={loading}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                            >
                                Selanjutnya
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </DashboardLayout>
        </RouteGuard>
    );
}
