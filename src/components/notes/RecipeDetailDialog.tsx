'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface RecipeDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recipe: any | null;
}

export function RecipeDetailDialog({ open, onOpenChange, recipe }: RecipeDetailDialogProps) {
    if (!recipe) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{recipe.name}</DialogTitle>
                    <DialogDescription>
                        Porsi Dasar: {recipe.portionSize} pax
                    </DialogDescription>
                </DialogHeader>

                {recipe.description && (
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        {recipe.description}
                    </div>
                )}

                <div className="mt-4">
                    <h4 className="font-semibold mb-2">Komposisi Bahan (per {recipe.portionSize} pax)</h4>
                    <div className="border rounded-md overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Bahan</TableHead>
                                    <TableHead className="text-right">Jumlah</TableHead>
                                    <TableHead className="w-[80px]">Satuan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recipe.ingredients.map((ing: any) => (
                                    <TableRow key={ing.id}>
                                        <TableCell>{ing.name}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {ing.qtyPerPortion}
                                        </TableCell>
                                        <TableCell>{ing.unit}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
