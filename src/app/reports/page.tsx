'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileDown, FileSpreadsheet, Calendar, Image as ImageIcon } from 'lucide-react';
import { getDailyReport } from '@/app/actions/reports';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { RouteGuard } from '@/components/RouteGuard';

// Helper to convert URL to Base64
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

export default function ReportsPage() {
    const { role } = useAuth();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<any>(null);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    const isReadOnly = role === 'KEPALA_DAPUR';

    const fetchReport = async () => {
        setLoading(true);
        try {
            const result = await getDailyReport(selectedDate);
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

    const exportToExcel = () => {
        if (!reportData) {
            toast.error('Tidak ada data untuk diekspor');
            return;
        }

        const wb = XLSX.utils.book_new();

        // Sheet 1 - Ahli Gizi
        if (reportData.ahliGizi.length > 0) {
            const rows: any[] = [['Nama Menu', 'Nama Bahan', 'Qty Dibutuhkan', 'Satuan']];
            reportData.ahliGizi.forEach((menu: any) => {
                menu.ingredients.forEach((ing: any, idx: number) => {
                    rows.push([
                        idx === 0 ? menu.menuName : '',
                        ing.name,
                        ing.qtyNeeded,
                        ing.unit
                    ]);
                });
            });
            const ws1 = XLSX.utils.aoa_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws1, 'Ahli Gizi');
        }

        // Sheet 2 - Pembeli
        if (reportData.pembeli.length > 0) {
            const rows: any[] = [['Nama Bahan', 'Qty', 'Satuan', 'Catatan/Memo', 'Foto']];
            reportData.pembeli.forEach((p: any) => {
                p.items.forEach((item: any) => {
                    rows.push([
                        item.name,
                        item.qty,
                        item.unit,
                        item.memo || '-',
                        item.photoUrl ? { t: 's', v: 'Lihat Foto', l: { Target: item.photoUrl } } : '-'
                    ]);
                });
            });
            const ws2 = XLSX.utils.aoa_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws2, 'Pembeli');
        }

        // Sheet 3 - Penerima
        if (reportData.penerima.length > 0) {
            const rows: any[] = [['Nama Bahan', 'Berat Kotor', 'Berat Bersih', 'Satuan', 'Foto']];
            reportData.penerima.forEach((r: any) => {
                r.items.forEach((item: any) => {
                    rows.push([
                        item.name,
                        item.grossWeight,
                        item.netWeight,
                        item.unit,
                        item.photoUrl ? { t: 's', v: 'Lihat Foto', l: { Target: item.photoUrl } } : '-'
                    ]);
                });
            });
            const ws3 = XLSX.utils.aoa_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws3, 'Penerima');
        }

        // Sheet 4 - Chef
        if (reportData.chef.length > 0) {
            const rows: any[] = [['Menu', 'Porsi', 'Bahan', 'Qty Digunakan', 'Satuan', 'Foto']];
            reportData.chef.forEach((prod: any) => {
                prod.ingredients.forEach((ing: any, idx: number) => {
                    rows.push([
                        idx === 0 ? prod.menuName : '',
                        idx === 0 ? prod.portions : '',
                        ing.name,
                        ing.qtyUsed,
                        ing.unit,
                        idx === 0 && prod.photoUrl ? { t: 's', v: 'Lihat Foto', l: { Target: prod.photoUrl } } : '-'
                    ]);
                });
            });
            const ws4 = XLSX.utils.aoa_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws4, 'Chef');
        }

        const fileName = `Laporan_Harian_${selectedDate}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success(`File Excel berhasil diunduh: ${fileName}`);
    };

    const exportToPDF = async () => {
        if (!reportData) {
            toast.error('Tidak ada data untuk diekspor');
            return;
        }

        setExporting(true);
        const toastId = toast.loading('Memproses PDF...');

        try {
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text('LAPORAN HARIAN DAPUR GEMPITA', 14, 15);
            doc.setFontSize(12);
            doc.text(format(new Date(selectedDate), 'dd MMMM yyyy'), 14, 22);
            let yPos = 30;

            // Pre-process images
            const imageCache: Record<string, string> = {};
            const urlsToFetch = new Set<string>();

            // Collect URLs
            reportData.pembeli.forEach((p: any) => p.items.forEach((i: any) => i.photoUrl && urlsToFetch.add(i.photoUrl)));
            reportData.penerima.forEach((r: any) => r.items.forEach((i: any) => i.photoUrl && urlsToFetch.add(i.photoUrl)));
            reportData.chef.forEach((c: any) => c.photoUrl && urlsToFetch.add(c.photoUrl));

            // Fetch images
            for (const url of Array.from(urlsToFetch)) {
                try {
                    const base64 = await urlToBase64(url);
                    imageCache[url] = base64;
                } catch (e) {
                    console.error(`Failed to load image: ${url}`, e);
                }
            }


            // Table 1 - Ahli Gizi
            if (reportData.ahliGizi.length > 0) {
                doc.setFontSize(14);
                doc.text('1. Ahli Gizi - Menu & Bahan', 14, yPos);
                yPos += 5;

                const rows: any[] = [];
                reportData.ahliGizi.forEach((menu: any) => {
                    menu.ingredients.forEach((ing: any, idx: number) => {
                        rows.push([
                            idx === 0 ? menu.menuName : '',
                            ing.name,
                            `${ing.qtyNeeded} ${ing.unit}`
                        ]);
                    });
                });

                autoTable(doc, {
                    startY: yPos,
                    head: [['Menu', 'Bahan', 'Qty Dibutuhkan']],
                    body: rows,
                    theme: 'grid',
                    headStyles: { fillColor: [52, 152, 219] },
                });
                yPos = (doc as any).lastAutoTable.finalY + 10;
            }

            // Table 2 - Pembeli
            if (yPos > 250) { doc.addPage(); yPos = 20; }
            if (reportData.pembeli.length > 0) {
                doc.setFontSize(14);
                doc.text('2. Pembeli - Pengadaan Bahan', 14, yPos);
                yPos += 5;

                const rows: any[] = [];
                const photoCells: { row: number, col: number, url: string }[] = [];

                reportData.pembeli.forEach((p: any) => {
                    p.items.forEach((item: any) => {
                        if (item.photoUrl && imageCache[item.photoUrl]) {
                            photoCells.push({ row: rows.length, col: 3, url: item.photoUrl });
                        }
                        rows.push([
                            item.name,
                            `${item.qty} ${item.unit}`,
                            item.memo || '-',
                            '' // Placeholder for image
                        ]);
                    });
                });

                autoTable(doc, {
                    startY: yPos,
                    head: [['Bahan', 'Qty', 'Catatan', 'Foto']],
                    body: rows,
                    theme: 'striped',
                    headStyles: { fillColor: [46, 204, 113] },
                    columnStyles: {
                        3: { minCellWidth: 20 }
                    },
                    bodyStyles: { minCellHeight: 20 },
                    didDrawCell: (data) => {
                        if (data.section === 'body' && data.column.index === 3) {
                            const photo = photoCells.find(p => p.row === data.row.index && p.col === data.column.index);
                            if (photo && imageCache[photo.url]) {
                                const img = imageCache[photo.url];
                                const dim = data.cell.height - 4; // padding
                                doc.addImage(img, 'JPEG', data.cell.x + 2, data.cell.y + 2, dim, dim);
                            }
                        }
                    }
                });
                yPos = (doc as any).lastAutoTable.finalY + 10;
            }

            // Table 3 - Penerima
            if (yPos > 250) { doc.addPage(); yPos = 20; }
            if (reportData.penerima.length > 0) {
                doc.setFontSize(14);
                doc.text('3. Penerima - Verifikasi Berat', 14, yPos);
                yPos += 5;

                const rows: any[] = [];
                const photoCells: { row: number, col: number, url: string }[] = [];

                reportData.penerima.forEach((r: any) => {
                    r.items.forEach((item: any) => {
                        if (item.photoUrl && imageCache[item.photoUrl]) {
                            photoCells.push({ row: rows.length, col: 3, url: item.photoUrl });
                        }
                        rows.push([
                            item.name,
                            `${item.grossWeight} ${item.unit}`,
                            `${item.netWeight} ${item.unit}`,
                            ''
                        ]);
                    });
                });

                autoTable(doc, {
                    startY: yPos,
                    head: [['Bahan', 'Berat Kotor', 'Berat Bersih', 'Foto']],
                    body: rows,
                    theme: 'striped',
                    headStyles: { fillColor: [155, 89, 182] },
                    columnStyles: {
                        3: { minCellWidth: 20 }
                    },
                    bodyStyles: { minCellHeight: 20 },
                    didDrawCell: (data) => {
                        if (data.section === 'body' && data.column.index === 3) {
                            const photo = photoCells.find(p => p.row === data.row.index && p.col === data.column.index);
                            if (photo && imageCache[photo.url]) {
                                const img = imageCache[photo.url];
                                const dim = data.cell.height - 4;
                                doc.addImage(img, 'JPEG', data.cell.x + 2, data.cell.y + 2, dim, dim);
                            }
                        }
                    }
                });
                yPos = (doc as any).lastAutoTable.finalY + 10;
            }

            // Table 4 - Chef
            if (yPos > 250) { doc.addPage(); yPos = 20; }
            if (reportData.chef.length > 0) {
                doc.setFontSize(14);
                doc.text('4. Chef - Produksi', 14, yPos);
                yPos += 5;

                const rows: any[] = [];
                const photoCells: { row: number, col: number, url: string }[] = [];

                reportData.chef.forEach((prod: any) => {
                    prod.ingredients.forEach((ing: any, idx: number) => {
                        if (idx === 0 && prod.photoUrl && imageCache[prod.photoUrl]) {
                            photoCells.push({ row: rows.length, col: 4, url: prod.photoUrl });
                        }
                        rows.push([
                            idx === 0 ? prod.menuName : '',
                            idx === 0 ? prod.portions : '',
                            ing.name,
                            `${ing.qtyUsed} ${ing.unit}`,
                            ''
                        ]);
                    });
                });

                autoTable(doc, {
                    startY: yPos,
                    head: [['Menu', 'Porsi', 'Bahan', 'Qty Digunakan', 'Foto']],
                    body: rows,
                    theme: 'striped',
                    headStyles: { fillColor: [231, 76, 60] },
                    columnStyles: {
                        4: { minCellWidth: 20 }
                    },
                    bodyStyles: { minCellHeight: 20 },
                    didDrawCell: (data) => {
                        if (data.section === 'body' && data.column.index === 4) {
                            const photo = photoCells.find(p => p.row === data.row.index && p.col === data.column.index);
                            if (photo && imageCache[photo.url]) {
                                const img = imageCache[photo.url];
                                const dim = data.cell.height - 4;
                                doc.addImage(img, 'JPEG', data.cell.x + 2, data.cell.y + 2, dim, dim);
                            }
                        }
                    }
                });
            }

            const fileName = `Laporan_Harian_${selectedDate}.pdf`;
            doc.save(fileName);
            toast.success(`File PDF berhasil diunduh: ${fileName}`, { id: toastId });
        } catch (error) {
            console.error('PDF Export Error:', error);
            toast.error('Gagal mengekspor PDF', { id: toastId });
        } finally {
            setExporting(false);
        }
    };

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'KEPALA_DAPUR']}>
            <DashboardLayout
                title="Laporan Harian"
                description="Laporan harian lengkap dari semua role: Ahli Gizi, Pembeli, Penerima, Chef."
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Laporan Tanggal Hari Ini</CardTitle>
                        <CardDescription>
                            {isReadOnly ? 'Laporan hanya bisa dilihat untuk hari ini' : 'Pilih tanggal untuk melihat laporan'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-end gap-4">
                            <div className="flex-1 max-w-xs">
                                <Label htmlFor="reportDate">Tanggal</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="reportDate"
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="pl-10"
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>
                            <Button onClick={fetchReport} disabled={loading}>
                                {loading ? 'Memuat...' : 'Tampilkan Laporan'}
                            </Button>
                        </div>

                        {reportData && (
                            <>
                                <div className="pt-4 border-t">
                                    <Card className="bg-blue-50">
                                        <CardContent className="pt-4">
                                            <div className="text-3xl font-bold text-blue-600">
                                                {reportData.summary.totalPortions}
                                            </div>
                                            <p className="text-sm text-muted-foreground">Total Porsi Diproduksi</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Table 1: Ahli Gizi */}
                                <div className="pt-4 border-t">
                                    <h3 className="text-lg font-semibold mb-3">1. Ahli Gizi - Menu & Bahan</h3>
                                    <div className="border rounded-md overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nama Menu</TableHead>
                                                    <TableHead>Nama Bahan</TableHead>
                                                    <TableHead className="text-right">Qty Dibutuhkan</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {reportData.ahliGizi.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                                            Tidak ada data menu
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    reportData.ahliGizi.map((menu: any, menuIdx: number) =>
                                                        menu.ingredients.map((ing: any, ingIdx: number) => (
                                                            <TableRow key={`menu-${menuIdx}-ing-${ingIdx}`}>
                                                                <TableCell className="font-medium">
                                                                    {ingIdx === 0 ? menu.menuName : ''}
                                                                </TableCell>
                                                                <TableCell>{ing.name}</TableCell>
                                                                <TableCell className="text-right">
                                                                    {ing.qtyNeeded} {ing.unit}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Table 2: Pembeli */}
                                <div className="pt-4 border-t">
                                    <h3 className="text-lg font-semibold mb-3">2. Pembeli - Pengadaan Bahan</h3>
                                    <div className="border rounded-md overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nama Bahan</TableHead>
                                                    <TableHead className="text-right">Qty</TableHead>
                                                    <TableHead>Catatan/Memo</TableHead>
                                                    <TableHead className="text-center">Foto</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {reportData.pembeli.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                            Tidak ada data pengadaan
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    reportData.pembeli.map((p: any, pIdx: number) =>
                                                        p.items.map((item: any, iIdx: number) => (
                                                            <TableRow key={`purchase-${pIdx}-item-${iIdx}`}>
                                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                                <TableCell className="text-right">
                                                                    {item.qty} {item.unit}
                                                                </TableCell>
                                                                <TableCell className="text-sm text-muted-foreground">
                                                                    {item.memo || '-'}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {item.photoUrl ? (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => setLightboxImage(item.photoUrl)}
                                                                        >
                                                                            <ImageIcon className="h-4 w-4" />
                                                                        </Button>
                                                                    ) : '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Table 3: Penerima */}
                                <div className="pt-4 border-t">
                                    <h3 className="text-lg font-semibold mb-3">3. Penerima - Verifikasi Berat</h3>
                                    <div className="border rounded-md overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nama Bahan</TableHead>
                                                    <TableHead className="text-right">Berat Kotor</TableHead>
                                                    <TableHead className="text-right">Berat Bersih</TableHead>
                                                    <TableHead className="text-center">Foto</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {reportData.penerima.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                            Tidak ada data penerimaan
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    reportData.penerima.map((r: any, rIdx: number) =>
                                                        r.items.map((item: any, iIdx: number) => (
                                                            <TableRow key={`receipt-${rIdx}-item-${iIdx}`}>
                                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                                <TableCell className="text-right">
                                                                    {item.grossWeight} {item.unit}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {item.netWeight} {item.unit}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {item.photoUrl ? (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => setLightboxImage(item.photoUrl)}
                                                                        >
                                                                            <ImageIcon className="h-4 w-4" />
                                                                        </Button>
                                                                    ) : '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Table 4: Chef */}
                                <div className="pt-4 border-t">
                                    <h3 className="text-lg font-semibold mb-3">4. Chef - Produksi</h3>
                                    <div className="border rounded-md overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Menu</TableHead>
                                                    <TableHead className="text-right">Porsi</TableHead>
                                                    <TableHead>Bahan</TableHead>
                                                    <TableHead className="text-right">Qty Digunakan</TableHead>
                                                    <TableHead className="text-center">Foto</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {reportData.chef.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                            Tidak ada data produksi
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    reportData.chef.map((prod: any, pIdx: number) =>
                                                        prod.ingredients.map((ing: any, iIdx: number) => (
                                                            <TableRow key={`prod-${pIdx}-ing-${iIdx}`}>
                                                                <TableCell className="font-medium">
                                                                    {iIdx === 0 ? prod.menuName : ''}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {iIdx === 0 ? prod.portions : ''}
                                                                </TableCell>
                                                                <TableCell>{ing.name}</TableCell>
                                                                <TableCell className="text-right">
                                                                    {ing.qtyUsed} {ing.unit}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {iIdx === 0 && prod.photoUrl ? (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => setLightboxImage(prod.photoUrl)}
                                                                        >
                                                                            <ImageIcon className="h-4 w-4" />
                                                                        </Button>
                                                                    ) : '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Export Buttons */}
                                <div className="pt-4 border-t flex gap-3">
                                    <Button onClick={exportToExcel} variant="outline" disabled={exporting}>
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        Export Excel
                                    </Button>
                                    <Button onClick={exportToPDF} variant="outline" disabled={exporting}>
                                        <FileDown className="mr-2 h-4 w-4" />
                                        {exporting ? 'Memproses PDF...' : 'Export PDF'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Photo Lightbox */}
                {lightboxImage && (
                    <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
                        <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-0">
                            <DialogHeader className="p-4 pb-2">
                                <DialogTitle>Foto Bukti</DialogTitle>
                            </DialogHeader>
                            <div className="flex items-center justify-center p-4 pt-0">
                                <img
                                    src={lightboxImage}
                                    alt="Foto bukti"
                                    className="max-w-full max-h-[80vh] object-contain rounded"
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </DashboardLayout>
        </RouteGuard>
    );
}
