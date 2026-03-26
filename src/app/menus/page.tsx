'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isSameDay, isWithinInterval, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, Eye, Pencil, History, Copy, ArrowRight, ChefHat, Utensils } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getMenus } from '@/app/actions/menus';
import { CreateMenuDialog } from '@/components/menus/CreateMenuDialog';
import { MenuDetailDialog } from '@/components/menus/MenuDetailDialog';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { RouteGuard } from '@/components/RouteGuard';
import { TableSkeleton, TableRowsSkeleton } from '@/components/shared/TableSkeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

export default function MenusPage() {
    const { role } = useAuth();
    const [activeTab, setActiveTab] = useState("active");

    // Date State for "Jadwal"
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    });

    const [menus, setMenus] = useState<any[]>([]);
    const [allHistory, setAllHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchHistory, setSearchHistory] = useState("");

    // History Filter & Pagination States
    const [historyFilter, setHistoryFilter] = useState("semua"); // hari_ini, 1_minggu, 1_bulan, custom, semua
    const [historyDate, setHistoryDate] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    });
    const [historyPage, setHistoryPage] = useState(1);
    const historyItemsPerPage = 10;

    // Dialog States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [initialData, setInitialData] = useState<any>(null); // For duplication

    // Selection States
    const [selectedMenu, setSelectedMenu] = useState<any>(null);
    const [menuToEdit, setMenuToEdit] = useState<any>(null);

    const canCreate = ['AHLI_GIZI', 'SUPER_ADMIN', 'CHEF'].includes(role || '');

    // Fetch for Active Tab (Date Filtered)
    useEffect(() => {
        if (activeTab === 'active') {
            fetchMenus();
        } else {
            fetchAllHistory();
        }
    }, [date, activeTab]);

    const fetchMenus = async () => {
        setLoading(true);
        try {
            const from = date?.from;
            const to = date?.to || date?.from;
            const data = await getMenus(from, to);

            // Group menus by date (consistent with History logic)
            const grouped = data.reduce((acc: any, menu: any) => {
                const dateKey = format(new Date(menu.menuDate), 'yyyy-MM-dd');
                if (!acc[dateKey]) {
                    acc[dateKey] = {
                        ...menu,
                        id: `group-active-${dateKey}`,
                        originalMenus: [menu],
                        countBesar: menu.countBesar || 0,
                        countKecil: menu.countKecil || 0,
                        countBumil: menu.countBumil || 0,
                        countBalita: menu.countBalita || 0,
                    };
                } else {
                    const g = acc[dateKey];
                    g.originalMenus.push(menu);
                    g.name = `${g.name} & ${menu.name}`;
                    if (g.description !== menu.description && menu.description) {
                        g.description = g.description ? `${g.description} | ${menu.description}` : menu.description;
                    }
                    g.ingredients = [...g.ingredients, ...menu.ingredients];
                    g.countBesar += (menu.countBesar || 0);
                    g.countKecil += (menu.countKecil || 0);
                    g.countBumil += (menu.countBumil || 0);
                    g.countBalita += (menu.countBalita || 0);
                }
                return acc;
            }, {});

            setMenus(Object.values(grouped).sort((a: any, b: any) => new Date(b.menuDate).getTime() - new Date(a.menuDate).getTime()));
        } catch (error) {
            toast.error('Gagal mengambil data menu');
        } finally {
            setLoading(false);
        }
    };

    // Fetch for History Tab (All)
    const fetchAllHistory = async () => {
        setLoading(true);
        try {
            const data = await getMenus();

            // Group menus by date
            const grouped = data.reduce((acc: any, menu: any) => {
                const dateKey = format(new Date(menu.menuDate), 'yyyy-MM-dd');
                if (!acc[dateKey]) {
                    acc[dateKey] = {
                        ...menu,
                        id: `group-history-${dateKey}`,
                        originalMenus: [menu],
                        countBesar: menu.countBesar || 0,
                        countKecil: menu.countKecil || 0,
                        countBumil: menu.countBumil || 0,
                        countBalita: menu.countBalita || 0,
                    };
                } else {
                    const g = acc[dateKey];
                    g.originalMenus.push(menu);
                    g.name = `${g.name} & ${menu.name}`;
                    if (g.description !== menu.description && menu.description) {
                        g.description = g.description ? `${g.description} | ${menu.description}` : menu.description;
                    }
                    g.ingredients = [...g.ingredients, ...menu.ingredients];
                    g.countBesar += (menu.countBesar || 0);
                    g.countKecil += (menu.countKecil || 0);
                    g.countBumil += (menu.countBumil || 0);
                    g.countBalita += (menu.countBalita || 0);
                }
                return acc;
            }, {});

            setAllHistory(Object.values(grouped).sort((a: any, b: any) => new Date(b.menuDate).getTime() - new Date(a.menuDate).getTime()));
        } catch (error) {
            toast.error('Gagal mengambil riwayat');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = (menu: any) => {
        setSelectedMenu(menu);
        setIsDetailOpen(true);
    };

    const handleEdit = (menu: any) => {
        setMenuToEdit(menu);
        setInitialData(null);
        setIsCreateOpen(true);
    };

    const handleCreate = () => {
        setMenuToEdit(null);
        setInitialData(null);
        setIsCreateOpen(true);
    };

    const handleDuplicate = (menu: any) => {
        setMenuToEdit(null);
        setInitialData(menu);
        setIsCreateOpen(true);
    };

    const sortedHistory = [...allHistory].sort((a: any, b: any) => new Date(b.menuDate).getTime() - new Date(a.menuDate).getTime());
    
    const filteredHistory = sortedHistory.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchHistory.toLowerCase()) ||
            (m.description && m.description.toLowerCase().includes(searchHistory.toLowerCase()));
            
        if (!matchesSearch) return false;

        const menuDate = new Date(m.menuDate);
        const today = new Date();

        if (historyFilter === 'hari_ini') {
            return isSameDay(menuDate, today);
        } else if (historyFilter === '1_minggu') {
            return isWithinInterval(menuDate, { start: startOfDay(subDays(today, 7)), end: endOfDay(today) });
        } else if (historyFilter === '1_bulan') {
            return isWithinInterval(menuDate, { start: startOfDay(subMonths(today, 1)), end: endOfDay(today) });
        } else if (historyFilter === 'custom') {
            if (historyDate?.from && historyDate?.to) {
                return isWithinInterval(menuDate, { start: startOfDay(historyDate.from), end: endOfDay(historyDate.to) });
            } else if (historyDate?.from) {
                return isSameDay(menuDate, historyDate.from);
            }
        }
        
        return true;
    });

    const totalHistoryPages = Math.ceil(filteredHistory.length / historyItemsPerPage) || 1;
    const paginatedHistory = filteredHistory.slice(
        (historyPage - 1) * historyItemsPerPage,
        historyPage * historyItemsPerPage
    );

    // Reset pagination when filter changes
    useEffect(() => {
        setHistoryPage(1);
    }, [searchHistory, historyFilter, historyDate]);

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'AHLI_GIZI', 'KEUANGAN', 'ASLAP', 'KEPALA_DAPUR']}>
            <DashboardLayout
                title="Jadwal Masak Harian"
                description="Pusat pengelolaan jadwal masak dan riwayat."
            >
                <Tabs defaultValue="active" onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full lg:w-[400px] grid-cols-2 mb-8">
                        <TabsTrigger value="active" className="flex items-center gap-2">
                            <Utensils className="h-4 w-4" />
                            Jadwal Masak
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Riwayat / Notes
                        </TabsTrigger>
                    </TabsList>

                    {/* TAB JADWAL */}
                    <TabsContent value="active" className="space-y-4">
                        <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:space-y-0 text-right">
                            <div className="flex items-center space-x-2 w-full lg:w-auto">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("flex-1 lg:w-[260px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            <div className="truncate">
                                                {date?.from ? (
                                                    date.to ? (
                                                        <>
                                                            {format(date.from, "dd MMM", { locale: id })} -{" "}
                                                            {format(date.to, "dd MMM yyyy", { locale: id })}
                                                        </>
                                                    ) : (
                                                        format(date.from, "PPP", { locale: id })
                                                    )
                                                ) : (
                                                    <span>Pilih Rentang Tanggal</span>
                                                )}
                                            </div>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={date?.from}
                                            selected={date}
                                            onSelect={setDate}
                                            numberOfMonths={1}
                                            className="hidden sm:block"
                                        />
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={date?.from}
                                            selected={date}
                                            onSelect={setDate}
                                            numberOfMonths={1}
                                            className="sm:hidden"
                                        />
                                    </PopoverContent>
                                </Popover>
                                {date && (
                                    <Button variant="ghost" onClick={() => setDate(undefined)} title="Tampilkan Semua" className="px-2">
                                        <span className="hidden sm:inline">Hapus Filter</span>
                                        <span className="sm:hidden text-xs">Reset</span>
                                    </Button>
                                )}
                            </div>

                            {canCreate && (
                                <Button onClick={handleCreate} className="w-full lg:w-auto">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Jadwalkan Masak
                                </Button>
                            )}
                        </div>

                        {/* TABLE ACTIVE */}
                        <div className="border rounded-lg overflow-x-auto bg-card">
                            <Table className="min-w-[800px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px] text-center">No</TableHead>
                                        <TableHead className="w-[180px]">Tanggal</TableHead>
                                        <TableHead>Menu</TableHead>
                                        <TableHead className="hidden md:table-cell">Deskripsi</TableHead>
                                        <TableHead className="w-[150px] text-center">Bahan</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRowsSkeleton columns={6} rows={5} />
                                    ) : menus.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                Tidak ada jadwal menu.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        menus.map((menu, index) => (
                                            <TableRow key={menu.id}>
                                                <TableCell className="text-center font-medium">{index + 1}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                                                        {format(new Date(menu.menuDate), 'dd MMM yyyy', { locale: id })}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-semibold">
                                                    <div className="flex flex-col gap-1">
                                                        <span>{menu.name}</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {menu.originalMenus?.some((m: any) => m.menuType === 'OMPRENG') && (
                                                                <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-100 font-bold uppercase tracking-tighter h-5 px-1.5">
                                                                    Menu Masak
                                                                </Badge>
                                                            )}
                                                            {menu.originalMenus?.some((m: any) => m.menuType === 'KERING') && (
                                                                <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-100 font-bold uppercase tracking-tighter h-5 px-1.5">
                                                                    Menu Kering
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                                                    {menu.description || '-'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                                        {menu.ingredients.length} Item
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right space-x-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleViewDetail(menu)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {canCreate && (
                                                        <>
                                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(menu)}>
                                                                <Pencil className="h-4 w-4 text-blue-500" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* TAB RIWAYAT (NOTES) */}
                    <TabsContent value="history" className="space-y-4">
                        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 text-right">
                            <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button 
                                        variant={historyFilter === 'semua' ? 'default' : 'outline'} 
                                        size="sm" 
                                        onClick={() => setHistoryFilter('semua')}
                                    >
                                        Semua Waktu
                                    </Button>
                                    <Button 
                                        variant={historyFilter === 'hari_ini' ? 'default' : 'outline'} 
                                        size="sm" 
                                        onClick={() => setHistoryFilter('hari_ini')}
                                    >
                                        Hari Ini
                                    </Button>
                                    <Button 
                                        variant={historyFilter === '1_minggu' ? 'default' : 'outline'} 
                                        size="sm" 
                                        onClick={() => setHistoryFilter('1_minggu')}
                                    >
                                        1 Minggu
                                    </Button>
                                    <Button 
                                        variant={historyFilter === '1_bulan' ? 'default' : 'outline'} 
                                        size="sm" 
                                        onClick={() => setHistoryFilter('1_bulan')}
                                    >
                                        1 Bulan
                                    </Button>
                                    <Button 
                                        variant={historyFilter === 'custom' ? 'default' : 'outline'} 
                                        size="sm" 
                                        onClick={() => setHistoryFilter('custom')}
                                    >
                                        Custom
                                    </Button>
                                </div>

                                {historyFilter === 'custom' && (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("w-full sm:w-[260px] justify-start text-left font-normal", !historyDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                <div className="truncate">
                                                    {historyDate?.from ? (
                                                        historyDate.to ? (
                                                            <>
                                                                {format(historyDate.from, "dd MMM", { locale: id })} -{" "}
                                                                {format(historyDate.to, "dd MMM yyyy", { locale: id })}
                                                            </>
                                                        ) : (
                                                            format(historyDate.from, "PPP", { locale: id })
                                                        )
                                                    ) : (
                                                        <span>Pilih Rentang Tanggal</span>
                                                    )}
                                                </div>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={historyDate?.from}
                                                selected={historyDate}
                                                onSelect={setHistoryDate}
                                                numberOfMonths={1}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </div>

                            <div className="relative w-full lg:w-64">
                                <History className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari riwayat menu..."
                                    value={searchHistory}
                                    onChange={(e) => setSearchHistory(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        <div className="border rounded-lg overflow-x-auto bg-card">
                            <Table className="min-w-[800px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[150px]">Tanggal Asli</TableHead>
                                        <TableHead>Nama Menu</TableHead>
                                        <TableHead className="hidden md:table-cell">Deskripsi</TableHead>
                                        <TableHead className="text-center">Bahan</TableHead>
                                        <TableHead className="text-right w-[200px]">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRowsSkeleton columns={5} rows={5} />
                                    ) : allHistory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                                Belum ada riwayat.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedHistory.map((menu) => (
                                            <TableRow key={menu.id}>
                                                <TableCell className="text-muted-foreground whitespace-nowrap">
                                                    {format(new Date(menu.menuDate), 'dd MMM yyyy', { locale: id })}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col gap-1">
                                                        <span>{menu.name}</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {menu.originalMenus?.some((m: any) => m.menuType === 'OMPRENG') && (
                                                                <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-100 font-bold uppercase tracking-tighter h-5 px-1.5">
                                                                    Menu Masak
                                                                </Badge>
                                                            )}
                                                            {menu.originalMenus?.some((m: any) => m.menuType === 'KERING') && (
                                                                <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-100 font-bold uppercase tracking-tighter h-5 px-1.5">
                                                                    Menu Kering
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                                                    {menu.description || '-'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                                        {menu.ingredients.length} Item
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right space-x-1">
                                                    {/* If grouped, we can't easily view single detail without picking one, 
                                                        but usually history view is for duplication. 
                                                        Let's just pass the group to duplication handler. */}
                                                    <Button variant="ghost" size="icon" onClick={() => handleViewDetail(menu)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {canCreate && (
                                                        <Button variant="default" size="sm" onClick={() => handleDuplicate(menu)}>
                                                            <Copy className="h-3 w-3 mr-2" />
                                                            Pakai Lagi
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {totalHistoryPages > 1 && (
                            <Pagination className="mt-4">
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious 
                                            href="#" 
                                            onClick={(e) => { e.preventDefault(); setHistoryPage(p => Math.max(1, p - 1)); }} 
                                            className={historyPage === 1 ? "pointer-events-none opacity-50" : ""}
                                        />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <span className="text-sm text-muted-foreground mx-4">
                                            Halaman {historyPage} dari {totalHistoryPages}
                                        </span>
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationNext 
                                            href="#" 
                                            onClick={(e) => { e.preventDefault(); setHistoryPage(p => Math.min(totalHistoryPages, p + 1)); }} 
                                            className={historyPage === totalHistoryPages ? "pointer-events-none opacity-50" : ""}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        )}
                    </TabsContent>
                </Tabs>

                <CreateMenuDialog
                    open={isCreateOpen}
                    onOpenChange={setIsCreateOpen}
                    date={date?.from || new Date()}
                    onSuccess={() => {
                        if (activeTab === 'active') fetchMenus(); else fetchAllHistory();
                    }}
                    menuToEdit={menuToEdit}
                    initialData={initialData}
                />

                <MenuDetailDialog
                    open={isDetailOpen}
                    onOpenChange={setIsDetailOpen}
                    menu={selectedMenu}
                />

            </DashboardLayout>
        </RouteGuard>
    );
}
