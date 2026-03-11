'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Eye, ChefHat, Utensils } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RouteGuard } from '@/components/RouteGuard';
import { getProductions } from '@/app/actions/productions';
import { getDailyMonitoring } from '@/app/actions/monitoring';
import { ProductionDialog } from '@/components/productions/ProductionDialog';
import { ProductionDetailDialog } from '@/components/productions/ProductionDetailDialog';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DateFilter } from '@/components/shared/DateFilter';



function LogTableRow({ prod, onViewDetail }: { prod: any, onViewDetail: (p: any) => void }) {
    return (
        <TableRow key={prod.id} className="hover:bg-muted/5">
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-medium text-xs text-muted-foreground uppercase">
                        {format(new Date(prod.date), 'EEEE', { locale: id })}
                    </span>
                    <span className="font-bold">
                        {format(new Date(prod.date), 'dd MMM yyyy')}
                    </span>
                    <span className="text-[10px] text-muted-foreground italic">
                        Jam: {format(new Date(prod.date), 'HH:mm')}
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <span className="font-bold text-sm">{prod.menuName}</span>
            </TableCell>
            <TableCell>
                {prod.photoUrl ? (
                    <div className="h-12 w-16 bg-muted rounded overflow-hidden border shadow-sm cursor-pointer hover:scale-105 transition-transform" onClick={() => onViewDetail(prod)}>
                        <img src={prod.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <span className="text-[10px] text-muted-foreground italic">Tanpa Foto</span>
                )}
            </TableCell>
            <TableCell>
                <div className="flex flex-col gap-1">
                    <span className="font-black text-blue-600 text-sm">{prod.portions} Porsi</span>
                    <div className="flex gap-1 overflow-x-auto pb-1 max-w-[200px]">
                        {prod.countKecil > 0 && <span className="text-[8px] bg-primary/5 text-primary border border-primary/10 px-1 rounded font-bold">K:{prod.countKecil}</span>}
                        {prod.countBesar > 0 && <span className="text-[8px] bg-accent/10 text-accent-foreground border border-accent/20 px-1 rounded font-bold">B:{prod.countBesar}</span>}
                        {prod.countBumil > 0 && <span className="text-[8px] bg-pink-50 text-pink-600 border border-pink-100 px-1 rounded font-bold">P:{prod.countBumil}</span>}
                        {prod.countBalita > 0 && <span className="text-[8px] bg-orange-50 text-orange-600 border border-orange-100 px-1 rounded font-bold">L:{prod.countBalita}</span>}
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <span className="font-semibold text-sm">{prod.chefName || '-'}</span>
            </TableCell>
            <TableCell className="text-right">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetail(prod)}
                    className="rounded-full"
                >
                    <Eye className="h-4 w-4 mr-1 text-primary" />
                    Detail
                </Button>
            </TableCell>
        </TableRow>
    );
}

export default function ProductionsPage() {
    const { role } = useAuth();
    const [productions, setProductions] = useState<any[]>([]);
    const [kitchenStatus, setKitchenStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedMenuId, setSelectedMenuId] = useState<string | undefined>(undefined);
    const [selectedProduction, setSelectedProduction] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [filterDate, setFilterDate] = useState({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });

    const canCreate = ['CHEF', 'SUPER_ADMIN'].includes(role || '');

    useEffect(() => {
        fetchData();
    }, [filterDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [prodData, monitorData] = await Promise.all([
                getProductions(filterDate.startDate, filterDate.endDate),
                getDailyMonitoring()
            ]);
            setProductions(prodData);
            if (monitorData.success) {
                setKitchenStatus(monitorData);
            }
        } catch (error) {
            toast.error('Gagal mengambil data produksi');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = (production: any) => {
        setSelectedProduction(production);
        setIsDetailOpen(true);
    };

    const handleOpenCreate = (menuId?: string) => {
        setSelectedMenuId(menuId);
        setIsCreateOpen(true);
    };

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CHEF', 'KEPALA_DAPUR', 'ASLAP']}>
            <DashboardLayout
                title="Produksi Masakan"
                description="Laporan hasil masak harian dan pemakaian bahan."
            >
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl shadow-sm">
                        <p className="text-xs font-bold text-primary uppercase mb-1">Total Menu Hari Ini</p>
                        <p className="text-2xl font-black text-primary">{kitchenStatus?.menus?.length || 0} <span className="text-sm font-normal text-muted-foreground ml-1">Menu</span></p>
                    </div>
                    <div className="p-4 bg-success/5 border border-success/10 rounded-xl shadow-sm">
                        <p className="text-xs font-bold text-success uppercase mb-1">Siap Dimasak (Bahan Lengkap)</p>
                        <p className="text-2xl font-black text-success">{kitchenStatus?.menus?.filter((m: any) => m.isReady).length || 0} <span className="text-sm font-normal text-muted-foreground ml-1">Menu</span></p>
                    </div>
                    <div className="p-4 bg-accent/5 border border-accent/10 rounded-xl shadow-sm">
                        <p className="text-xs font-bold text-accent-foreground uppercase mb-1">Selesai Produksi Log</p>
                        <p className="text-2xl font-black text-accent-foreground">{productions.length} <span className="text-sm font-normal text-muted-foreground ml-1">Baris</span></p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-4">
                    <h2 className="text-lg font-bold flex items-center">
                        <ChefHat className="mr-2 h-5 w-5 text-primary" />
                        Log Produksi & Status Antrian
                    </h2>
                    {canCreate && (
                        <Button onClick={() => handleOpenCreate()} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" />
                            Catat Hasil Masakan
                        </Button>
                    )}
                </div>

                <div className="mb-6">
                    <DateFilter
                        onFilter={(startDate, endDate) => setFilterDate({ startDate, endDate })}
                        isLoading={loading}
                    />
                </div>

                {/* Today's Menus Section */}
                {canCreate && kitchenStatus?.menus && kitchenStatus.menus.filter((m: any) => !m.isCompleted).length > 0 && (
                    <div className="mb-8 space-y-3">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Utensils className="h-4 w-4" /> Antrian Menu Hari Ini
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {kitchenStatus.menus.filter((m: any) => !m.isCompleted).map((m: any) => (
                                <div key={m.id} className={cn(
                                    "p-4 rounded-xl border-2 transition-all flex flex-col justify-between gap-4",
                                    m.isReady ? "bg-white border-green-100 shadow-sm" : "bg-muted/10 border-dashed border-muted"
                                )}>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-start">
                                            <Badge variant={m.menuType === 'KERING' ? 'outline' : 'secondary'} className={cn(
                                                "text-[9px] font-bold uppercase",
                                                m.menuType === 'KERING' ? "border-accent/20 text-accent-foreground bg-accent/10" : "bg-primary/10 text-primary"
                                            )}>
                                                {m.menuType === 'KERING' ? '🍪 Snack/Kering' : '🥘 Menu Masak'}
                                            </Badge>
                                            {m.isReady ? (
                                                <Badge className="bg-success text-success-foreground text-[8px] font-black">SIAP</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[8px] font-black border-primary/20 text-primary">{Math.round(m.progress)}% BAHAN</Badge>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm leading-tight">{m.name}</p>
                                            <p className="text-[10px] text-muted-foreground">Target: {(m.countBesar || 0) + (m.countKecil || 0) + (m.countBumil || 0) + (m.countBalita || 0)} Porsi</p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        className={cn(
                                            "w-full rounded-full font-bold text-xs",
                                            m.isReady ? "bg-primary hover:bg-primary/90 shadow-md shadow-primary/10" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        )}
                                        onClick={() => handleOpenCreate(m.id)}
                                    >
                                        {m.isReady ? 'Catat Produksi' : 'Bahan Belum Lengkap'}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-muted/30 p-4 rounded-lg mb-6 border border-dashed text-sm flex flex-wrap gap-4 items-center">
                    <span className="font-bold text-muted-foreground uppercase text-xs">Informasi Kesiapan Bahan:</span>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-success text-success-foreground border-success/20">🟢 SIAP DIMASAK</Badge>
                        <span className="text-xs">= Bahan di Monitoring sudah diterima 100% oleh ASLAP.</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent/20">🟡 MENUNGGU BAHAN</Badge>
                        <span className="text-xs">= Masih ada bahan yang belum diterima (PENDING).</span>
                    </div>
                </div>

                <div className="space-y-12">
                    {/* Menu Masak Table */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold flex items-center text-primary">
                            <Utensils className="mr-2 h-6 w-6" />
                            Log Produksi Menu Masak (Ompreng)
                        </h2>
                        <div className="border rounded-xl overflow-x-auto shadow-sm bg-white border-primary/10">
                            <Table className="min-w-[800px]">
                                <TableHeader className="bg-primary/5">
                                    <TableRow>
                                        <TableHead className="w-[180px]">Waktu Log</TableHead>
                                        <TableHead>Menu</TableHead>
                                        <TableHead>Foto Hasil</TableHead>
                                        <TableHead>Porsi Masak</TableHead>
                                        <TableHead>Chef</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8">Memuat...</TableCell></TableRow>
                                    ) : productions.filter(p => p.menuType === 'OMPRENG').length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">Belum ada data produksi masak.</TableCell></TableRow>
                                    ) : (
                                        productions.filter(p => p.menuType === 'OMPRENG').map((prod) => (
                                            <LogTableRow key={prod.id} prod={prod} onViewDetail={handleViewDetail} />
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Menu Kering Table */}
                    <div className="space-y-4 pb-12">
                        <h2 className="text-xl font-bold flex items-center text-accent-foreground">
                            <Badge variant="outline" className="mr-2 h-6 w-6 rounded-full border-amber-200 bg-amber-50 text-amber-600 flex items-center justify-center p-0">🍪</Badge>
                            Log Produksi Menu Kering / Snack
                        </h2>
                        <div className="border rounded-xl overflow-x-auto shadow-sm bg-white border-accent/20">
                            <Table className="min-w-[800px]">
                                <TableHeader className="bg-accent/5">
                                    <TableRow>
                                        <TableHead className="w-[180px]">Waktu Log</TableHead>
                                        <TableHead>Menu</TableHead>
                                        <TableHead>Foto Hasil</TableHead>
                                        <TableHead>Porsi Masak</TableHead>
                                        <TableHead>Chef</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8">Memuat...</TableCell></TableRow>
                                    ) : productions.filter(p => p.menuType === 'KERING').length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">Belum ada data produksi kering.</TableCell></TableRow>
                                    ) : (
                                        productions.filter(p => p.menuType === 'KERING').map((prod) => (
                                            <LogTableRow key={prod.id} prod={prod} onViewDetail={handleViewDetail} />
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                <ProductionDialog
                    open={isCreateOpen}
                    onOpenChange={setIsCreateOpen}
                    onSuccess={fetchData}
                    menuId={selectedMenuId}
                />

                <ProductionDetailDialog
                    open={isDetailOpen}
                    onOpenChange={setIsDetailOpen}
                    production={selectedProduction}
                />
            </DashboardLayout >
        </RouteGuard >
    );
}
