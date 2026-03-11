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
import { cn } from '@/lib/utils';

interface MenuStatisticsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    menu: any;
}

export function MenuStatisticsDialog({ open, onOpenChange, menu }: MenuStatisticsDialogProps) {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [selectedSubMenu, setSelectedSubMenu] = useState<any>(null);

    useEffect(() => {
        if (open && menu) {
            // Default to OMPRENG if multiple exist, otherwise the first one
            const initial = menu.originalMenus?.find((m: any) => m.menuType === 'OMPRENG') || menu.originalMenus?.[0] || menu;
            setSelectedSubMenu(initial);
        } else {
            setStats(null);
            setSelectedSubMenu(null);
        }
    }, [open, menu]);

    useEffect(() => {
        if (selectedSubMenu) {
            fetchStats();
        }
    }, [selectedSubMenu]);

    const fetchStats = async () => {
        if (!selectedSubMenu) return;
        setLoading(true);
        const res = await getMenuEvaluationStats(selectedSubMenu.name, selectedSubMenu.menuDate || menu.menuDate);
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
                    <DialogTitle>Statistik Riwayat</DialogTitle>
                    <DialogDescription>
                        Data di bawah ini diambil dari pelaksanaan <b>paling terakhir</b> menu ini di masa lalu.
                    </DialogDescription>
                </DialogHeader>

                {menu.originalMenus && menu.originalMenus.length > 1 && (
                    <div className="flex gap-2 p-1 bg-muted rounded-lg mt-4">
                        {menu.originalMenus.map((m: any) => (
                            <button
                                key={m.id}
                                onClick={() => setSelectedSubMenu(m)}
                                className={cn(
                                    "flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                    selectedSubMenu?.id === m.id ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:bg-white/50"
                                )}
                            >
                                {m.menuType === 'OMPRENG' ? 'Menu Masak' : 'Menu Kering'}
                            </button>
                        ))}
                    </div>
                )}

                <div className="mt-2 py-2 border-b">
                    <h3 className="font-bold text-lg text-primary">{selectedSubMenu?.name}</h3>
                    <Badge variant="outline" className={cn(
                        "mt-1 text-[10px] uppercase font-bold",
                        selectedSubMenu?.menuType === 'OMPRENG' ? "text-blue-600 border-blue-100" : "text-amber-600 border-amber-100"
                    )}>
                        {selectedSubMenu?.menuType === 'OMPRENG' ? 'Masak (Ompreng)' : 'Paket Tambahan (Kering)'}
                    </Badge>
                </div>

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
                                        {(stats.countKecil || 0) + (stats.countBesar || 0) + (stats.countBumil || 0) + (stats.countBalita || 0)} Porsi
                                    </span>
                                    {(stats.countKecil > 0 || stats.countBumil > 0 || stats.countBalita > 0) && (
                                        <div className="flex gap-1 mt-1 text-[8px] text-muted-foreground uppercase">
                                            <span>K:{stats.countKecil}</span>
                                            <span>B:{stats.countBesar}</span>
                                            <span>P:{stats.countBumil}</span>
                                            <span>L:{stats.countBalita}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-blue-50 text-blue-800 border-blue-200 border text-xs p-3 rounded-md leading-relaxed">
                                💡 <b>Tips:</b> Gunakan data evaluasi masak <b>{format(new Date(stats.date), 'dd MMM', { locale: id })}</b> ini sebagai referensi untuk penyesuaian bahan pada jadwal masak {format(new Date(selectedSubMenu?.menuDate || menu.menuDate), 'dd MMM yyyy', { locale: id })}.
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
