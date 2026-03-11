'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Plus, Search, Eye, Trash2, BookOpen, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { getRecipes, deleteRecipe } from '@/app/actions/recipes';
import { toast } from 'sonner';
import { cookingStepsSummary } from '@/components/shared/CookingSteps';
import { AlertConfirm } from '@/components/shared/AlertConfirm';
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
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
    const [recipeToEdit, setRecipeToEdit] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

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
        setLoading(true);
        try {
            const res = await deleteRecipe(id);
            if (res.success) {
                toast.success('Resep berhasil dihapus');
                fetchRecipes();
            } else {
                toast.error('Gagal menghapus resep');
            }
        } catch (error) {
            toast.error('Terjadi kesalahan');
        } finally {
            setLoading(false);
            setDeleteId(null);
        }
    };

    const handleViewDetail = (recipe: any) => {
        setSelectedRecipe(recipe);
        setIsDetailOpen(true);
    };

    const handleEdit = (recipe: any) => {
        setRecipeToEdit(recipe);
        setIsCreateOpen(true);
    };

    const handleCreate = () => {
        setRecipeToEdit(null);
        setIsCreateOpen(true);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const filteredRecipes = recipes.filter(r => {
        const queryTerms = searchQuery.toLowerCase().trim().split(/\s+/).filter(t => t !== '');
        if (queryTerms.length === 0) return true;

        const recipeName = r.name.toLowerCase();
        const recipeDesc = (r.description || '').toLowerCase();

        // Must match all query terms (fuzzy and order-independent)
        return queryTerms.every(term =>
            recipeName.includes(term) || recipeDesc.includes(term)
        );
    });

    const totalPages = Math.ceil(filteredRecipes.length / itemsPerPage) || 1;
    const paginatedRecipes = filteredRecipes.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <RouteGuard allowedRoles={['SUPER_ADMIN', 'AHLI_GIZI', 'KEPALA_DAPUR', 'CHEF']}>
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
                        <Button onClick={handleCreate}>
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
                                paginatedRecipes.map((recipe, index) => (
                                    <TableRow key={recipe.id}>
                                        <TableCell className="text-center font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                                        <TableCell className="font-semibold">{recipe.name}</TableCell>
                                        <TableCell className="hidden md:table-cell text-muted-foreground max-w-[300px]">
                                            <span className="inline-flex items-center gap-1 text-xs">
                                                {recipe.description ? cookingStepsSummary(recipe.description) : '-'}
                                            </span>
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
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Edit"
                                                        onClick={() => handleEdit(recipe)}
                                                    >
                                                        <Pencil className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Hapus"
                                                        onClick={() => setDeleteId(recipe.id)}
                                                    >
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

                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 border-t pt-4 gap-4">
                        <div className="text-sm text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
                            Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredRecipes.length)} dari {filteredRecipes.length} resep
                        </div>
                        <div className="flex items-center space-x-2 order-1 sm:order-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="h-8 px-2 sm:px-3"
                            >
                                <ChevronLeft className="h-4 w-4 sm:mr-1" />
                                <span className="hidden sm:inline">Sebelumnya</span>
                            </Button>
                            <div className="text-xs sm:text-sm font-medium px-2">
                                Halaman {currentPage} / {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="h-8 px-2 sm:px-3"
                            >
                                <span className="hidden sm:inline">Selanjutnya</span>
                                <ChevronRight className="h-4 w-4 sm:ml-1" />
                            </Button>
                        </div>
                    </div>
                )}

                <CreateRecipeDialog
                    open={isCreateOpen}
                    onOpenChange={setIsCreateOpen}
                    onSuccess={fetchRecipes}
                    recipeToEdit={recipeToEdit}
                />

                <RecipeDetailDialog
                    open={isDetailOpen}
                    onOpenChange={setIsDetailOpen}
                    recipe={selectedRecipe}
                />

                <AlertConfirm
                    open={!!deleteId}
                    onOpenChange={(open) => !open && setDeleteId(null)}
                    title="Hapus Resep"
                    description="Apakah Anda yakin ingin menghapus resep standar ini? Data yang sudah dihapus tidak bisa dikembalikan."
                    confirmText="Hapus"
                    variant="destructive"
                    onConfirm={() => deleteId && handleDelete(deleteId)}
                />
            </DashboardLayout>
        </RouteGuard>
    );
}
