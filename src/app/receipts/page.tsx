'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ClipboardCheck, Package, History, Utensils, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPendingPurchases, getReceipts } from '@/app/actions/receipts';
import { ValidateReceiptDialog } from '@/components/receipts/ValidateReceiptDialog';
import { ReceiptDetailDialog } from '@/components/receipts/ReceiptDetailDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { RouteGuard } from '@/components/RouteGuard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DateFilter } from '@/components/shared/DateFilter';
import { cn } from '@/lib/utils';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

export default function ReceiptsPage() {
    const { role } = useAuth();
    const [pendingPurchases, setPendingPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
    const [isValidateOpen, setIsValidateOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('pending');
    const [historyType, setHistoryType] = useState<'MASAK' | 'OPERATIONAL'>('MASAK');

    // History state for Masak
    const [historyMasak, setHistoryMasak] = useState<any[]>([]);
    const [metaMasak, setMetaMasak] = useState({ total: 0, page: 1, totalPages: 0 });
    const [loadingMasak, setLoadingMasak] = useState(false);

    // History state for Operational
    const [historyOperational, setHistoryOperational] = useState<any[]>([]);
    const [metaOperational, setMetaOperational] = useState({ total: 0, page: 1, totalPages: 0 });
    const [loadingOperational, setLoadingOperational] = useState(false);

    // Filter state
    const [filterDate, setFilterDate] = useState({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });

    useEffect(() => {
        fetchPending();
    }, []);

    useEffect(() => {
        fetchHistory('MASAK', 1);
        fetchHistory('OPERATIONAL', 1);
    }, [filterDate]);

    useEffect(() => {
        // Set active tab based on role when role is loaded
        if (role === 'CHEF' || role === 'KEPALA_DAPUR') {
            setActiveTab('history');
        }
    }, [role]);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const pending = await getPendingPurchases();
            setPendingPurchases(pending);
        } catch (error) {
            toast.error('Gagal mengambil data pembelian tertunda');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (type: 'MASAK' | 'OPERATIONAL', page: number) => {
        if (type === 'MASAK') setLoadingMasak(true);
        else setLoadingOperational(true);

        try {
            const result = await getReceipts({
                type,
                page,
                pageSize: 10,
                startDate: filterDate.startDate,
                endDate: filterDate.endDate
            });

            if (type === 'MASAK') {
                setHistoryMasak(result.data);
                setMetaMasak({
                    total: result.meta.total,
                    page: result.meta.page,
                    totalPages: result.meta.totalPages
                });
            } else {
                setHistoryOperational(result.data);
                setMetaOperational({
                    total: result.meta.total,
                    page: result.meta.page,
                    totalPages: result.meta.totalPages
                });
            }
        } catch (e) {
            toast.error(`Gagal mengambil riwayat ${type === 'MASAK' ? 'Bahan Masak' : 'Barang Operasional'}`);
        } finally {
            if (type === 'MASAK') setLoadingMasak(false);
            else setLoadingOperational(false);
        }
    };

    const handleValidate = (purchase: any) => {
        setSelectedPurchase(purchase);
        setIsValidateOpen(true);
    };

    const renderPendingTable = (data: any[]) => (
        <Card className="border-primary/20 shadow-sm overflow-hidden border-t-4 border-t-amber-500">
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-amber-50/50">
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Dibuat Oleh</TableHead>
                            <TableHead className="text-right">Total Barang</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Memuat data...</TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-48 text-center text-muted-foreground font-medium">
                                    <div className="flex flex-col items-center justify-center space-y-2 opacity-50">
                                        <div className="bg-slate-100 p-4 rounded-full">
                                            <ClipboardCheck className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <p>Tidak ada pembelian yang perlu divalidasi.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((purchase) => (
                                <TableRow key={purchase.id} className="hover:bg-slate-50 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900">{format(new Date(purchase.purchaseDate), 'dd MMM yyyy')}</span>
                                            <span className="text-xs text-slate-500 font-medium">{format(new Date(purchase.purchaseDate), 'EEEE')}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-700">{purchase.creatorName}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            {(() => {
                                                const unique = Array.from(new Map(purchase.items.map((i: any) => [i.ingredientId, i])).values());
                                                const masakCount = unique.filter((i: any) => i.menuType !== 'KERING' && i.menuType !== 'OPERATIONAL').length;
                                                const keringCount = unique.filter((i: any) => i.menuType === 'KERING').length;
                                                const operationalCount = unique.filter((i: any) => i.menuType === 'OPERATIONAL').length;
                                                return (
                                                    <>
                                                        {purchase.purchaseType === 'OPERATIONAL' ? (
                                                            <Badge variant="secondary" className="text-[10px] text-purple-700 bg-purple-50 border-purple-100 font-bold px-2 py-0">
                                                                <Package className="h-2.5 w-2.5 mr-1" /> {operationalCount} Barang
                                                            </Badge>
                                                        ) : (
                                                            <>
                                                                {masakCount > 0 && (
                                                                    <Badge variant="secondary" className="text-[10px] text-blue-700 bg-blue-50 border-blue-100 font-bold px-2 py-0">
                                                                        <Utensils className="h-2.5 w-2.5 mr-1" /> {masakCount} Masak
                                                                    </Badge>
                                                                )}
                                                                {keringCount > 0 && (
                                                                    <Badge variant="secondary" className="text-[10px] text-amber-700 bg-amber-50 border-amber-100 font-bold px-2 py-0">
                                                                        <Package className="h-2.5 w-2.5 mr-1" /> {keringCount} Kering
                                                                    </Badge>
                                                                )}
                                                            </>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            className="h-9 px-4 rounded-lg shadow-sm hover:scale-105 transition-all text-xs font-bold"
                                            onClick={() => handleValidate(purchase)}
                                        >
                                            <ClipboardCheck className="mr-2 h-4 w-4" />
                                            Terima Barang
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );

    const renderHistoryTable = (data: any[], loading: boolean, meta: any, type: 'MASAK' | 'OPERATIONAL') => (
        <div className="space-y-4">
            <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[180px]">Tanggal Terima</TableHead>
                            <TableHead>Tipe</TableHead>
                            <TableHead>Penerima</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">Memuat data...</TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-medium">Belum ada riwayat.</TableCell>
                            </TableRow>
                        ) : (
                            data.map((receipt) => (
                                <TableRow key={receipt.id} className="hover:bg-slate-50/80 transition-colors">
                                    <TableCell className="font-medium">{format(new Date(receipt.date), 'dd/MM/yyyy HH:mm')}</TableCell>
                                    <TableCell>
                                        {receipt.purchaseType === 'OPERATIONAL' ? (
                                            <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-100 gap-1.5 font-bold px-2.5">
                                                <Package className="h-3 w-3" /> Operasional
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-100 gap-1.5 font-bold px-2.5">
                                                <Utensils className="h-3 w-3" /> Bahan Masak
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{receipt.receiverName || '-'}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={receipt.status} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 shadow-sm hover:border-primary hover:text-primary"
                                            onClick={() => {
                                                setSelectedReceipt(receipt);
                                                setIsDetailOpen(true);
                                            }}
                                        >
                                            Lihat Detail
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {meta.totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4">
                    <p className="text-sm text-slate-500 font-medium">
                        Menampilkan <span className="text-slate-900">{(meta.page - 1) * 10 + 1}</span> - <span className="text-slate-900">{Math.min(meta.page * 10, meta.total)}</span> dari <span className="text-slate-900">{meta.total}</span> data
                    </p>
                    <Pagination className="w-auto mx-0">
                        <PaginationContent>
                            <PaginationItem>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={meta.page <= 1}
                                    onClick={() => fetchHistory(type, meta.page - 1)}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            </PaginationItem>

                            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => {
                                // Simple range: current - 2 to current + 2
                                if (p === 1 || p === meta.totalPages || (p >= meta.page - 1 && p <= meta.page + 1)) {
                                    return (
                                        <PaginationItem key={p}>
                                            <Button
                                                variant={meta.page === p ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => fetchHistory(type, p)}
                                                className="h-8 w-8 p-0"
                                            >
                                                {p}
                                            </Button>
                                        </PaginationItem>
                                    );
                                } else if (p === meta.page - 2 || p === meta.page + 2) {
                                    return <PaginationItem key={p}><PaginationEllipsis /></PaginationItem>;
                                }
                                return null;
                            })}

                            <PaginationItem>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={meta.page >= meta.totalPages}
                                    onClick={() => fetchHistory(type, meta.page + 1)}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'ASLAP', 'KEPALA_DAPUR']}>
            <DashboardLayout
                title="Penerimaan Barang"
                description="Validasi barang masuk dari pembelian untuk menambah stok."
            >
                <div className="space-y-6 animate-in fade-in duration-500">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className={cn(
                            "grid w-full sm:max-w-md bg-muted p-1 rounded-xl shadow-inner",
                            (role === 'CHEF' || role === 'KEPALA_DAPUR') ? 'grid-cols-1' : 'grid-cols-2'
                        )}>
                            {role !== 'CHEF' && role !== 'KEPALA_DAPUR' && (
                                <TabsTrigger value="pending" className="rounded-lg py-2 transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    Menunggu Validasi ({pendingPurchases.length})
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="history" className="rounded-lg py-2 transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                Riwayat Penerimaan
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="pending" className="space-y-6 mt-6">
                            <Tabs defaultValue="PENDING_MASAK" className="w-full">
                                <div className="flex items-center justify-between mb-4 border-b border-slate-200">
                                    <TabsList className="bg-transparent h-auto p-0 gap-8">
                                        <TabsTrigger
                                            value="PENDING_MASAK"
                                            className="px-1 py-3 text-sm font-bold border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none shadow-none bg-transparent"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Utensils className="h-4 w-4" />
                                                <span>Bahan Masak</span>
                                                <Badge variant="secondary" className="ml-1 text-[10px] h-5 min-w-5 flex items-center justify-center p-0 rounded-full">
                                                    {pendingPurchases.filter(p => p.purchaseType !== 'OPERATIONAL').length}
                                                </Badge>
                                            </div>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="PENDING_OPERATIONAL"
                                            className="px-1 py-3 text-sm font-bold border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none shadow-none bg-transparent"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4" />
                                                <span>Barang Operasional</span>
                                                <Badge variant="secondary" className="ml-1 text-[10px] h-5 min-w-5 flex items-center justify-center p-0 rounded-full">
                                                    {pendingPurchases.filter(p => p.purchaseType === 'OPERATIONAL').length}
                                                </Badge>
                                            </div>
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="PENDING_MASAK" className="mt-0">
                                    {renderPendingTable(pendingPurchases.filter(p => p.purchaseType !== 'OPERATIONAL'))}
                                </TabsContent>
                                <TabsContent value="PENDING_OPERATIONAL" className="mt-0">
                                    {renderPendingTable(pendingPurchases.filter(p => p.purchaseType === 'OPERATIONAL'))}
                                </TabsContent>
                            </Tabs>
                        </TabsContent>

                        <TabsContent value="history" className="space-y-6 mt-6">
                            {/* Filter Section */}
                            <Card className="border-primary/20 shadow-sm overflow-hidden border-t-4 border-t-primary">
                                <CardContent className="p-4 sm:p-6">
                                    <DateFilter
                                        minimal
                                        onFilter={(startDate, endDate) => setFilterDate({ startDate, endDate })}
                                        isLoading={loadingMasak || loadingOperational}
                                    />
                                </CardContent>
                            </Card>

                            <Tabs value={historyType} onValueChange={(v: any) => setHistoryType(v)} className="w-full">
                                <div className="flex items-center justify-between mb-4 border-b border-slate-200">
                                    <TabsList className="bg-transparent h-auto p-0 gap-8">
                                        <TabsTrigger
                                            value="MASAK"
                                            className="px-1 py-3 text-sm font-bold border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none shadow-none bg-transparent"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Utensils className="h-4 w-4" />
                                                <span>Bahan Masak</span>
                                                <Badge variant="secondary" className="ml-1 text-[10px] h-5 min-w-5 flex items-center justify-center p-0 rounded-full">{metaMasak.total}</Badge>
                                            </div>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="OPERATIONAL"
                                            className="px-1 py-3 text-sm font-bold border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none shadow-none bg-transparent"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4" />
                                                <span>Barang Operasional</span>
                                                <Badge variant="secondary" className="ml-1 text-[10px] h-5 min-w-5 flex items-center justify-center p-0 rounded-full">{metaOperational.total}</Badge>
                                            </div>
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="MASAK" className="mt-0 focus-visible:outline-none">
                                    {renderHistoryTable(historyMasak, loadingMasak, metaMasak, 'MASAK')}
                                </TabsContent>

                                <TabsContent value="OPERATIONAL" className="mt-0 focus-visible:outline-none">
                                    {renderHistoryTable(historyOperational, loadingOperational, metaOperational, 'OPERATIONAL')}
                                </TabsContent>
                            </Tabs>
                        </TabsContent>
                    </Tabs>
                </div>

                {selectedPurchase && (
                    <ValidateReceiptDialog
                        open={isValidateOpen}
                        onOpenChange={setIsValidateOpen}
                        purchase={selectedPurchase}
                        onSuccess={() => {
                            setSelectedPurchase(null);
                            fetchPending();
                            fetchHistory('MASAK', 1);
                            fetchHistory('OPERATIONAL', 1);
                        }}
                    />
                )}

                {selectedReceipt && (
                    <ReceiptDetailDialog
                        open={isDetailOpen}
                        onOpenChange={setIsDetailOpen}
                        receipt={selectedReceipt}
                    />
                )}
            </DashboardLayout>
        </RouteGuard>
    );
}
