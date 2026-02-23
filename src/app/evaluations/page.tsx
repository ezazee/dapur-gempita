'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Star, MessageSquare, FileBarChart, CheckCircle2, AlertCircle, Info, Calendar, Users2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getMenus } from '@/app/actions/menus';
import { EvaluateMenuDialog } from '@/components/menus/EvaluateMenuDialog';
import { MenuStatisticsDialog } from '@/components/menus/MenuStatisticsDialog';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { RouteGuard } from '@/components/RouteGuard';
import { cn } from '@/lib/utils';

export default function EvaluationsPage() {
    const { role } = useAuth();
    const [menus, setMenus] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isEvalOpen, setIsEvalOpen] = useState(false);
    const [selectedMenu, setSelectedMenu] = useState<any>(null);
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [selectedStatsMenu, setSelectedStatsMenu] = useState<any>(null);

    const canEvaluate = ['AHLI_GIZI', 'SUPER_ADMIN'].includes(role || '');

    useEffect(() => {
        fetchMenus();
    }, []);

    const fetchMenus = async () => {
        setLoading(true);
        try {
            const data = await getMenus();
            setMenus(data);
        } catch (error) {
            toast.error('Gagal mengambil data menu');
        } finally {
            setLoading(false);
        }
    };

    const handleEvaluateClick = (menu: any) => {
        setSelectedMenu(menu);
        setIsEvalOpen(true);
    };

    const handleStatsClick = (menu: any) => {
        setSelectedStatsMenu(menu);
        setIsStatsOpen(true);
    };

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'AHLI_GIZI']}>
            <DashboardLayout
                title="Evaluasi Menu"
                description="Pantau dan evaluasi ketepatan porsi serta kualitas menu yang telah dijalankan."
            >
                <div className="space-y-6">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <Card key={i} className="animate-pulse h-[250px] bg-muted/20" />
                            ))}
                        </div>
                    ) : menus.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/10">
                            <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium">Belum ada data menu</h3>
                            <p className="text-muted-foreground">Silakan buat jadwal masak terlebih dahulu untuk memulai evaluasi.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {menus.map((menu) => {
                                const isEvaluated = !!menu.evaluatorId;
                                const totalIngredients = menu.ingredients?.length || 0;
                                const perfectlyFitted = menu.ingredients?.filter((i: any) => i.evaluationStatus === 'PAS').length || 0;
                                const issuesCount = totalIngredients - perfectlyFitted;
                                const accuracyPercentage = totalIngredients > 0 ? Math.round((perfectlyFitted / totalIngredients) * 100) : 0;

                                return (
                                    <Card key={menu.id} className={cn(
                                        "transition-all duration-200 border-2",
                                        isEvaluated ? "hover:border-primary/20" : "border-yellow-200 bg-yellow-50/10"
                                    )}>
                                        <CardHeader className="pb-3">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                                        <Calendar className="h-3 w-3 mr-1" />
                                                        {format(new Date(menu.menuDate), 'dd MMM yyyy', { locale: id })}
                                                    </div>
                                                    <div className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                                        <Users2 className="h-3 w-3 mr-1" />
                                                        {menu.portionCount} Pax
                                                    </div>
                                                </div>
                                                {isEvaluated ? (
                                                    <Badge className="bg-green-600 hover:bg-green-700">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Ter-evaluasi
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-yellow-600 border-yellow-600 bg-yellow-50 animate-pulse">
                                                        <AlertCircle className="h-3 w-3 mr-1" /> Perlu Evaluasi
                                                    </Badge>
                                                )}
                                            </div>
                                            <CardTitle className="text-xl font-bold line-clamp-1">{menu.name}</CardTitle>
                                            <CardDescription className="line-clamp-2 min-h-[40px]">
                                                {menu.description || 'Tidak ada deskripsi tambahan.'}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pb-4 space-y-4">
                                            {isEvaluated ? (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end mb-1">
                                                        <span className="text-sm font-medium">Ketepatan Bahan</span>
                                                        <span className="text-sm font-bold text-primary">{accuracyPercentage}%</span>
                                                    </div>
                                                    <Progress value={accuracyPercentage} className="h-2" />
                                                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                                                        <span className="flex items-center gap-1">
                                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                                            {perfectlyFitted} Pas
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <div className="w-2 h-2 rounded-full bg-orange-400" />
                                                            {issuesCount} Bermasalah
                                                        </span>
                                                        <span>Total: {totalIngredients}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-6 text-center bg-muted/30 rounded-lg border border-dashed">
                                                    <p className="text-xs text-muted-foreground">Belum ada data evaluasi untuk menu ini.</p>
                                                </div>
                                            )}
                                        </CardContent>
                                        <CardFooter className="pt-2 gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => handleStatsClick(menu)}
                                            >
                                                <FileBarChart className="h-4 w-4 mr-2" /> Riwayat
                                            </Button>
                                            {canEvaluate && (
                                                <Button
                                                    variant={isEvaluated ? "secondary" : "default"}
                                                    size="sm"
                                                    className="flex-[1.5]"
                                                    onClick={() => handleEvaluateClick(menu)}
                                                >
                                                    {isEvaluated ? 'Ubah Evaluasi' : 'Beri Evaluasi'}
                                                </Button>
                                            )}
                                        </CardFooter>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>

                <EvaluateMenuDialog
                    open={isEvalOpen}
                    onOpenChange={setIsEvalOpen}
                    menu={selectedMenu}
                    onSuccess={fetchMenus}
                />

                <MenuStatisticsDialog
                    open={isStatsOpen}
                    onOpenChange={setIsStatsOpen}
                    menu={selectedStatsMenu}
                />
            </DashboardLayout>
        </RouteGuard>
    );
}
