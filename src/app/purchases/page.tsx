'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Plus, ShoppingCart, Clock, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getPurchases, deletePurchase } from '@/app/actions/purchases';
import { CreatePurchaseDialog } from '@/components/purchases/CreatePurchaseDialog';
import { PurchaseDetailDialog } from '@/components/purchases/PurchaseDetailDialog';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { RouteGuard } from '@/components/RouteGuard';

export default function PurchasesPage() {
    const { role } = useAuth();
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState<any>(null); // For detail dialog

    const canCreate = ['KEUANGAN', 'SUPER_ADMIN'].includes(role || '');

    useEffect(() => {
        fetchPurchases();
    }, []);

    const fetchPurchases = async () => {
        setLoading(true);
        try {
            const data = await getPurchases();
            setPurchases(data);
        } catch (error) {
            toast.error('Gagal mengambil data pembelian');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'waiting':
                return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Menunggu</Badge>;
            case 'approved':
                return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Diterima</Badge>;
            case 'rejected':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Ditolak</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus pembelian ini?')) {
            return;
        }

        const result = await deletePurchase(id);
        if (result.success) {
            toast.success('Pembelian berhasil dihapus');
            fetchPurchases();
        } else {
            toast.error(result.error || 'Gagal menghapus pembelian');
        }
    };

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'KEUANGAN']}>
            <DashboardLayout
                title="Daftar Pembelian"
                description="Riwayat rencana belanja dan pembelian bahan baku."
            >
                <div className="flex justify-between items-center mb-6">
                    <div>
                        {/* Filters can go here */}
                    </div>
                    {canCreate && (
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Catat Pembelian
                        </Button>
                    )}
                </div>

                <div className="bg-background rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Dibuat Oleh</TableHead>
                                <TableHead>Total Barang</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Memuat data...
                                    </TableCell>
                                </TableRow>
                            ) : purchases.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center">
                                            <ShoppingCart className="h-8 w-8 mb-2 opacity-20" />
                                            <p>Belum ada data pembelian.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                purchases.map((purchase) => (
                                    <TableRow key={purchase.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{format(new Date(purchase.purchaseDate), 'dd MMM yyyy', { locale: id })}</span>
                                                <span className="text-xs text-muted-foreground">{format(new Date(purchase.purchaseDate), 'EEEE', { locale: id })}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{purchase.creatorName}</TableCell>
                                        <TableCell>{purchase.totalItems} jenis</TableCell>
                                        <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => setSelectedPurchase(purchase)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    <span className="sr-only">Detail</span>
                                                </Button>
                                                {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDelete(purchase.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="sr-only">Delete</span>
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <CreatePurchaseDialog
                    open={isCreateOpen}
                    onOpenChange={setIsCreateOpen}
                    onSuccess={fetchPurchases}
                />

                <PurchaseDetailDialog
                    open={!!selectedPurchase}
                    onOpenChange={(open) => !open && setSelectedPurchase(null)}
                    purchase={selectedPurchase}
                    onRefresh={fetchPurchases}
                />
            </DashboardLayout>
        </RouteGuard>
    );
}
