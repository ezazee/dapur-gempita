'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ClipboardCheck, Package, History } from 'lucide-react';
import { getPendingPurchases, getReceipts } from '@/app/actions/receipts';
import { ValidateReceiptDialog } from '@/components/receipts/ValidateReceiptDialog';
import { ReceiptDetailDialog } from '@/components/receipts/ReceiptDetailDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { RouteGuard } from '@/components/RouteGuard';

export default function ReceiptsPage() {
    const { role } = useAuth();
    const [pendingPurchases, setPendingPurchases] = useState<any[]>([]);
    const [receiptsHistory, setReceiptsHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
    const [isValidateOpen, setIsValidateOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('pending');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        // Set active tab based on role when role is loaded
        if (role === 'CHEF' || role === 'KEPALA_DAPUR') {
            setActiveTab('history');
        }
    }, [role]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pending, history] = await Promise.all([
                getPendingPurchases(),
                getReceipts()
            ]);
            setPendingPurchases(pending);
            setReceiptsHistory(history);
        } catch (error) {
            toast.error('Gagal mengambil data penerimaan');
        } finally {
            setLoading(false);
        }
    };

    const handleValidate = (purchase: any) => {
        setSelectedPurchase(purchase);
        setIsValidateOpen(true);
    };

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PENERIMA']}>
            <DashboardLayout
                title="Penerimaan Barang"
                description="Validasi barang masuk dari pembelian untuk menambah stok."
            >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className={`grid w-full max-w-[400px] ${(role === 'CHEF' || role === 'KEPALA_DAPUR') ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {role !== 'CHEF' && role !== 'KEPALA_DAPUR' && (
                            <TabsTrigger value="pending">Menunggu Validasi ({pendingPurchases.length})</TabsTrigger>
                        )}
                        <TabsTrigger value="history">Riwayat Penerimaan</TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending" className="space-y-4 mt-4">
                        <div className="border rounded-md overflow-x-auto">
                            <Table>
                                <TableHeader>
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
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                Memuat data...
                                            </TableCell>
                                        </TableRow>
                                    ) : pendingPurchases.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center justify-center">
                                                    <ClipboardCheck className="w-8 h-8 mb-2 opacity-20" />
                                                    <p>Tidak ada pembelian yang perlu divalidasi.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pendingPurchases.map((purchase) => (
                                            <TableRow key={purchase.id} className="hover:bg-muted/50">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{format(new Date(purchase.purchaseDate), 'dd MMM yyyy')}</span>
                                                        <span className="text-xs text-muted-foreground">{format(new Date(purchase.purchaseDate), 'EEEE')}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{purchase.creatorName}</TableCell>
                                                <TableCell className="text-right">{purchase.items.length} jenis</TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" onClick={() => handleValidate(purchase)}>
                                                        <ClipboardCheck className="mr-2 h-4 w-4" />
                                                        Terima Barang
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="history">
                        <div className="border rounded-md overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground border-b">
                                    <tr>
                                        <th className="p-3">Tanggal Terima</th>
                                        <th className="p-3">Penerima</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receiptsHistory.map((receipt) => (
                                        <tr key={receipt.id} className="border-b last:border-0 hover:bg-muted/10">
                                            <td className="p-3">{format(new Date(receipt.date), 'dd/MM/yyyy HH:mm')}</td>
                                            <td className="p-3">{receipt.receiverName || '-'}</td>
                                            <td className="p-3">
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                    {receipt.status}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedReceipt(receipt);
                                                        setIsDetailOpen(true);
                                                    }}
                                                >
                                                    Lihat Detail
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {receiptsHistory.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-4 text-center text-muted-foreground">Belum ada riwayat.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </TabsContent>
                </Tabs>

                {selectedPurchase && (
                    <ValidateReceiptDialog
                        open={isValidateOpen}
                        onOpenChange={setIsValidateOpen}
                        purchase={selectedPurchase}
                        onSuccess={() => {
                            setSelectedPurchase(null);
                            fetchData();
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
