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
import { Plus, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RouteGuard } from '@/components/RouteGuard';
import { getProductions } from '@/app/actions/productions';
import { ProductionDialog } from '@/components/productions/ProductionDialog';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Production Detail Dialog Component (inline)
function ProductionDetailDialog({ open, onOpenChange, production }: any) {
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    if (!production) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detail Produksi</DialogTitle>
                        <DialogDescription>
                            Informasi lengkap produksi masakan
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Production Info */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                            <div>
                                <p className="text-sm text-muted-foreground">Menu</p>
                                <p className="font-semibold">{production.menuName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Tanggal</p>
                                <p className="font-semibold">
                                    {format(new Date(production.date), 'dd MMMM yyyy, HH:mm')}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Jumlah Porsi</p>
                                <Badge variant="secondary" className="mt-1">
                                    {production.portions} Porsi
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Chef</p>
                                <p className="font-semibold">{production.chefName || 'Unknown'}</p>
                            </div>
                        </div>

                        {/* Photo */}
                        {production.photoUrl && (
                            <div>
                                <p className="text-sm font-medium mb-2">Foto Hasil Masakan</p>
                                <div
                                    className="relative h-64 w-full cursor-pointer rounded-md overflow-hidden border"
                                    onClick={() => setLightboxImage(production.photoUrl)}
                                >
                                    <img
                                        src={production.photoUrl}
                                        alt="Foto masakan"
                                        className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Items Used */}
                        {production.items && production.items.length > 0 && (
                            <div>
                                <p className="text-sm font-medium mb-2">Bahan yang Digunakan</p>
                                <div className="border rounded-md overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Bahan</TableHead>
                                                <TableHead className="text-right">Qty Digunakan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {production.items.map((item: any, idx: number) => (
                                                <TableRow key={idx}>
                                                    <TableCell>{item.ingredientName}</TableCell>
                                                    <TableCell className="text-right">
                                                        {item.qtyUsed} {item.unit}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {production.note && (
                            <div>
                                <p className="text-sm font-medium mb-2">Catatan</p>
                                <div className="p-3 bg-muted rounded-md">
                                    <p className="text-sm">{production.note}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Lightbox for photo */}
            {lightboxImage && (
                <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
                    <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-0">
                        <DialogHeader className="p-4 pb-2">
                            <DialogTitle>Foto Hasil Masakan</DialogTitle>
                        </DialogHeader>
                        <div className="flex items-center justify-center p-4 pt-0">
                            <img
                                src={lightboxImage}
                                alt="Foto masakan"
                                className="max-w-full max-h-[80vh] object-contain rounded"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

export default function ProductionsPage() {
    const { role } = useAuth();
    const [productions, setProductions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedProduction, setSelectedProduction] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const canCreate = ['CHEF', 'SUPER_ADMIN'].includes(role || '');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getProductions();
            setProductions(data);
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

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CHEF']}>
            <DashboardLayout
                title="Produksi Masakan"
                description="Laporan hasil masak harian dan pemakaian bahan."
            >
                <div className="flex justify-between items-center mb-6">
                    <div></div>
                    {canCreate && (
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Catat Produksi
                        </Button>
                    )}
                </div>

                <div className="border rounded-md overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Menu</TableHead>
                                <TableHead>Porsi</TableHead>
                                <TableHead>Chef</TableHead>
                                <TableHead>Foto</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Memuat data...
                                    </TableCell>
                                </TableRow>
                            ) : productions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Belum ada data produksi masakan.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                productions.map((prod) => (
                                    <TableRow key={prod.id}>
                                        <TableCell>
                                            {format(new Date(prod.date), 'dd MMM yyyy, HH:mm')}
                                        </TableCell>
                                        <TableCell className="font-medium">{prod.menuName}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {prod.portions} Porsi
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{prod.chefName || '-'}</TableCell>
                                        <TableCell>
                                            {prod.photoUrl ? (
                                                <span className="text-green-600 text-sm">✓ Ada</span>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleViewDetail(prod)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                Detail
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <ProductionDialog
                    open={isCreateOpen}
                    onOpenChange={setIsCreateOpen}
                    onSuccess={fetchData}
                />

                <ProductionDetailDialog
                    open={isDetailOpen}
                    onOpenChange={setIsDetailOpen}
                    production={selectedProduction}
                />
            </DashboardLayout>
        </RouteGuard>
    );
}
