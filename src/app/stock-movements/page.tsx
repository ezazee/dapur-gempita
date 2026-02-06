'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/RouteGuard';
import { getStockMovements } from '@/app/actions/monitoring';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

export default function StockMovementsPage() {
    const [movements, setMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const data = await getStockMovements();
        setMovements(data);
        setLoading(false);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'IN': return <ArrowDownRight className="w-4 h-4 text-green-600" />;
            case 'OUT': return <ArrowUpRight className="w-4 h-4 text-red-600" />;
            default: return <RefreshCw className="w-4 h-4 text-blue-600" />;
        }
    };

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
            <DashboardLayout
                title="Pergerakan Stok"
                description="Log perubahan stok bahan baku (Masuk/Keluar)."
            >
                <div className="bg-background rounded-lg border overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground border-b">
                            <tr>
                                <th className="p-4">Waktu</th>
                                <th className="p-4">Bahan</th>
                                <th className="p-4">Tipe</th>
                                <th className="p-4 text-right">Jumlah</th>
                                <th className="p-4 text-right">Saldo Akhir</th>
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
                                    <td className="p-4 font-medium">{move.ingredientName}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1">
                                            {getTypeIcon(move.type)}
                                            <Badge variant="outline" className="text-xs">{move.type}</Badge>
                                        </div>
                                    </td>
                                    <td className={`p-4 text-right font-mono ${move.type === 'OUT' ? 'text-red-600' : 'text-green-600'}`}>
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
            </DashboardLayout>
        </RouteGuard>
    );
}
