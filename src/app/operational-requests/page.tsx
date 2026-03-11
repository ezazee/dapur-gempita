'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, History, ClipboardList, Loader2, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { createOperationalRequest, getOperationalRequests } from '@/app/actions/operational-requests';
import { deletePurchase } from '@/app/actions/purchases';
import { format } from 'date-fns';
import { CreateOperationalRequestDialog } from '@/components/purchases/CreateOperationalRequestDialog';
import { OperationalRequestDetailDialog } from '@/components/purchases/OperationalRequestDetailDialog';
import { AlertConfirm } from '@/components/shared/AlertConfirm';
import { RouteGuard } from '@/components/RouteGuard';
import { DateFilter } from '@/components/shared/DateFilter';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cleanMemo } from '@/lib/mapping';

export default function OperationalRequestsPage() {
    // Requests state
    const [fetching, setFetching] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);

    // Dialog states
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Filters state
    const [filterDate, setFilterDate] = useState({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });

    const { role } = useAuth();
    const isKepalaDapur = role === 'KEPALA_DAPUR';

    useEffect(() => {
        fetchRequests();
    }, [filterDate]);

    const fetchRequests = async () => {
        setFetching(true);
        try {
            const data = await getOperationalRequests(filterDate);
            setRequests(data);
        } catch (error) {
            toast.error('Gagal memuat riwayat request');
        } finally {
            setFetching(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await deletePurchase(id);
            if (res.success) {
                toast.success('Request berhasil dihapus');
                fetchRequests();
            } else {
                toast.error(res.error || 'Gagal menghapus request');
            }
        } catch (error) {
            toast.error('Terjadi kesalahan saat menghapus');
        } finally {
            setDeleteId(null);
        }
    };


    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'ASLAP', 'KEPALA_DAPUR']}>
            <DashboardLayout title="Request Barang Operasional">
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Kebutuhan Barang Operasional</h2>
                            <p className="text-muted-foreground">
                                Pantau dan ajukan permintaan pembelian barang operasional dapur ke bagian Keuangan.
                            </p>
                        </div>
                        {!isKepalaDapur && (
                            <Button
                                onClick={() => setIsDialogOpen(true)}
                                className="bg-primary hover:bg-primary/90 text-white w-full md:w-auto"
                            >
                                <Plus className="h-4 w-4 mr-2" /> Ajukan Baru
                            </Button>
                        )}
                    </div>

                    <DateFilter
                        onFilter={(startDate, endDate) => setFilterDate({ startDate, endDate })}
                        isLoading={fetching}
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5 text-muted-foreground" />
                                Riwayat Pengajuan
                            </CardTitle>
                            <CardDescription>Daftar semua request barang operasional yang pernah diajukan.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {fetching ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                    <p>Memuat riwayat...</p>
                                </div>
                            ) : requests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <ClipboardList className="h-12 w-12 mb-4 opacity-20" />
                                    <p>Belum ada request yang diajukan.</p>
                                    {!isKepalaDapur && (
                                        <Button
                                            variant="link"
                                            onClick={() => setIsDialogOpen(true)}
                                            className="mt-2"
                                        >
                                            Buat pengajuan pertama Anda
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Tanggal</TableHead>
                                                <TableHead>Item</TableHead>
                                                <TableHead>Catatan</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Aksi</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {requests.map((req) => (
                                                <TableRow key={req.id}>
                                                    <TableCell className="font-medium">
                                                        {format(new Date(req.createdAt), 'dd MMM yyyy')}
                                                        <span className="block text-[10px] text-muted-foreground">Jam {format(new Date(req.createdAt), 'HH:mm')}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            {(() => {
                                                                const aggregatedItems = req.items.reduce((acc: any[], item: any) => {
                                                                    const existing = acc.find(i => i.ingredientName === item.ingredientName);
                                                                    if (existing) {
                                                                        existing.estimatedQty += Number(item.estimatedQty) || 0;
                                                                    } else {
                                                                        acc.push({ ...item, estimatedQty: Number(item.estimatedQty) || 0 });
                                                                    }
                                                                    return acc;
                                                                }, []);

                                                                return aggregatedItems.map((item: any, idx: number) => (
                                                                    <div key={idx} className="text-xs">
                                                                        • {item.ingredientName} <span className="text-muted-foreground">({item.estimatedQty} {item.ingredientUnit || 'PCS'})</span>
                                                                    </div>
                                                                ));
                                                            })()}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs italic text-muted-foreground w-[220px]">
                                                        <div className="flex flex-col gap-1">
                                                            {(() => {
                                                                const uniqueMemos = Array.from(new Set(req.items.map((i: any) => i.memo).filter(Boolean))) as string[];
                                                                const displayNotes = uniqueMemos;

                                                                if (displayNotes.length === 0) return <span className="text-muted-foreground/50">-</span>;

                                                                return displayNotes.map((n, idx) => (
                                                                    <div key={idx} className="truncate" title={n}>
                                                                        {displayNotes.length > 1 && <span className="font-semibold not-italic text-primary mr-1">{idx + 1}.</span>}
                                                                        {n}
                                                                    </div>
                                                                ));
                                                            })()}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusBadge status={req.status} />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                className="bg-primary hover:bg-primary/90 text-white border-none text-[11px] h-8"
                                                                onClick={() => {
                                                                    setSelectedRequest(req);
                                                                    setIsDetailOpen(true);
                                                                }}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                <span className="sr-only">Detail</span>
                                                            </Button>
                                                            {req.status === 'waiting' && (
                                                                <>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-primary border-primary/20 hover:bg-primary/5"
                                                                        onClick={() => {
                                                                            setSelectedRequest(req);
                                                                            setIsEditOpen(true);
                                                                        }}
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                        <span className="sr-only">Edit</span>
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                                                                        onClick={() => setDeleteId(req.id)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                        <span className="sr-only">Hapus</span>
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <CreateOperationalRequestDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    onSuccess={fetchRequests}
                />

                <CreateOperationalRequestDialog
                    open={isEditOpen}
                    onOpenChange={(open) => {
                        setIsEditOpen(open);
                        if (!open) setSelectedRequest(null);
                    }}
                    onSuccess={fetchRequests}
                    initialData={selectedRequest}
                />

                <OperationalRequestDetailDialog
                    open={isDetailOpen}
                    onOpenChange={(open) => {
                        setIsDetailOpen(open);
                        if (!open) setSelectedRequest(null);
                    }}
                    request={selectedRequest}
                />

                <AlertConfirm
                    open={!!deleteId}
                    onOpenChange={(open) => !open && setDeleteId(null)}
                    title="Hapus Request"
                    description="Apakah Anda yakin ingin membatalkan dan menghapus request operasional ini?"
                    confirmText="Ya, Hapus"
                    cancelText="Batal"
                    variant="destructive"
                    onConfirm={() => deleteId && handleDelete(deleteId)}
                />
            </DashboardLayout>
        </RouteGuard >
    );
}
