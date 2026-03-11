'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/RouteGuard';
import {
    Calendar, Filter, Search, Clock,
    ChefHat, ShoppingCart, ClipboardCheck, Utensils,
    CalendarDays, User, ArrowRight, Info, Cookie
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    getUnifiedHistory,
    HistoryEvent,
    HistoryType
} from '@/app/actions/history';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { DateFilter } from '@/components/shared/DateFilter';

// Dialogs
import { MenuDetailDialog } from '@/components/menus/MenuDetailDialog';
import { PurchaseDetailDialog } from '@/components/purchases/PurchaseDetailDialog';
import { ReceiptDetailDialog } from '@/components/receipts/ReceiptDetailDialog';
import { ProductionDetailDialog } from '@/components/productions/ProductionDetailDialog';

export default function HistoryPage() {
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<HistoryEvent[]>([]);
    const [filters, setFilters] = useState<{
        startDate: string;
        endDate: string;
        types: HistoryType[];
    }>({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        types: ['planning', 'purchase', 'receipt', 'production']
    });

    // Modal State
    const [selectedEvent, setSelectedEvent] = useState<HistoryEvent | null>(null);
    const [modals, setModals] = useState({
        menu: false,
        purchase: false,
        receipt: false,
        production: false
    });

    useEffect(() => {
        fetchHistory();
    }, [filters]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const data = await getUnifiedHistory({
                startDate: filters.startDate,
                endDate: filters.endDate,
                type: filters.types
            });
            setEvents(data);
        } catch (error) {
            toast.error('Gagal mengambil data riwayat');
        } finally {
            setLoading(false);
        }
    };

    const toggleType = (type: HistoryType) => {
        setFilters(prev => ({
            ...prev,
            types: prev.types.includes(type)
                ? prev.types.filter(t => t !== type)
                : [...prev.types, type]
        }));
    };

    const handleViewDetail = (event: HistoryEvent) => {
        setSelectedEvent(event);
        setModals({
            menu: event.type === 'planning',
            purchase: event.type === 'purchase',
            receipt: event.type === 'receipt',
            production: event.type === 'production'
        });
    };

    const getEventStyles = (typeOrEvent: HistoryType | HistoryEvent) => {
        const type = typeof typeOrEvent === 'string' ? typeOrEvent : typeOrEvent.type;
        const data = typeof typeOrEvent === 'string' ? null : typeOrEvent.data;

        switch (type) {
            case 'planning': {
                const isKering = data?.menuType === 'KERING';
                return {
                    icon: isKering ? Cookie : Utensils,
                    color: isKering ? 'text-amber-600' : 'text-indigo-600',
                    bg: isKering ? 'bg-amber-50' : 'bg-indigo-50',
                    border: isKering ? 'border-amber-100' : 'border-indigo-100',
                    label: isKering ? 'Gizi (Snack)' : 'Ahli Gizi'
                };
            }
            case 'purchase': {
                const isOp = data?.purchaseType === 'OPERATIONAL';
                return {
                    icon: ShoppingCart,
                    color: isOp ? 'text-rose-600' : 'text-emerald-600',
                    bg: isOp ? 'bg-rose-50' : 'bg-emerald-50',
                    border: isOp ? 'border-rose-100' : 'border-emerald-100',
                    label: isOp ? 'Keuangan (Op)' : 'Keuangan'
                };
            }
            case 'receipt': {
                const isOp = data?.purchaseType === 'OPERATIONAL';
                return {
                    icon: ClipboardCheck,
                    color: isOp ? 'text-rose-600' : 'text-purple-600',
                    bg: isOp ? 'bg-rose-50' : 'bg-purple-50',
                    border: isOp ? 'border-rose-100' : 'border-purple-100',
                    label: isOp ? 'Aslap (Op)' : 'Aslap'
                };
            }
            case 'production': {
                const isKering = data?.menuType === 'KERING';
                return {
                    icon: ChefHat,
                    color: isKering ? 'text-orange-600' : 'text-blue-600',
                    bg: isKering ? 'bg-orange-50' : 'bg-blue-50',
                    border: isKering ? 'border-orange-100' : 'border-blue-100',
                    label: isKering ? 'Chef (Snack)' : 'Chef'
                };
            }
        }
    };

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'KEPALA_DAPUR']}>
            <DashboardLayout
                title="Riwayat Aktivitas Terpadu"
                description="Pantau seluruh alur kerja mulai dari perencanaan hingga produksi."
            >
                <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Filters Header */}
                    <Card className="border-primary/20 shadow-sm bg-white overflow-hidden border-t-4 border-t-primary">
                        <CardContent className="p-4 sm:p-6 space-y-6">
                            <div className="flex flex-col gap-6">
                                <DateFilter
                                    minimal
                                    onFilter={(startDate, endDate) => setFilters(prev => ({ ...prev, startDate, endDate }))}
                                    isLoading={loading}
                                />

                                <div className="space-y-3 pt-4 border-t border-slate-100">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <Filter className="w-3 h-3 text-primary" /> Filter Peran / Kategori
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {(['planning', 'purchase', 'receipt', 'production'] as HistoryType[]).map(type => {
                                            const styles = getEventStyles(type);
                                            const Icon = styles.icon;
                                            const isActive = filters.types.includes(type);
                                            return (
                                                <Button
                                                    key={type}
                                                    variant={isActive ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => toggleType(type)}
                                                    className={cn(
                                                        "h-9 rounded-full px-4 gap-2 transition-all",
                                                        isActive ? "shadow-md scale-105" : "hover:border-primary/50"
                                                    )}
                                                >
                                                    <Icon className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">{styles.label}</span>
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Timeline Content */}
                    <div className="relative pl-4 sm:pl-8 space-y-8 before:absolute before:inset-0 before:left-[19px] sm:before:left-[35px] before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:via-muted before:to-transparent">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="relative pl-10">
                                    <Skeleton className="h-24 w-full rounded-2xl" />
                                </div>
                            ))
                        ) : events.length === 0 ? (
                            <div className="py-20 text-center space-y-3">
                                <div className="inline-flex p-4 rounded-full bg-muted">
                                    <Search className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-bold">Tidak ada riwayat ditemukan</h3>
                                <p className="text-sm text-muted-foreground">Coba ubah filter tanggal atau kategori peran.</p>
                            </div>
                        ) : (
                            events.map((event, idx) => {
                                const styles = getEventStyles(event);
                                const Icon = styles.icon;
                                return (
                                    <div
                                        key={event.id}
                                        className="relative pl-10 group"
                                    >
                                        {/* Dot/Icon on Timeline */}
                                        <div className={cn(
                                            "absolute left-[-11px] sm:left-[-11px] top-6 w-11 h-11 rounded-full border-4 border-background flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-lg z-10",
                                            styles.bg, styles.color
                                        )} style={{ left: idx % 1 === 0 ? undefined : undefined }}>
                                            <Icon className="w-5 h-5" />
                                        </div>

                                        {/* Event Card */}
                                        <Card
                                            className={cn(
                                                "border-none shadow-sm hover:shadow-md transition-all cursor-pointer rounded-2xl overflow-hidden group/card",
                                                styles.bg, "bg-opacity-40"
                                            )}
                                            onClick={() => handleViewDetail(event)}
                                        >
                                            <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="outline" className={cn("text-[10px] uppercase font-black px-2 py-0", styles.bg, styles.color, styles.border)}>
                                                            {styles.label}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {format(new Date(event.timestamp), 'HH:mm')}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground ml-2">
                                                            {format(new Date(event.timestamp), 'dd MMM yyyy', { locale: id })}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-bold text-base text-foreground group-hover/card:text-primary transition-colors">
                                                        {event.title}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {event.description}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-3 md:pt-0">
                                                    <div className="flex flex-col items-start md:items-end">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Oleh</span>
                                                        <span className="text-sm font-semibold flex items-center gap-1.5">
                                                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary">
                                                                {event.user.charAt(0)}
                                                            </div>
                                                            {event.user}
                                                        </span>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="rounded-full bg-background/50 hover:bg-background">
                                                        <ArrowRight className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Unified Modals */}
                <MenuDetailDialog
                    open={modals.menu}
                    onOpenChange={(open) => setModals(m => ({ ...m, menu: open }))}
                    menu={selectedEvent?.data}
                />

                {modals.purchase && (
                    <PurchaseDetailDialog
                        open={modals.purchase}
                        onOpenChange={(open) => setModals(m => ({ ...m, purchase: open }))}
                        purchase={selectedEvent?.data}
                    />
                )}

                {modals.receipt && (
                    <ReceiptDetailDialog
                        open={modals.receipt}
                        onOpenChange={(open) => setModals(m => ({ ...m, receipt: open }))}
                        receipt={selectedEvent?.data}
                    />
                )}

                <ProductionDetailDialog
                    open={modals.production}
                    onOpenChange={(open) => setModals(m => ({ ...m, production: open }))}
                    production={selectedEvent?.data}
                />
            </DashboardLayout>
        </RouteGuard>
    );
}
