'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Plus, Search, Eye, Trash2, BookOpen } from 'lucide-react';
import { getRecipes, deleteRecipe } from '@/app/actions/recipes';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { RouteGuard } from '@/components/RouteGuard';
import { useAuth } from '@/hooks/useAuth';
import { CreateRecipeDialog } from '@/components/notes/CreateRecipeDialog';
import { RecipeDetailDialog } from '@/components/notes/RecipeDetailDialog';


export default function RecipesPage() {
    const { role } = useAuth();
    const [recipes, setRecipes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const canCreate = ['AHLI_GIZI', 'SUPER_ADMIN'].includes(role || '');

    useEffect(() => {
        fetchRecipes();
    }, []);

    const fetchRecipes = async () => {
        setLoading(true);
        try {
            const data = await getRecipes();
            setRecipes(data);
        } catch (error) {
            toast.error('Gagal mengambil data resep');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus master resep ini?')) return;
        const res = await deleteRecipe(id);
        if (res.success) {
            toast.success('Resep berhasil dihapus');
            fetchRecipes();
        } else {
            toast.error('Gagal menghapus resep');
        }
    };

    const handleViewDetail = (recipe: any) => {
        setSelectedRecipe(recipe);
        setIsDetailOpen(true);
    };

    const filteredRecipes = recipes.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'AHLI_GIZI', 'KEPALA_DAPUR']}>
            <DashboardLayout
                title="Kamus Resep (Standar)"
                description="Kumpulan resep standar dan takaran bahan per porsi."
            >
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari resep standar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    {canCreate && (
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Tambah Resep Standar
                        </Button>
                    )}
                </div>

                <div className="border rounded-lg overflow-x-auto bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px] text-center">No</TableHead>
                                <TableHead>Nama Resep</TableHead>
                                <TableHead className="hidden md:table-cell">Deskripsi</TableHead>
                                <TableHead className="w-[150px] text-center">Bahan</TableHead>
                                <TableHead className="w-[100px] text-center">Basis Porsi</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Memuat data...
                                    </TableCell>
                                </TableRow>
                            ) : filteredRecipes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <BookOpen className="h-8 w-8 opacity-20" />
                                            <p>Belum ada resep tersimpan.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRecipes.map((recipe, index) => (
                                    <TableRow key={recipe.id}>
                                        <TableCell className="text-center font-medium">{index + 1}</TableCell>
                                        <TableCell className="font-semibold">{recipe.name}</TableCell>
                                        <TableCell className="hidden md:table-cell text-muted-foreground max-w-[300px] truncate">
                                            {recipe.description || '-'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                                {recipe.ingredients.length} Jenis
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {recipe.portionSize} pax
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Lihat Detail"
                                                onClick={() => handleViewDetail(recipe)}
                                            >
                                                <Eye className="h-4 w-4 text-primary" />
                                            </Button>
                                            {canCreate && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Hapus"
                                                    onClick={() => handleDelete(recipe.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <CreateRecipeDialog
                    open={isCreateOpen}
                    onOpenChange={setIsCreateOpen}
                    onSuccess={fetchRecipes}
                />

                <RecipeDetailDialog
                    open={isDetailOpen}
                    onOpenChange={setIsDetailOpen}
                    recipe={selectedRecipe}
                />
            </DashboardLayout>
        </RouteGuard>
    );
}
