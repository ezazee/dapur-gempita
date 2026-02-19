'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Search } from 'lucide-react';
import { getRecipes } from '@/app/actions/recipes';
import { toast } from 'sonner';

interface RecipeSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (recipe: any) => void;
}

export function RecipeSelectionDialog({ open, onOpenChange, onSelect }: RecipeSelectionDialogProps) {
    const [recipes, setRecipes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (open) {
            fetchRecipes();
        }
    }, [open]);

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

    const filteredRecipes = recipes.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleSelect = (recipe: any) => {
        onSelect(recipe);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Pilih dari Master Resep</DialogTitle>
                    <DialogDescription>
                        Pilih resep standar untuk digunakan dalam menu ini.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center space-x-2 my-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari resep..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>

                <div className="border rounded-md overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Resep</TableHead>
                                <TableHead className="hidden md:table-cell">Deskripsi</TableHead>
                                <TableHead className="w-[100px] text-center">Porsi Dasar</TableHead>
                                <TableHead className="w-[80px] text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        Memuat data...
                                    </TableCell>
                                </TableRow>
                            ) : filteredRecipes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                        Tidak ada resep ditemukan.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRecipes.map((recipe) => (
                                    <TableRow key={recipe.id}>
                                        <TableCell className="font-medium">{recipe.name}</TableCell>
                                        <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[200px]">
                                            {recipe.description}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {recipe.portionSize} pax
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                onClick={() => handleSelect(recipe)}
                                                className="h-8"
                                            >
                                                Pilih
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
