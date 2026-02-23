'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, Trash2, Eye, Pencil, History, Copy, ArrowRight, ChefHat, Utensils } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getMenus, deleteMenu } from '@/app/actions/menus';
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
            setMenus(data);
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
            // Fetch all (no date filters)
            const data = await getMenus();
            setAllHistory(data);
        } catch (error) {
            toast.error('Gagal mengambil riwayat');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah anda yakin ingin menghapus menu ini?')) return;
        const res = await deleteMenu(id);
        if (res.success) {
            toast.success('Menu berhasil dihapus');
            if (activeTab === 'active') fetchMenus(); else fetchAllHistory();
        } else {
            toast.error('Gagal menghapus menu');
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

    const filteredHistory = allHistory.filter(m =>
        m.name.toLowerCase().includes(searchHistory.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchHistory.toLowerCase()))
    );

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'AHLI_GIZI', 'KEUANGAN', 'ASLAP', 'KEPALA_DAPUR']}>
            <DashboardLayout
                title="Jadwal Masak Harian"
                description="Pusat pengelolaan jadwal masak dan riwayat."
            >
                <Tabs defaultValue="active" onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
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
                        <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:space-y-0 text-right">
                            <div className="flex items-center space-x-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-[260px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
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
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={date?.from}
                                            selected={date}
                                            onSelect={setDate}
                                            numberOfMonths={2}
                                        />
                                    </PopoverContent>
                                </Popover>
                                {date && (
                                    <Button variant="ghost" onClick={() => setDate(undefined)} title="Tampilkan Semua">
                                        Hapus Filter
                                    </Button>
                                )}
                            </div>

                            {canCreate && (
                                <Button onClick={handleCreate}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Jadwalkan Masak
                                </Button>
                            )}
                        </div>

                        {/* TABLE ACTIVE */}
                        <div className="border rounded-lg overflow-x-auto bg-card">
                            <Table>
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
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">Memuat data...</TableCell>
                                        </TableRow>
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
                                                <TableCell className="font-semibold">{menu.name}</TableCell>
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
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(menu.id)}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
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
                        <div className="flex items-center justify-between">
                            <div className="relative max-w-sm w-full">
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
                            <Table>
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
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">Memuat riwayat...</TableCell>
                                        </TableRow>
                                    ) : allHistory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                                Belum ada riwayat.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredHistory.map((menu) => (
                                            <TableRow key={menu.id}>
                                                <TableCell className="text-muted-foreground whitespace-nowrap">
                                                    {format(new Date(menu.menuDate), 'dd MMM yyyy', { locale: id })}
                                                </TableCell>
                                                <TableCell className="font-medium">{menu.name}</TableCell>
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
