'use client';

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Activity,
    RefreshCw,
    Package,
    CheckCircle2,
    Clock,
    AlertCircle,
    ShoppingCart
} from "lucide-react";
import { getDailyMonitoring } from "@/app/actions/monitoring";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatRecipeQty } from "@/lib/utils";

export default function MonitoringPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [metadata, setMetadata] = useState<any>({ date: null, menus: [] });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await getDailyMonitoring() as any;
            if (result.success) {
                setData(result.data);
                setMetadata({ date: result.date, menus: result.menus });
            } else {
                toast.error(result.error || "Gagal mengambil data monitoring");
            }
        } catch (error) {
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'STOCK_READY':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200"><Package className="w-3 h-3 mr-1" /> Stok Gudang</Badge>;
            case 'RECEIVED':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Diterima</Badge>;
            case 'ON_PURCHASE':
                return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200"><ShoppingCart className="w-3 h-3 mr-1" /> Sudah Dibeli</Badge>;
            case 'PARTIAL':
                return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200"><AlertCircle className="w-3 h-3 mr-1" /> Sebagian</Badge>;
            default:
                return <Badge variant="outline" className="text-muted-foreground"><Clock className="w-3 h-3 mr-1" /> Menunggu</Badge>;
        }
    };

    const renderIngredientTable = (title: string, tableData: any[], colorVariant: 'blue' | 'orange') => {
        const bgClass = colorVariant === 'blue' ? 'bg-blue-50/30' : 'bg-orange-50/30';
        const borderClass = colorVariant === 'blue' ? 'border-blue-100' : 'border-orange-100';
        const titleColor = colorVariant === 'blue' ? 'text-blue-800' : 'text-orange-800';

        return (
            <div className={`mb-6 rounded-xl border ${borderClass} overflow-hidden shadow-sm`}>
                <div className={`px-4 py-3 ${bgClass} border-b ${borderClass} flex items-center justify-between`}>
                    <h3 className={`font-bold text-sm flex items-center gap-2 ${titleColor}`}>
                        <Package className="h-4 w-4" />
                        {title}
                        <Badge variant="outline" className="bg-white ml-2 text-foreground">{tableData.length}</Badge>
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/10 hover:bg-muted/10">
                                <TableHead className="w-[50px] text-center">No</TableHead>
                                <TableHead className="min-w-[150px]">Nama Bahan</TableHead>
                                <TableHead className="text-center">Estimasi Kebutuhan</TableHead>
                                <TableHead className="text-center font-bold">Berat Kotor (Bruto)</TableHead>
                                <TableHead className="text-center font-bold text-primary">Berat Bersih (Netto)</TableHead>
                                <TableHead className="text-center">Satuan</TableHead>
                                <TableHead className="text-right">Status Datang</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tableData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground bg-white">
                                        <div className="flex flex-col items-center gap-2">
                                            <Package className="h-6 w-6 opacity-20" />
                                            <p className="text-sm">Tidak ada bahan untuk kategori ini.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tableData.map((item, index) => {
                                    const needed = formatRecipeQty(item.neededQty, item.unit);
                                    const gross = formatRecipeQty(item.receivedGross, item.unit);
                                    const net = formatRecipeQty(item.receivedNet, item.unit);

                                    return (
                                        <TableRow key={item.id} className="hover:bg-muted/50 transition-colors bg-white">
                                            <TableCell className="text-center text-muted-foreground font-mono">{index + 1}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{item.name}</span>
                                                    {item.isUnscheduled && (
                                                        <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-0.5">
                                                            <AlertCircle className="h-3 w-3" /> DILUAR JADWAL
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center bg-blue-50/10">
                                                {item.neededQty > 0 ? `${needed.stringValue} ${needed.unit}` : (
                                                    <span className="text-muted-foreground text-xs italic">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center font-medium bg-slate-50/30 text-slate-600">
                                                {item.receivedGross > 0 ? `${gross.stringValue} ${gross.unit}` : '0'}
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-primary text-lg bg-green-50/10">
                                                {item.receivedNet > 0 ? `${net.stringValue} ${net.unit}` : '0'}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground">{net.unit}</TableCell>
                                            <TableCell className="text-right">
                                                {getStatusBadge(item.status)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    };

    const masakanData = data.filter(d => !d.types?.length || d.types.includes('Masakan/Ompreng'));
    const snackData = data.filter(d => d.types && d.types.includes('Snack/Kering'));

    const masakanMenus = metadata.menus?.filter((m: any) => m.menuType === 'OMPRENG') || [];
    const keringMenus = metadata.menus?.filter((m: any) => m.menuType === 'KERING') || [];

    const renderMenuItem = (m: any, idx: number, colorVariant: 'blue' | 'orange') => {
        const borderClass = colorVariant === 'blue' ? 'border-blue-200' : 'border-orange-200';
        return (
            <div key={idx} className={`flex items-start justify-between gap-4 border-l-2 ${borderClass} pl-3 py-1 mb-2`}>
                <div className="flex flex-col">
                    <span className="font-bold text-foreground leading-tight">{m.name}</span>
                    <span className="text-[10px] text-muted-foreground mt-1">
                        Jadwal: {m.createdAt ? (() => {
                            try {
                                const d = new Date(m.createdAt);
                                if (isNaN(d.getTime())) return "Tanggal tidak valid";
                                return format(d, 'EEEE, d MMMM yyyy HH:mm', { locale: id });
                            } catch (e) {
                                return "Format tanggal salah";
                            }
                        })() : "-"}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout
            title="Monitoring Real-Time"
            description="Pantau berat kotor (bruto) dan berat bersih (netto) bahan baku hari ini."
        >
            <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-blue-600 font-medium flex items-center gap-2 border-b pb-2 mb-2">
                                <Activity className="h-4 w-4" />
                                Menu Hari Ini
                            </CardDescription>
                            <CardTitle className="text-xl space-y-4">
                                {masakanMenus.length === 0 && keringMenus.length === 0 ? (
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground font-normal italic text-sm">Tidak ada menu</span>
                                    </div>
                                ) : (
                                    <>
                                        {masakanMenus.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wider">Kebutuhan Masakan / Ompreng</h4>
                                                <div>
                                                    {masakanMenus.map((m: any, idx: number) => renderMenuItem(m, idx, 'blue'))}
                                                </div>
                                            </div>
                                        )}

                                        {keringMenus.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-semibold text-orange-700 mb-2 uppercase tracking-wider">Kebutuhan Snack / Kering</h4>
                                                <div>
                                                    {keringMenus.map((m: any, idx: number) => renderMenuItem(m, idx, 'orange'))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardTitle>
                        </CardHeader>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-white border-green-100 shadow-sm flex flex-col justify-center items-center text-center">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-green-600 font-medium">Kesiapan Bahan</CardDescription>
                            <CardTitle className="text-xl">
                                {data.filter(i => i.status === 'RECEIVED').length} / {data.length} <span className="text-sm font-normal text-muted-foreground ml-2">Jenis Bahan</span>
                            </CardTitle>
                        </CardHeader>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100 shadow-sm flex flex-col justify-center items-center">
                        <CardHeader className="text-center w-full">
                            <CardDescription className="text-orange-600 font-medium mb-1">Sinkronisasi Data</CardDescription>
                            <Button variant="outline" onClick={loadData} disabled={loading} className="w-full max-w-[200px] mx-auto bg-white text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700">
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Perbarui Real-Time
                            </Button>
                            <CardDescription className="font-medium mt-2 text-xs">
                                Last Update: {metadata.date ? format(new Date(metadata.date), 'HH:mm:ss') : '-'}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>

                {/* Main Table */}
                <Card className="shadow-sm overflow-hidden">
                    <CardHeader className="border-b bg-muted/30 pb-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-lg">Daftar Bahan & Timbangan</CardTitle>
                                <CardDescription>Data timbangan barang yang masuk lewat Aslap (ASLAP)</CardDescription>
                            </div>
                            <div className="bg-primary/10 px-3 py-1.5 rounded-full text-xs font-semibold text-primary border border-primary/20">
                                {metadata.date ? format(new Date(metadata.date), 'EEEE, dd MMMM yyyy', { locale: id }) : '-'}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pb-2">
                        {loading && data.length === 0 ? (
                            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground border rounded-xl bg-muted/20">
                                <RefreshCw className="h-8 w-8 animate-spin opacity-20 mb-2" />
                                <p>Sedang menyinkronkan data...</p>
                            </div>
                        ) : data.length === 0 ? (
                            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground border rounded-xl bg-muted/20">
                                <Package className="h-8 w-8 opacity-20 mb-2" />
                                <p>Tidak ada data bahan untuk menu hari ini.</p>
                            </div>
                        ) : (
                            <>
                                {masakanData.length > 0 && renderIngredientTable("Kebutuhan Masakan / Ompreng", masakanData, "blue")}
                                {snackData.length > 0 && renderIngredientTable("Kebutuhan Snack / Kering", snackData, "orange")}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Legend or Quick Tips */}
                <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-3 border border-dashed border-muted-foreground/30">
                    <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground">Informasi Monitoring:</p>
                        <p>1. Data ini diupdate secara real-time berdasarkan stok gudang, pembelian, dan penerimaan ASLAP.</p>
                        <p>2. **Stok Gudang**: Bahan sudah tersedia dari stok sebelumnya.</p>
                        <p>3. **Sudah Dibeli**: Sudah diproses oleh Keuangan, menunggu verifikasi fisik oleh ASLAP.</p>
                        <p>4. **Diterima**: Sudah diverifikasi dan ditimbang oleh ASLAP hari ini.</p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
