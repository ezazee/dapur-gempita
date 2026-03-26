'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    FileDown, FileSpreadsheet, Calendar, Image as ImageIcon,
    Printer, AlertTriangle, CheckCircle2, ClipboardList,
    ShoppingCart, Warehouse, Utensils, BarChart3, Search
} from 'lucide-react';
import { getReportData } from '@/app/actions/reports';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { RouteGuard } from '@/components/RouteGuard';
import { DateFilter } from '@/components/shared/DateFilter';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn, formatRecipeQty } from '@/lib/utils';

// Helper to convert URL to Base64
const urlToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
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

type ReportType = 'combined' | 'purchase' | 'inventory' | 'evaluation' | 'menu';

export default function ReportsPage() {
    const { role } = useAuth();
    const today = new Date();

    const todayStr = format(today, 'yyyy-MM-dd');

    // Filters state
    const [filterDate, setFilterDate] = useState({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });
    const [reportType, setReportType] = useState<ReportType>('combined');
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<any>(null);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [logoBase64, setLogoBase64] = useState<string | null>(null);
    const [secondaryLogoBase64, setSecondaryLogoBase64] = useState<string | null>(null);

    // Pre-load logos for PDF
    useEffect(() => {
        urlToBase64('/Logo_Yayasan_GEMPITA_black.png')
            .then(base64 => setLogoBase64(base64))
            .catch(err => console.error('Failed to load primary logo:', err));

        urlToBase64('/Logo SPPG Bengkulu.png')
            .then(base64 => setSecondaryLogoBase64(base64))
            .catch(err => console.error('Failed to load secondary logo:', err));
    }, []);

    const isReadOnly = role === 'KEPALA_DAPUR';

    const fetchReport = async () => {
        setLoading(true);
        try {
            const result = await getReportData({
                startDate: filterDate.startDate,
                endDate: filterDate.endDate,
                type: reportType
            });
            if (result.error) {
                toast.error(result.error);
                return;
            }
            setReportData(result.data);
            toast.success('Laporan berhasil dimuat');
        } catch (error) {
            toast.error('Gagal memuat laporan');
        } finally {
            setLoading(false);
        }
    };

    // Auto load on mount
    useEffect(() => {
        fetchReport();
    }, [filterDate, reportType]);

    const handlePrint = () => {
        window.print();
    };

    const exportToExcel = () => {
        if (!reportData) {
            toast.error('Tidak ada data untuk diekspor');
            return;
        }

        const wb = XLSX.utils.book_new();

        // Sheet: Inventory
        if (reportData.inventory) {
            const categories = ['MASAK', 'KERING', 'OPERASIONAL'];
            categories.forEach(cat => {
                const filtered = reportData.inventory.filter((i: any) => i.category === cat);
                if (filtered.length > 0) {
                    const rows = [['Nama Bahan', 'Kategori', 'Stok Saat Ini', 'Minimal Stok', 'Satuan', 'Status']];
                    filtered.forEach((i: any) => {
                        const formatted = formatRecipeQty(i.currentStock, i.unit);
                        const formattedMin = formatRecipeQty(i.minimumStock, i.unit);
                        rows.push([i.name, i.category, formatted.stringValue, formattedMin.stringValue, formatted.unit, i.status === 'low' ? 'STOK RENDAH' : 'OK']);
                    });
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), `Gudang - ${cat}`);
                }
            });
        }

        // Sheet: Purchases
        if (reportData.purchases) {
            const categories = ['MASAK', 'KERING', 'OPERASIONAL'];
            categories.forEach(cat => {
                const pRows: any[] = [['ID Transaksi', 'Tanggal', 'Bahan', 'Qty', 'Satuan', 'Status Purchasing', 'Foto', 'Catatan']];
                let hasData = false;
                reportData.purchases.forEach((p: any) => {
                    const catItems = p.items.filter((item: any) => item.category === cat);
                    if (catItems.length > 0) {
                        catItems.forEach((item: any) => {
                            const formatted = formatRecipeQty(item.qty, item.unit);
                            pRows.push([p.id.substring(0, 8), format(new Date(p.date), 'dd/MM/yyyy'), item.name, formatted.stringValue, formatted.unit, p.status, item.photoUrl ? '[ADA FOTO]' : '-', item.memo || '-']);
                            hasData = true;
                        });
                        // Add empty row as separator between transactions
                        pRows.push([]);
                    }
                });
                if (hasData) {
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pRows), `Pembelian - ${cat}`);
                }
            });
        }

        // Sheet: Menus
        if (reportData.menus) {
            const types = ['OMPRENG', 'KERING'];
            types.forEach(type => {
                const filtered = reportData.menus.filter((m: any) => m.type === type);
                if (filtered.length > 0) {
                    const rows = [['Tanggal', 'Menu', 'Bahan', 'Qty Dibutuhkan', 'Unit']];
                    filtered.forEach((m: any) => {
                        m.ingredients.forEach((i: any) => {
                            const formatted = formatRecipeQty(i.qtyNeeded, i.unit);
                            rows.push([format(new Date(m.date), 'dd/MM/yyyy'), m.name, i.name, formatted.stringValue, formatted.unit]);
                        });
                    });
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), `Menu - ${type === 'OMPRENG' ? 'MASAK' : 'KERING'}`);
                }
            });
        }

        // Sheet: Evaluations
        if (reportData.evaluations) {
            const types = ['OMPRENG', 'KERING'];
            types.forEach(type => {
                const filtered = reportData.evaluations.filter((e: any) => e.menuType === type);
                if (filtered.length > 0) {
                    const rows = [['Tanggal', 'Menu', 'Foto', 'Porsi', 'Ketepatan (%)', 'Pas', 'Bermasalah', 'Total Bahan', 'Status', 'Catatan']];
                    filtered.forEach((e: any) => {
                        rows.push([
                            format(new Date(e.date), 'dd/MM/yyyy'),
                            e.menuName,
                            e.photoUrl ? '[ADA FOTO]' : '-',
                            e.portions,
                            `${e.accuracy}%`,
                            e.pas,
                            e.bermasalah,
                            e.totalIngredients,
                            e.status,
                            e.note || '-'
                        ]);
                    });
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), `Evaluasi - ${type === 'OMPRENG' ? 'MASAK' : 'KERING'}`);
                }
            });
        }

        // Sheet: Frequent Menus
        if (reportData.frequentMenus && reportData.frequentMenus.length > 0) {
            const rows = [['Rank', 'Nama Menu', 'Frekuensi', 'Tipe']];
            reportData.frequentMenus.forEach((m: any, idx: number) => {
                rows.push([idx + 1, m.name, m.count, m.type]);
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Menu Terpopuler');
        }

        XLSX.writeFile(wb, `Laporan_${reportType}_${filterDate.startDate}_ke_${filterDate.endDate}.xlsx`);
    };

    const exportToPDF = async () => {
        if (!reportData) return;
        setExporting(true);
        const doc = new jsPDF();

        doc.setFontSize(18);
        // Header Logo (Gempita)
        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', 14, 10, 35, 12, undefined, 'FAST');
        }
 
        doc.setFontSize(18);
        doc.setTextColor(115, 2, 12); // #73020C Maroon
        doc.text('LAPORAN OPERASIONAL DAPUR GEMPITA', 60, 20);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Periode: ${filterDate.startDate} s/d ${filterDate.endDate}`, 60, 28);
        doc.text(`Tipe: ${reportType.toUpperCase()}`, 60, 33);

        let yPos = 45;

        // Inventory Table
        if (reportData.inventory) {
            const categories = ['MASAK', 'KERING', 'OPERASIONAL'];
            categories.forEach(cat => {
                const filtered = reportData.inventory.filter((i: any) => i.category === cat);
                if (filtered.length === 0) return;

                if (yPos > 240) { doc.addPage(); yPos = 20; }
                doc.setFontSize(14);
                doc.setTextColor(115, 2, 12);
                doc.text(`Status Inventaris: ${cat}`, 14, yPos);

                autoTable(doc, {
                    startY: yPos + 5,
                    head: [['Bahan', 'Stok', 'Min', 'Satuan']],
                    body: filtered.map((i: any) => {
                        const formatted = formatRecipeQty(i.currentStock, i.unit);
                        const formattedMin = formatRecipeQty(i.minimumStock, i.unit);
                        return [i.name, formatted.stringValue, formattedMin.stringValue, formatted.unit];
                    }),
                    theme: 'grid',
                    headStyles: { fillColor: [115, 2, 12] }
                });
                yPos = (doc as any).lastAutoTable.finalY + 15;
            });
        }

        // Purchase Table
        if (reportData.purchases) {
            const categories = ['MASAK', 'KERING', 'OPERASIONAL'];
            categories.forEach(cat => {
                const transactions: any[] = [];
                reportData.purchases.forEach((p: any) => {
                    const catItems = p.items.filter((item: any) => item.category === cat);
                    if (catItems.length > 0) {
                        transactions.push({ p, items: catItems });
                    }
                });

                if (transactions.length === 0) return;

                if (yPos > 240) { doc.addPage(); yPos = 20; }
                doc.setFontSize(14);
                doc.setTextColor(115, 2, 12);
                doc.text(`Laporan Pembelian: ${cat}`, 14, yPos);
                yPos += 5;

                transactions.forEach((trans) => {
                    const { p, items } = trans;
                    if (yPos > 240) { doc.addPage(); yPos = 20; }

                    doc.setFontSize(10);
                    doc.setTextColor(80, 80, 80);
                    doc.text(`Transaksi: ${format(new Date(p.date), 'dd/MM/yyyy')} | Status: ${p.status.toUpperCase()}`, 14, yPos + 5);

                    autoTable(doc, {
                        startY: yPos + 7,
                        head: [['Bahan', 'Qty', 'Unit', 'Foto', 'Catatan']],
                        body: items.map((item: any) => {
                            const formatted = formatRecipeQty(item.qty, item.unit);
                            return [item.name, formatted.stringValue, formatted.unit, item.photoUrl ? '[ADA FOTO]' : '-', item.memo || '-'];
                        }),
                        theme: 'grid',
                        headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
                        margin: { left: 20 }
                    });
                    yPos = (doc as any).lastAutoTable.finalY + 10;
                });
                yPos += 5;
            });
        }

        // Menu Table
        if (reportData.menus) {
            const types = ['OMPRENG', 'KERING'];
            types.forEach(type => {
                const filtered = reportData.menus.filter((m: any) => m.type === type);
                if (filtered.length === 0) return;

                if (yPos > 240) { doc.addPage(); yPos = 20; }
                doc.setFontSize(14);
                doc.setTextColor(115, 2, 12);
                doc.text(`Laporan Menu: ${type === 'OMPRENG' ? 'MASAK' : 'KERING'}`, 14, yPos);

                const mRows: any[] = [];
                filtered.forEach((m: any) => {
                    m.ingredients.forEach((i: any) => {
                        const formatted = formatRecipeQty(i.qtyNeeded, i.unit);
                        mRows.push([format(new Date(m.date), 'dd/MM/yy'), m.name, i.name, formatted.stringValue, formatted.unit]);
                    });
                });

                autoTable(doc, {
                    startY: yPos + 5,
                    head: [['Tgl', 'Menu', 'Bahan', 'Qty', 'Unit']],
                    body: mRows,
                    theme: 'grid',
                    headStyles: { fillColor: [115, 2, 12] } // Maroon
                });
                yPos = (doc as any).lastAutoTable.finalY + 15;
            });
        }

        // Evaluation Table
        if (reportData.evaluations) {
            const types = ['OMPRENG', 'KERING'];
            types.forEach(type => {
                const filtered = reportData.evaluations.filter((e: any) => e.menuType === type);
                if (filtered.length === 0) return;

                if (yPos > 240) { doc.addPage(); yPos = 20; }
                doc.setFontSize(14);
                doc.setTextColor(115, 2, 12);
                doc.text(`Laporan Evaluasi Gizi: ${type === 'OMPRENG' ? 'MASAK' : 'KERING'}`, 14, yPos);

                const eRows: any[] = filtered.map((e: any) => [
                    format(new Date(e.date), 'dd/MM/yy'),
                    e.menuName,
                    e.photoUrl ? '[ADA FOTO]' : '-',
                    e.portions,
                    `${e.accuracy}%`,
                    e.pas,
                    e.bermasalah,
                    e.status
                ]);

                autoTable(doc, {
                    startY: yPos + 5,
                    head: [['Tgl', 'Menu', 'Foto', 'Pax', 'Akurasi', 'Pas', 'Msalah', 'Status']],
                    body: eRows,
                    theme: 'grid',
                    headStyles: { fillColor: [115, 2, 12] } // Maroon
                });
                yPos = (doc as any).lastAutoTable.finalY + 15;
            });
        }

        // Section: Menu Terpopuler
        if (reportData.frequentMenus && reportData.frequentMenus.length > 0) {
            if (yPos > 240) { doc.addPage(); yPos = 20; }
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text('Analisis Menu Terpopuler (Sering Digunakan)', 14, yPos);

            const fRows = reportData.frequentMenus.map((m: any, idx: number) => [
                `#${idx + 1}`,
                m.name,
                `${m.count} Kali`,
                m.type
            ]);

            autoTable(doc, {
                startY: yPos + 5,
                head: [['Rank', 'Nama Menu', 'Frekuensi', 'Tipe']],
                body: fRows,
                theme: 'striped',
                headStyles: { fillColor: [217, 119, 6] } // Amber-600 ish
            });
            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        // Footer Logos Split (BGN only in footer)
        const pageHeight = doc.internal.pageSize.height;
        if (yPos > pageHeight - 40) { doc.addPage(); yPos = 20; }
        
        const footerY = pageHeight - 30;
        try {
            if (secondaryLogoBase64) {
                doc.addImage(secondaryLogoBase64, 'PNG', 160, footerY, 35, 10, undefined, 'FAST');
            }
        } catch (e) {
            console.error('Footer logo failed', e);
        }

        doc.save(`Laporan_${reportType}.pdf`);
        setExporting(false);
    };

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'KEPALA_DAPUR']}>
            <DashboardLayout
                title="Sistem Pelaporan"
                description="Hasilkan laporan detail untuk inventaris, pembelian, dan produksi."
            >
                <div className="grid gap-6 print:block w-full max-w-full overflow-x-hidden">
                    {/* Filters - Hidden in print */}
                    <div className="print:hidden">
                        <Card className="border-primary/20 shadow-sm overflow-hidden border-t-4 border-t-primary">
                            <CardContent className="p-4 sm:p-6 space-y-6">
                                <DateFilter
                                    minimal
                                    onFilter={(startDate, endDate) => setFilterDate({ startDate, endDate })}
                                    isLoading={loading}
                                />

                                <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-4 pt-4 border-t border-slate-100">
                                    <div className="space-y-1 w-full lg:w-auto">
                                        <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
                                            <ClipboardList className="h-3 w-3 text-primary" /> Tipe Laporan
                                        </Label>
                                        <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                                            <SelectTrigger className="w-full lg:w-[280px] border-primary/20 bg-white h-10 rounded-lg">
                                                <SelectValue placeholder="Pilih Tipe Laporan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="combined">Semua Laporan (Terpadu)</SelectItem>
                                                <SelectItem value="inventory">Laporan Stok Gudang</SelectItem>
                                                <SelectItem value="purchase">Laporan Pembelian Barang</SelectItem>
                                                <SelectItem value="menu">Laporan Kebutuhan Menu</SelectItem>
                                                <SelectItem value="evaluation">Laporan Evaluasi Gizi</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-1 sm:flex sm:flex-row gap-2 w-full lg:w-auto">
                                        <Button variant="outline" className="flex gap-2 justify-center h-10 shadow-sm hover:bg-slate-50 transition-colors w-full sm:w-auto rounded-lg" onClick={handlePrint}>
                                            <Printer className="h-4 w-4" /> Cetak
                                        </Button>
                                        <Button variant="outline" className="flex gap-2 justify-center text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-10 shadow-sm transition-colors w-full sm:w-auto rounded-lg" onClick={exportToExcel}>
                                            <FileSpreadsheet className="h-4 w-4" /> Excel
                                        </Button>
                                        <Button variant="outline" className="flex gap-2 justify-center text-rose-600 border-rose-200 hover:bg-rose-50 h-10 shadow-sm transition-colors w-full sm:w-auto rounded-lg" onClick={exportToPDF} disabled={exporting}>
                                            <FileDown className="h-4 w-4" /> {exporting ? 'Proses...' : 'PDF'}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary Cards - Grid */}
                    {reportData?.summary && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 print:hidden">
                            <Card className="bg-white border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <ShoppingCart className="h-5 w-5 text-primary mb-1" />
                                    <div className="text-2xl font-bold">{reportData.summary.totalPurchases}</div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Pesanan</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white border-l-4 border-l-accent shadow-sm hover:shadow-md transition-all">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <Warehouse className="h-5 w-5 text-accent-foreground mb-1" />
                                    <div className="text-2xl font-bold text-accent-foreground">{reportData.summary.lowStockCount}</div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Stok Rendah</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white border-l-4 border-l-success shadow-sm hover:shadow-md transition-all">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <Utensils className="h-5 w-5 text-success mb-1" />
                                    <div className="text-2xl font-bold">{reportData.summary.totalProductions}</div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Produksi</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white border-l-4 border-l-primary/60 shadow-sm hover:shadow-md transition-all">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <BarChart3 className="h-5 w-5 text-primary mb-1" />
                                    <div className="text-2xl font-bold">{reportData.summary.totalPortions}</div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Porsi</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-all sm:col-span-2 lg:col-span-1">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <ClipboardList className="h-5 w-5 text-purple-500 mb-1" />
                                    <div className="text-2xl font-bold">{reportData.summary.totalMenus}</div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Menu</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {loading ? (
                        <div className="space-y-8 bg-white w-full max-w-full overflow-hidden p-6 rounded-xl border">
                            <div className="space-y-4">
                                <Skeleton className="h-8 w-64" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <Skeleton className="h-8 w-64" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Skeleton className="h-64 w-full rounded-xl" />
                                    <Skeleton className="h-64 w-full rounded-xl" />
                                </div>
                            </div>
                        </div>
                    ) : reportData ? (
                        <div className="space-y-8 bg-white print:p-0 print:m-0 w-full max-w-full overflow-hidden">
                            {/* Header for print only */}
                            <div className="hidden print:flex items-center justify-between mb-8 border-b-2 border-primary pb-6">
                                <div className="flex items-center gap-6">
                                    <div className="relative h-12 w-32">
                                        <Image src="/Logo_Yayasan_GEMPITA_black.png" alt="Gempita Logo" width={128} height={48} className="object-contain" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold text-primary mb-1">LAPORAN OPERASIONAL</h1>
                                        <h2 className="text-xl font-medium text-slate-600">Dapur Gempita - Layanan Makanan</h2>
                                        <div className="mt-4 flex gap-6 text-sm text-slate-500">
                                            <p><span className="font-semibold text-slate-700">Periode:</span> {filterDate.startDate} s/d {filterDate.endDate}</p>
                                            <p><span className="font-semibold text-slate-700">Dicetak:</span> {format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 1. Inventory Report Section */}
                            {(reportType === 'inventory' || reportType === 'combined') && reportData.inventory && (
                                <section className="break-inside-avoid">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                            <Warehouse className="h-5 w-5 text-amber-600 print:hidden" />
                                            Laporan Inventaris (Gudang)
                                        </h3>
                                    </div>
                                    {['MASAK', 'KERING', 'OPERASIONAL'].map(cat => {
                                        const filtered = reportData.inventory.filter((i: any) => i.category === cat);
                                        if (filtered.length === 0) return null;
                                        return (
                                            <div key={cat} className="mb-8 last:mb-0">
                                                <h4 className="text-sm font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">
                                                    {cat === 'MASAK' ? 'Bahan Menu Masak' : cat === 'KERING' ? 'Bahan Menu Kering' : 'Barang Operasional'}
                                                </h4>
                                                <div className="rounded-xl border shadow-sm overflow-x-auto bg-white w-full">
                                                    <Table className="min-w-[700px]">
                                                        <TableHeader className="bg-slate-50">
                                                            <TableRow>
                                                                <TableHead className="w-[300px]">Nama Bahan</TableHead>
                                                                <TableHead className="text-right">Stok</TableHead>
                                                                <TableHead className="text-right">Min</TableHead>
                                                                <TableHead>Satuan</TableHead>
                                                                <TableHead className="text-center print:hidden">Status</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {filtered.map((i: any) => (
                                                                <TableRow key={i.id} className={i.status === 'low' ? 'bg-destructive/10' : ''}>
                                                                    <TableCell className="font-medium">{i.name}</TableCell>
                                                                    <TableCell className={cn("text-right font-bold", i.status === 'low' ? 'text-destructive' : 'text-slate-900')}>
                                                                        {formatRecipeQty(i.currentStock, i.unit).stringValue}
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-muted-foreground">
                                                                        {formatRecipeQty(i.minimumStock, i.unit).stringValue}
                                                                    </TableCell>
                                                                    <TableCell>{formatRecipeQty(i.currentStock, i.unit).unit}</TableCell>
                                                                    <TableCell className="text-center print:hidden">
                                                                        {i.status === 'low' ? (
                                                                            <Badge className="bg-destructive hover:bg-destructive/90">RENDAH</Badge>
                                                                        ) : (
                                                                            <Badge className="bg-success hover:bg-success/90">OK</Badge>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </section>
                            )}

                            {/* 2. Purchase Report Section */}
                            {(reportType === 'purchase' || reportType === 'combined') && reportData.purchases && (
                                <section className="break-inside-avoid">
                                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <ShoppingCart className="h-5 w-5 text-blue-600 print:hidden" />
                                        Laporan Pembelian
                                    </h3>
                                    {['MASAK', 'KERING', 'OPERASIONAL'].map(cat => {
                                        const transactions: any[] = [];
                                        reportData.purchases.forEach((p: any) => {
                                            const catItems = p.items.filter((item: any) => item.category === cat);
                                            if (catItems.length > 0) {
                                                transactions.push({ ...p, catItems });
                                            }
                                        });

                                        if (transactions.length === 0) return null;

                                        return (
                                            <div key={cat} className="mb-8 last:mb-0">
                                                <h4 className="text-sm font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">
                                                    {cat === 'MASAK' ? 'Pembelian Bahan Masak' : cat === 'KERING' ? 'Pembelian Bahan Kering' : 'Pembelian Barang Operasional'}
                                                </h4>

                                                <div className="space-y-4">
                                                    {transactions.map((trans) => (
                                                        <div key={trans.id} className="rounded-xl border shadow-sm overflow-x-auto bg-white w-full">
                                                            <div className="bg-slate-50 px-4 py-2 border-b flex justify-between items-center">
                                                                <div className="flex items-center gap-4">
                                                                    <span className="font-bold text-slate-700">{format(new Date(trans.date), 'dd MMMM yyyy')}</span>
                                                                    <span className="text-xs text-slate-400 font-mono">ID: {trans.id.substring(0, 8)}</span>
                                                                </div>
                                                                <StatusBadge status={trans.status} />
                                                            </div>
                                                            <Table className="min-w-[700px]">
                                                                <TableHeader>
                                                                    <TableRow className="hover:bg-transparent border-none">
                                                                        <TableHead className="py-2">Bahan</TableHead>
                                                                        <TableHead className="text-right py-2">Qty</TableHead>
                                                                        <TableHead className="py-2">Unit</TableHead>
                                                                        <TableHead className="py-2">Foto</TableHead>
                                                                        <TableHead className="print:hidden py-2">Catatan</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {trans.catItems.map((item: any, idx: number) => (
                                                                        <TableRow key={`${trans.id}-${idx}`}>
                                                                            <TableCell className="font-medium">{item.name}</TableCell>
                                                                            <TableCell className="text-right font-semibold">
                                                                                {formatRecipeQty(item.qty, item.unit).stringValue}
                                                                            </TableCell>
                                                                            <TableCell>{formatRecipeQty(item.qty, item.unit).unit}</TableCell>
                                                                            <TableCell>
                                                                                {item.photoUrl ? (
                                                                                    <div
                                                                                        className="relative h-10 w-10 rounded-md border border-slate-200 overflow-hidden cursor-pointer hover:opacity-80 transition-all print:h-16 print:w-16"
                                                                                        onClick={() => setLightboxImage(item.photoUrl)}
                                                                                    >
                                                                                        <Image src={item.photoUrl} alt="Foto Bahan" fill className="object-cover" />
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="h-10 w-10 flex items-center justify-center bg-slate-50 rounded-md border border-slate-100 print:hidden">
                                                                                        <ImageIcon className="h-4 w-4 text-slate-300" />
                                                                                    </div>
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground print:hidden">
                                                                                {item.memo || '-'}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </section>
                            )}

                            {/* 3. Menu Report Section */}
                            {(reportType === 'menu' || reportType === 'combined') && reportData.menus && (
                                <section className="break-inside-avoid">
                                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Utensils className="h-5 w-5 text-purple-600 print:hidden" />
                                        Daftar Menu & Kebutuhan Bahan
                                    </h3>
                                    <div className="rounded-xl border shadow-sm overflow-x-auto bg-white w-full">
                                        {['OMPRENG', 'KERING'].map(type => {
                                            const filtered = reportData.menus.filter((m: any) => m.type === type);
                                            if (filtered.length === 0) return null;
                                            return (
                                                <div key={type} className="mb-8 last:mb-0">
                                                    <h4 className="text-sm font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">
                                                        {type === 'OMPRENG' ? 'Menu Masak' : 'Menu Kering'}
                                                    </h4>
                                                    <div className="rounded-xl border shadow-sm overflow-x-auto bg-white w-full">
                                                        <Table className="min-w-[700px]">
                                                            <TableHeader className="bg-slate-50">
                                                                <TableRow>
                                                                    <TableHead>Tanggal</TableHead>
                                                                    <TableHead>Menu</TableHead>
                                                                    <TableHead>Bahan</TableHead>
                                                                    <TableHead className="text-right">Qty Butuh</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {filtered.map((m: any) => m.ingredients.map((ing: any, idx: number) => (
                                                                    <TableRow key={`${m.id}-${idx}`}>
                                                                        <TableCell className="whitespace-nowrap">{idx === 0 ? format(new Date(m.date), 'dd/MM/yyyy') : ''}</TableCell>
                                                                        <TableCell className="font-medium">{idx === 0 ? m.name : ''}</TableCell>
                                                                        <TableCell>{ing.name}</TableCell>
                                                                        <TableCell className="text-right">
                                                                            {formatRecipeQty(ing.qtyNeeded, ing.unit).stringValue} {formatRecipeQty(ing.qtyNeeded, ing.unit).unit}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* 3. Evaluation Report Section */}
                            {(reportType === 'evaluation' || reportType === 'combined') && reportData.evaluations && (
                                <section className="break-inside-avoid">
                                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600 print:hidden" />
                                        Laporan Evaluasi Gizi
                                    </h3>
                                    <div className="space-y-6">
                                        {['OMPRENG', 'KERING'].map(type => {
                                            const filtered = reportData.evaluations.filter((e: any) => e.menuType === type);
                                            if (filtered.length === 0) return null;
                                            return (
                                                <div key={type}>
                                                    <h4 className="text-sm font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">
                                                        {type === 'OMPRENG' ? 'Evaluasi Menu Masak' : 'Evaluasi Menu Kering'}
                                                    </h4>
                                                    <div className="rounded-xl border shadow-sm overflow-x-auto bg-white w-full">
                                                        <Table className="min-w-[800px]">
                                                            <TableHeader className="bg-slate-50">
                                                                <TableRow>
                                                                    <TableHead>Tanggal</TableHead>
                                                                    <TableHead>Menu</TableHead>
                                                                    <TableHead>Foto</TableHead>
                                                                    <TableHead className="text-right">Porsi</TableHead>
                                                                    <TableHead className="text-center">Ketepatan</TableHead>
                                                                    <TableHead className="text-center text-green-600">Pas</TableHead>
                                                                    <TableHead className="text-center text-orange-600">Bermasalah</TableHead>
                                                                    <TableHead>Status</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {filtered.map((e: any) => (
                                                                    <TableRow key={e.id}>
                                                                        <TableCell className="whitespace-nowrap">{format(new Date(e.date), 'dd/MM/yyyy')}</TableCell>
                                                                        <TableCell className="font-medium">{e.menuName}</TableCell>
                                                                        <TableCell>
                                                                            {e.photoUrl ? (
                                                                                <div
                                                                                    className="relative h-10 w-10 rounded-md border border-slate-200 overflow-hidden cursor-pointer hover:opacity-80 transition-all print:h-16 print:w-16"
                                                                                    onClick={() => setLightboxImage(e.photoUrl)}
                                                                                >
                                                                                    <Image src={e.photoUrl} alt="Foto Masakan" fill className="object-cover" />
                                                                                </div>
                                                                            ) : (
                                                                                <div className="h-10 w-10 flex items-center justify-center bg-slate-50 rounded-md border border-slate-100 print:hidden">
                                                                                    <ImageIcon className="h-4 w-4 text-slate-300" />
                                                                                </div>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-right font-semibold">{e.portions}</TableCell>
                                                                        <TableCell className="text-center">
                                                                            <div className="flex flex-col items-center gap-1">
                                                                                <span className="font-bold text-primary">{e.accuracy}%</span>
                                                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                                    <div className="h-full bg-primary" style={{ width: `${e.accuracy}%` }} />
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-center font-bold text-green-600">{e.pas}</TableCell>
                                                                        <TableCell className="text-center font-bold text-orange-600">{e.bermasalah}</TableCell>
                                                                        <TableCell>
                                                                            <Badge variant={e.status === 'TEREVALUASI' ? 'default' : 'outline'} className={cn(
                                                                                e.status === 'TEREVALUASI' ? 'bg-success text-white border-none' : 'text-primary border-primary/20'
                                                                            )}>
                                                                                {e.status}
                                                                            </Badge>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* 4. Frequent Menus Analysis Section */}
                            {(reportType === 'evaluation' || reportType === 'combined') && reportData.frequentMenus && reportData.frequentMenus.length > 0 && (
                                <section className="break-inside-avoid mt-8">
                                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-amber-600 print:hidden" />
                                        Analisis Menu Terpopuler (Sering Digunakan)
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {['OMPRENG', 'KERING'].map(type => {
                                            const filtered = reportData.frequentMenus.filter((m: any) => m.type === type);
                                            if (filtered.length === 0) return null;
                                            return (
                                                <div key={type} className="rounded-xl border shadow-sm overflow-hidden bg-white">
                                                    <div className="bg-slate-50 px-4 py-2 border-b">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                            {type === 'OMPRENG' ? 'Top Menu Masak' : 'Top Menu Kering'}
                                                        </h4>
                                                    </div>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-12">Rank</TableHead>
                                                                <TableHead>Nama Menu</TableHead>
                                                                <TableHead className="text-right">Frekuensi</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {filtered.map((m: any, idx: number) => (
                                                                <TableRow key={m.name}>
                                                                    <TableCell className="font-bold text-slate-400">#{idx + 1}</TableCell>
                                                                    <TableCell className="font-medium text-sm">{m.name}</TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Badge variant="secondary" className="bg-accent/10 text-accent-foreground border-accent/20">
                                                                            {m.count} Kali
                                                                        </Badge>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* Footer for print only */}
                            <div className="hidden print:flex items-center justify-between mt-12 pt-8 border-t-2 border-slate-200">
                                <div className="flex-1"></div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-800">DAPUR GEMPITA</p>
                                    <p className="text-xs text-slate-500">Sistem Pelaporan Terpadu</p>
                                </div>
                                <div className="flex-1 flex justify-end">
                                    <div className="relative h-10 w-40">
                                        <Image src="/Logo SPPG Bengkulu.png" alt="SPPG Logo" width={160} height={40} className="object-contain" />
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons - Hidden in print */}
                            <div className="print:hidden md:sticky bottom-6 py-3 px-4 md:py-4 md:px-6 border bg-white/95 md:bg-white/80 backdrop-blur-md rounded-xl md:rounded-2xl shadow-lg md:shadow-xl flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 z-10 border-primary/10 mt-8 md:mt-0 w-full overflow-hidden">
                                <div className="text-xs md:text-sm font-medium text-slate-600 text-center md:text-left">
                                    Siap diekspor: <span className="text-primary font-bold uppercase">{reportType}</span>
                                </div>
                                <div className="grid grid-cols-3 md:flex md:flex-row items-center gap-2 md:gap-3 w-full md:w-auto">
                                    <Button onClick={handlePrint} variant="outline" size="sm" className="border-primary/20 h-9 px-2">
                                        <Printer className="mr-1 md:mr-2 h-4 w-4" />
                                        <span className="hidden sm:inline md:hidden">Cetak</span>
                                        <span className="hidden md:inline">Cetak Laporan</span>
                                        <span className="sm:hidden">Print</span>
                                    </Button>
                                    <Button onClick={exportToExcel} variant="outline" size="sm" className="border-primary/20 h-9 px-2">
                                        <FileSpreadsheet className="mr-1 md:mr-2 h-4 w-4 text-emerald-600" />
                                        <span className="hidden sm:inline md:hidden">Excel</span>
                                        <span className="hidden md:inline">Export Excel</span>
                                        <span className="sm:hidden">XLS</span>
                                    </Button>
                                    <Button onClick={exportToPDF} size="sm" className="bg-primary hover:bg-primary/90 h-9 px-2" disabled={exporting}>
                                        <FileDown className="mr-1 md:mr-2 h-4 w-4 text-white" />
                                        <span className="hidden sm:inline md:hidden">{exporting ? 'Proses' : 'PDF'}</span>
                                        <span className="hidden md:inline">{exporting ? 'Memproses...' : 'Download PDF'}</span>
                                        <span className="sm:hidden">{exporting ? '...' : 'PDF'}</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 border rounded-2xl border-dashed">
                            <BarChart3 className="h-12 w-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-medium text-slate-400">Pilih rentang tanggal dan tipe laporan</h3>
                        </div>
                    )}
                </div>

                {/* Single Image Lightbox */}
                {lightboxImage && (
                    <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
                        <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden border-none bg-transparent shadow-none">
                            <DialogHeader className="sr-only">
                                <DialogTitle>Pratinjau Foto</DialogTitle>
                                <DialogDescription>Tampilan detail foto bukti laporan</DialogDescription>
                            </DialogHeader>
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/50">
                                <Image
                                    src={lightboxImage}
                                    alt="Bukti"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </DashboardLayout>
        </RouteGuard>
    );
}
