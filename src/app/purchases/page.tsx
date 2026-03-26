'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Plus, ShoppingCart, Eye, Trash2, Utensils, Package, Loader2, FileSpreadsheet, FileDown, Printer } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getPurchases, deletePurchase, getOperationalPurchases, getPendingFoodRequests, getPurchaseInvoice } from '@/app/actions/purchases';
import { CreatePurchaseDialog } from '@/components/purchases/CreatePurchaseDialog';
import { PurchaseDetailDialog } from '@/components/purchases/PurchaseDetailDialog';
import { OperationalRequestDetailDialog } from '@/components/purchases/OperationalRequestDetailDialog';
import { InvoicePrintView } from '@/components/purchases/InvoicePrintView';
import { toast } from 'sonner';
import { AlertConfirm } from '@/components/shared/AlertConfirm';
import { DateFilter } from '@/components/shared/DateFilter';
import { StatusBadge } from '@/components/shared/StatusBadge';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
import { cn, formatRecipeQty } from '@/lib/utils';
import { Skeleton } from "@/components/ui/skeleton";

// Helper to convert URL to Base64 (for jsPDF)
const urlToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg'));
            } else {
                reject(new Error('Canvas context is null'));
            }
        };
        img.onerror = (error) => reject(error);
    });
};

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
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [actionType, setActionType] = useState<'PRINT' | 'EXCEL' | 'NONE'>('NONE');

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

    const handlePrintInvoice = async (e: any, id: string, type: 'PRINT' | 'EXCEL' | 'PDF' = 'PRINT') => {
        e.stopPropagation();
        setLoading(true);
        try {
            const invoice = await getPurchaseInvoice(id);
            if (invoice && invoice.receipt) {
                if (type === 'EXCEL') {
                    generateExcel(invoice);
                } else if (type === 'PDF') {
                    generatePDF(invoice);
                } else {
                    // Start traditional print view in hidden mode or just trigger it
                    // Actually, to satisfy "No page transition", we render it but hidden from screen
                    setActionType('PRINT');
                    setSelectedInvoice(invoice);
                }
            } else {
                toast.error('Gagal memuat data atau belum ada penerimaan (Receipt).');
            }
        } catch (error) {
            toast.error('Gagal memuat data invoice.');
        } finally {
            setLoading(false);
        }
    };

    const generateExcel = (invoice: any) => {
        const wb = XLSX.utils.book_new();
        const isPlan = invoice.status !== 'approved';
        const title = isPlan ? 'RENCANA BELANJA' : 'INVOICE & TANDA TERIMA';
        const rows = [
            [title],
            ['No. Inv', `INV-${invoice.id.substring(0, 8).toUpperCase()}`],
            ['Tgl Beli', invoice.purchaseDate ? format(new Date(invoice.purchaseDate), 'dd MMMM yyyy') : '-'],
            ['Tgl Terima', invoice.receipt.receiveDate ? format(new Date(invoice.receipt.receiveDate), 'dd MMMM yyyy HH:mm') : 'MENUNGGU'],
            ['Pembuat', invoice.creatorName],
            ['Penerima (ASLAP)', invoice.receipt.receiverName || 'MENUNGGU'],
            ['Tipe', invoice.purchaseType],
            [''],
            ['No', 'Kategori', 'Nama Barang', 'Est./Tgt', 'B. Kotor', 'B. Bersih', 'Catatan ASLAP']
        ];

        let no = 1;
        ['MASAK', 'KERING', 'OPERASIONAL'].forEach((type) => {
            const items = invoice.receipt.items.filter((i: any) => i.category === type);
            if (items.length > 0) {
                const typeName = type === 'MASAK' ? 'Menu Masak' : type === 'KERING' ? 'Menu Kering/Snack' : 'Barang Operasional';
                items.forEach((item: any) => {
                    const target = item.targetQty || item.estimatedQty;
                    const targetFmt = formatRecipeQty(target, item.unit);
                    const kotorFmt = formatRecipeQty(item.grossWeight, item.unit);
                    const bersihFmt = formatRecipeQty(item.netWeight, item.unit);
                    rows.push([
                        no.toString(),
                        typeName,
                        item.ingredientName,
                        target > 0 ? `${targetFmt.stringValue} ${targetFmt.unit}` : '-',
                        `${kotorFmt.stringValue} ${kotorFmt.unit}`,
                        `${bersihFmt.stringValue} ${bersihFmt.unit}`,
                        item.note || '-'
                    ]);
                    no++;
                });
            }
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
        XLSX.writeFile(wb, `Invoice_${invoice.id.substring(0, 8)}.xlsx`);
        toast.success('Excel Invoice berhasil diunduh');
    };

    const generatePDF = async (invoice: any) => {
        const doc = new jsPDF();
        let yPos = 20;
        const isPlan = invoice.status !== 'approved';
        const title = isPlan ? 'RENCANA BELANJA' : 'INVOICE & TANDA TERIMA';

        // Header with Gempita Logo
        try {
            const primaryLogo = await urlToBase64('/Logo_Yayasan_GEMPITA_black.png');
            doc.addImage(primaryLogo, 'PNG', 14, 10, 35, 12, undefined, 'FAST');
        } catch (e) {
            console.error('Header logo failed to load', e);
        }
 
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text(title, 60, 20); 
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('Dapur Gempita', 60, 25);

        // Invoice Info (Right side)
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.text(`No. Inv: INV-${invoice.id.substring(0, 8).toUpperCase()}`, 145, 18);
        doc.text(`Tgl Beli: ${invoice.purchaseDate ? format(new Date(invoice.purchaseDate), 'dd MMM yyyy') : '-'}`, 145, 22);
        doc.text(`Tgl Terima: ${invoice.receipt.receiveDate ? format(new Date(invoice.receipt.receiveDate), 'dd MMM yyyy HH:mm') : 'MENUNGGU'}`, 145, 26);
 
        doc.setDrawColor(0, 0, 0);
        doc.line(14, 30, 196, 30);
        yPos = 38;
 
        // Purchase/Receipt Info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMASI PEMBELIAN', 14, yPos);
        doc.text(isPlan ? 'STATUS PENERIMAAN' : 'INFORMASI PENERIMAAN', 105, yPos);
        yPos += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(`Pembuat: ${invoice.creatorName}`, 14, yPos);
        if (isPlan) {
            doc.text('Menunggu penerimaan barang oleh ASLAP.', 105, yPos);
        } else {
            doc.text(`Penerima (ASLAP): ${invoice.receipt.receiverName}`, 105, yPos);
        }
        yPos += 10;

        // Items Table
        const tableRows: any[] = [];
        ['MASAK', 'KERING', 'OPERASIONAL'].forEach((type) => {
            const items = invoice.receipt.items.filter((i: any) => i.category === type);
            if (items.length > 0) {
                const typeName = type === 'MASAK' ? 'MENU MASAK' : type === 'KERING' ? 'MENU KERING/SNACK' : 'BARANG OPERASIONAL';
                tableRows.push([{ content: typeName, colSpan: 6, styles: { fillColor: [245, 245, 245], fontStyle: 'bold', textColor: [115, 2, 12] } }]);
                
                items.forEach((item: any, idx: number) => {
                    const target = item.targetQty || item.estimatedQty;
                    const targetFmt = formatRecipeQty(target, item.unit);
                    const kotorFmt = formatRecipeQty(item.grossWeight, item.unit);
                    const bersihFmt = formatRecipeQty(item.netWeight, item.unit);
                    
                    tableRows.push([
                        (idx + 1).toString(),
                        item.ingredientName + (item.note ? `\nNote: ${item.note}` : ''),
                        target > 0 ? `${targetFmt.stringValue} ${targetFmt.unit}` : '-',
                        `${kotorFmt.stringValue} ${kotorFmt.unit}`,
                        `${bersihFmt.stringValue} ${bersihFmt.unit}`,
                        '-'
                    ]);
                });
            }
        });

        autoTable(doc, {
            startY: yPos,
            head: [['No', 'Nama Barang', 'Target', 'B. Kotor', 'B. Bersih', 'Sign']],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [115, 2, 12], textColor: [255, 255, 255], fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 8 },
                1: { cellWidth: 'auto' },
                2: { halign: 'center', cellWidth: 20 },
                3: { halign: 'center', cellWidth: 20 },
                4: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
                5: { cellWidth: 15 }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        const pageHeight = doc.internal.pageSize.height;
        const footerY = pageHeight - 30; // Position footer logos 30mm from bottom
 
        // Footer signature (Center)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Disetujui Oleh,', 105, footerY - 15, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.receipt.receiverName || 'ASLAP', 105, footerY, { align: 'center' });
        doc.setFontSize(8);
        doc.text('ASLAP', 105, footerY + 5, { align: 'center' });

        // Footer Logos Split (BGN only in footer)
        try {
            const secondaryLogo = await urlToBase64('/Logo SPPG Bengkulu.png');
            // BGN Logo (Bottom Right)
            doc.addImage(secondaryLogo, 'PNG', 160, footerY - 5, 35, 7, undefined, 'FAST');
        } catch (e) {
            console.error('Footer logo failed to load', e);
        }

        doc.save(`Invoice_${invoice.id.substring(0, 8)}.pdf`);
        toast.success('PDF Invoice berhasil diunduh');
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
                        Array(5).fill(0).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-10 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                            </TableRow>
                        ))
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
                                        {['waiting', 'incomplete', 'approved'].includes(purchase.status) && canCreate && (
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 border-primary/20 text-primary hover:bg-primary/5"
                                                    title={purchase.status === 'approved' ? "Cetak Invoice / PDF" : "Cetak Rencana Belanja"}
                                                    onClick={(e) => handlePrintInvoice(e, purchase.id, 'PRINT')}
                                                    disabled={loading}
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                                                    title={purchase.status === 'approved' ? "Download PDF" : "Download PDF Rencana"}
                                                    onClick={(e) => handlePrintInvoice(e, purchase.id, 'PDF')}
                                                    disabled={loading}
                                                >
                                                    <FileDown className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 border-green-200 text-green-700 hover:bg-green-50"
                                                    title={purchase.status === 'approved' ? "Download Excel" : "Download Excel Rencana"}
                                                    onClick={(e) => handlePrintInvoice(e, purchase.id, 'EXCEL')}
                                                    disabled={loading}
                                                >
                                                    <FileSpreadsheet className="h-4 w-4" />
                                                </Button>
                                            </div>
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

                {selectedInvoice && (
                    <InvoicePrintView 
                        invoice={selectedInvoice} 
                        autoAction={actionType}
                        onClose={() => {
                            setSelectedInvoice(null);
                            setActionType('NONE');
                        }} 
                    />
                )}
            </DashboardLayout>
        </RouteGuard>
    );
}
