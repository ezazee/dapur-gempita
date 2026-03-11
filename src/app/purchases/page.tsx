'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Plus, ShoppingCart, Eye, Trash2, Utensils, Package, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getPurchases, deletePurchase, getOperationalPurchases, getPendingFoodRequests } from '@/app/actions/purchases';
import { CreatePurchaseDialog } from '@/components/purchases/CreatePurchaseDialog';
import { PurchaseDetailDialog } from '@/components/purchases/PurchaseDetailDialog';
import { OperationalRequestDetailDialog } from '@/components/purchases/OperationalRequestDetailDialog';
import { toast } from 'sonner';
import { AlertConfirm } from '@/components/shared/AlertConfirm';
import { DateFilter } from '@/components/shared/DateFilter';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RouteGuard } from '@/components/RouteGuard';
import { cn } from '@/lib/utils';

export default function PurchasesPage() {
    const { role } = useAuth();
    const [purchases, setPurchases] = useState<any[]>([]);
    const [operationalPurchases, setOperationalPurchases] = useState<any[]>([]);
    const [pendingFoodRequests, setPendingFoodRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchaseFilter, setPurchaseFilter] = useState<'ALL' | 'FOOD' | 'OPERATIONAL'>('ALL');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState<any>(null); // For detail dialog
    const [isDetailOpen, setIsDetailOpen] = useState(false); // Added this state
    const [deleteId, setDeleteId] = useState<string | null>(null); // Added this state

    // Filters state
    const [filterDate, setFilterDate] = useState({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });

    const canCreate = ['KEUANGAN', 'SUPER_ADMIN'].includes(role || '');

    useEffect(() => {
        fetchPurchases();
    }, [filterDate]);

    const fetchPurchases = async () => {
        setLoading(true);
        try {
            const [standard, operational, foodReqs] = await Promise.all([
                getPurchases(filterDate),
                getOperationalPurchases(filterDate),
                getPendingFoodRequests()
            ]);
            setPurchases(standard);
            setOperationalPurchases(operational);
            setPendingFoodRequests(foodReqs);
        } catch (error) {
            toast.error('Gagal mengambil data pembelian');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setLoading(true);
        try {
            const res = await deletePurchase(id);
            if (res.success) {
                toast.success('Pembelian berhasil dihapus');
                fetchPurchases();
            } else {
                toast.error(res.error || 'Gagal menghapus pembelian');
            }
        } catch (error) {
            toast.error('Terjadi kesalahan saat menghapus');
        } finally {
            setLoading(false);
            setDeleteId(null);
        }
    };

    const allPurchases = [...purchases, ...operationalPurchases, ...pendingFoodRequests].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

    const filteredActive = allPurchases.filter(p =>
        ['waiting', 'incomplete', 'requested'].includes(p.status) &&
        (purchaseFilter === 'ALL' || p.purchaseType === purchaseFilter || (p.purchaseType === 'FOOD_REQUEST' && purchaseFilter === 'FOOD'))
    );
    const filteredHistory = allPurchases.filter(p =>
        ['approved', 'rejected'].includes(p.status) &&
        (purchaseFilter === 'ALL' || p.purchaseType === purchaseFilter)
    );

    const renderTable = (data: any[]) => (
        <div className="bg-background rounded-md border overflow-x-auto">
            <Table className="min-w-[800px]">
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
                    {loading && allPurchases.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                Memuat data...
                            </TableCell>
                        </TableRow>
                    ) : data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                <div className="flex flex-col items-center justify-center">
                                    <ShoppingCart className="h-8 w-8 mb-2 opacity-20" />
                                    <p>Belum ada data pembelian.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((purchase) => (
                            <TableRow key={purchase.id}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{format(new Date(purchase.purchaseDate), 'dd MMM yyyy', { locale: id })}</span>
                                        <span className="text-xs text-muted-foreground">{format(new Date(purchase.purchaseDate), 'EEEE', { locale: id })}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{purchase.creatorName}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-0.5">
                                        {(() => {
                                            if (purchase.purchaseType === 'OPERATIONAL') {
                                                return (
                                                    <span className="text-xs flex items-center gap-1 text-primary font-medium font-mono">
                                                        <Package className="h-3 w-3" /> {purchase.totalItems} Barang Operasional
                                                    </span>
                                                );
                                            }

                                            if (purchase.purchaseType === 'FOOD_REQUEST') {
                                                const unique = Array.from(new Map(purchase.items.map((i: any) => [i.ingredientId, i])).values());
                                                return (
                                                    <span className="text-xs flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md w-fit border border-emerald-100">
                                                        <Utensils className="h-3 w-3" /> {unique.length} Bahan Masak (Ahli Gizi)
                                                    </span>
                                                );
                                            }

                                            // Existing logic for FOOD purchases
                                            const unique = Array.from(new Map(purchase.items.map((i: any) => [i.ingredientId, i])).values());
                                            const masakCount = unique.filter((i: any) => i.menuType !== 'KERING').length;
                                            const keringCount = unique.filter((i: any) => i.menuType === 'KERING').length;
                                            return (
                                                <>
                                                    {masakCount > 0 && (
                                                        <span className="text-xs flex items-center gap-1 text-primary font-medium">
                                                            <Utensils className="h-3 w-3" /> {masakCount} Masak
                                                        </span>
                                                    )}
                                                    {keringCount > 0 && (
                                                        <span className="text-xs flex items-center gap-1 text-accent-foreground font-medium">
                                                            <Package className="h-3 w-3" /> {keringCount} Kering
                                                        </span>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </TableCell>
                                <TableCell><StatusBadge status={purchase.status} /></TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        {purchase.purchaseType !== 'FOOD_REQUEST' && (
                                            <Button
                                                size="sm"
                                                className={purchase.purchaseType === 'OPERATIONAL' && purchase.status === 'requested'
                                                    ? "bg-primary hover:bg-primary/90 text-white border-none text-[11px] h-8"
                                                    : "bg-primary hover:bg-primary/90 text-white border-none text-[11px] h-8"
                                                }
                                                onClick={() => setSelectedPurchase(purchase)}
                                            >
                                                {purchase.purchaseType === 'OPERATIONAL' && purchase.status === 'requested' ? (
                                                    <>
                                                        <Eye className="h-3 w-3 mr-1.5" />
                                                        Lihat & Proses
                                                    </>
                                                ) : (
                                                    <>
                                                        <Eye className="h-4 w-4" />
                                                        <span className="sr-only">Detail</span>
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                        {purchase.purchaseType === 'FOOD_REQUEST' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-[11px] h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                                onClick={() => {
                                                    // Trigger Create and fetch checklist?
                                                    // For now just open create
                                                    setIsCreateOpen(true);
                                                }}
                                            >
                                                <ShoppingCart className="h-3 w-3 mr-1.5" />
                                                Belanja
                                            </Button>
                                        )}
                                        {purchase.purchaseType !== 'FOOD_REQUEST' && (role === 'ADMIN' || role === 'SUPER_ADMIN') && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteId(purchase.id);
                                                }}
                                                disabled={loading}
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
    );

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'KEUANGAN', 'KEPALA_DAPUR']}>
            <DashboardLayout
                title="Daftar Pembelian"
                description="Riwayat rencana belanja dan pembelian bahan baku."
            >
                <DateFilter
                    onFilter={(startDate, endDate) => setFilterDate({ startDate, endDate })}
                    isLoading={loading}
                    className="mb-6"
                />
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <Select value={purchaseFilter} onValueChange={(v: any) => setPurchaseFilter(v)}>
                            <SelectTrigger className="w-full sm:w-[200px] bg-white text-sm font-semibold text-primary">
                                <SelectValue placeholder="Semua Jenis Barang" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Semua Jenis Barang</SelectItem>
                                <SelectItem value="FOOD">Bahan Makanan (Dapur)</SelectItem>
                                <SelectItem value="OPERATIONAL">Barang Operasional</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {canCreate && (
                        <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" />
                            Catat Pembelian
                        </Button>
                    )}
                </div>

                <Tabs defaultValue="active" className="w-full">
                    <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-4">
                        <TabsTrigger value="active">Sedang Berjalan</TabsTrigger>
                        <TabsTrigger value="history">Riwayat Selesai</TabsTrigger>
                    </TabsList>

                    <TabsContent value="active" className="mt-0">
                        {renderTable(filteredActive)}
                    </TabsContent>

                    <TabsContent value="history" className="mt-0">
                        {renderTable(filteredHistory)}
                    </TabsContent>
                </Tabs>

                <CreatePurchaseDialog
                    open={isCreateOpen}
                    onOpenChange={setIsCreateOpen}
                    onSuccess={fetchPurchases}
                />

                {selectedPurchase?.purchaseType === 'OPERATIONAL' ? (
                    <OperationalRequestDetailDialog
                        open={!!selectedPurchase && !isCreateOpen} // Ensure it doesn't stay open over edit
                        onOpenChange={(open) => !open && setSelectedPurchase(null)}
                        request={selectedPurchase}
                        onEdit={() => {
                            fetchPurchases();
                        }}
                    />
                ) : (
                    <PurchaseDetailDialog
                        open={!!selectedPurchase}
                        onOpenChange={(open) => !open && setSelectedPurchase(null)}
                        purchase={selectedPurchase}
                        onRefresh={fetchPurchases}
                    />
                )}

                <AlertConfirm
                    open={!!deleteId}
                    onOpenChange={(open) => !open && setDeleteId(null)}
                    title="Hapus Pembelian"
                    description="Apakah Anda yakin ingin menghapus data pembelian ini? Semua item terkait akan ikut dihapus dan tidak bisa dikembalikan."
                    confirmText="Hapus"
                    cancelText="Batal"
                    variant="destructive"
                    onConfirm={() => deleteId && handleDelete(deleteId)}
                />
            </DashboardLayout>
        </RouteGuard>
    );
}
