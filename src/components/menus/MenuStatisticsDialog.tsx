'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { getMenuEvaluationStats } from '@/app/actions/menus';
import { Badge } from '@/components/ui/badge';
import { Progress } from "@/components/ui/progress";
import { Loader2 } from 'lucide-react';

interface MenuStatisticsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    menu: any;
}

export function MenuStatisticsDialog({ open, onOpenChange, menu }: MenuStatisticsDialogProps) {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        if (open && menu) {
            fetchStats();
        } else {
            setStats(null);
        }
    }, [open, menu]);

    const fetchStats = async () => {
        setLoading(true);
        const res = await getMenuEvaluationStats(menu.name, menu.menuDate);
        setLoading(false);
        if (res.success && res.data) {
            setStats(res.data);
        } else {
            setStats({ notFound: true });
        }
    };

    if (!menu) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Statistik Riwayat: {menu.name}</DialogTitle>
                    <DialogDescription>
                        Data di bawah ini diambil dari pelaksanaan <b>paling terakhir</b> menu ini di masa lalu.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 min-h-[150px] flex flex-col justify-center">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p>Mencari data histori...</p>
                        </div>
                    ) : stats?.notFound ? (
                        <div className="text-center text-muted-foreground p-4 bg-muted/30 rounded-lg border border-dashed">
                            Belum ada riwayat evaluasi untuk menu ini di tanggal sebelumnya.
                        </div>
                    ) : stats ? (
                        <div className="space-y-6 mt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-secondary/20 p-3 rounded-md border flex flex-col justify-center items-center text-center">
                                    <span className="text-xs text-muted-foreground mb-1">Terakhir Dimasak</span>
                                    <span className="font-semibold text-sm text-primary">
                                        {format(new Date(stats.date), 'dd MMMM yyyy', { locale: id })}
                                    </span>
                                </div>
                                <div className="bg-secondary/20 p-3 rounded-md border flex flex-col justify-center items-center text-center">
                                    <span className="text-xs text-muted-foreground mb-1">Skala Masak Saat Itu</span>
                                    <span className="font-semibold text-sm text-primary">
                                        {stats.portionCount} Porsi
                                    </span>
                                </div>
                            </div>

                            <div className="bg-blue-50 text-blue-800 border-blue-200 border text-xs p-3 rounded-md leading-relaxed">
                                💡 <b>Tips:</b> Gunakan data evaluasi masak <b>{format(new Date(stats.date), 'dd MMM', { locale: id })}</b> ini sebagai referensi untuk penyesuaian bahan pada jadwal masak {format(new Date(menu.menuDate), 'dd MMM yyyy', { locale: id })}.
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold">Ringkasan Ketepatan Porsi</h4>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-green-600">Pas ({stats.stats.percentages.pas}%)</span>
                                        <span className="text-muted-foreground">{stats.stats.pas}/{stats.stats.total} Bahan</span>
                                    </div>
                                    <Progress value={stats.stats.percentages.pas} className="h-2 bg-secondary" indicatorColor="bg-green-500" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-orange-500">Kurang / Berlebih ({stats.stats.percentages.kurang + stats.stats.percentages.berlebih}%)</span>
                                        <span className="text-muted-foreground">{stats.stats.kurang + stats.stats.berlebih}/{stats.stats.total} Bahan</span>
                                    </div>
                                    <Progress value={stats.stats.percentages.kurang + stats.stats.percentages.berlebih} className="h-2 bg-secondary" indicatorColor="bg-orange-400" />
                                </div>
                            </div>

                            {stats.issues?.length > 0 && (
                                <div className="space-y-3 mt-4 pt-4 border-t">
                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                        Catatan Bahan Bermasalah
                                    </h4>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                        {stats.issues.map((issue: any, idx: number) => (
                                            <div key={idx} className="text-sm border rounded-md p-2 bg-card">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-medium">{issue.ingredientName} <span className="text-xs text-muted-foreground font-normal">({issue.qty} {issue.unit})</span></span>
                                                    <Badge variant="outline" className={issue.status === 'KURANG' ? 'text-red-500 border-red-200 bg-red-50' : 'text-blue-500 border-blue-200 bg-blue-50'}>
                                                        {issue.status}
                                                    </Badge>
                                                </div>
                                                {issue.note ? (
                                                    <p className="text-xs text-muted-foreground italic mt-1 border-l-2 pl-2">
                                                        "{issue.note}"
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground mt-1">Tidak ada catatan spesifik.</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {stats.issues?.length === 0 && (
                                <div className="mt-4 pt-4 border-t text-sm text-center text-green-600 font-medium">
                                    Semua bahan pada pelaksanaan terakhir sudah pas.
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                <DialogFooter>
                    <Button type="button" onClick={() => onOpenChange(false)}>
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
