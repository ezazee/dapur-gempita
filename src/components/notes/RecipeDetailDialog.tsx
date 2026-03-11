'use client';

import { useState, useEffect } from 'react';

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRecipeQty } from '@/lib/utils';
import { Utensils, BookOpen } from 'lucide-react';
import { CookingSteps } from '@/components/shared/CookingSteps';

interface RecipeDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recipe: any | null;
}

export function RecipeDetailDialog({ open, onOpenChange, recipe }: RecipeDetailDialogProps) {


    if (!recipe) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between mr-6">
                        <DialogTitle className="text-2xl font-black text-primary">{recipe.name}</DialogTitle>
                        <div className="px-2 py-1 bg-muted rounded text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                            {recipe.portionSize} Pax
                        </div>
                    </div>
                    <DialogDescription className="text-xs italic">
                        Porsi Dasar Standard Resep
                    </DialogDescription>
                </DialogHeader>

                {recipe.description && (
                    <CookingSteps description={recipe.description} />
                )}


                {(recipe.calories !== undefined || recipe.carbs !== undefined || recipe.protein !== undefined || recipe.fat !== undefined) && (
                    <div className="mt-2 border rounded-xl overflow-hidden bg-gradient-to-br from-background to-secondary/5 shadow-sm">
                        <div className="bg-secondary/10 px-4 py-2 border-b">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Utensils className="h-3 w-3" /> Informasi Gizi (per {recipe.portionSize} pax)
                            </h4>
                        </div>
                        <div className="grid grid-cols-4 divide-x divide-border">
                            <div className="p-4 text-center hover:bg-muted/5 transition-colors">
                                <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter mb-1">Kalori</div>
                                <div className="font-black text-lg text-primary">{recipe.calories ? (recipe.calories).toFixed(1) : '-'}</div>
                                <div className="text-[10px] text-muted-foreground uppercase">kcal</div>
                            </div>
                            <div className="p-4 text-center hover:bg-muted/5 transition-colors">
                                <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter mb-1">Karbo</div>
                                <div className="font-black text-lg text-primary">{recipe.carbs ? (recipe.carbs).toFixed(1) : '-'}</div>
                                <div className="text-[10px] text-muted-foreground uppercase">g</div>
                            </div>
                            <div className="p-4 text-center hover:bg-muted/5 transition-colors">
                                <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter mb-1">Protein</div>
                                <div className="font-black text-lg text-primary">{recipe.protein ? (recipe.protein).toFixed(1) : '-'}</div>
                                <div className="text-[10px] text-muted-foreground uppercase">g</div>
                            </div>
                            <div className="p-4 text-center hover:bg-muted/5 transition-colors">
                                <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter mb-1">Lemak</div>
                                <div className="font-black text-lg text-primary">{recipe.fat ? (recipe.fat).toFixed(1) : '-'}</div>
                                <div className="text-[10px] text-muted-foreground uppercase">g</div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 space-y-3">
                    <h4 className="font-bold text-sm flex items-center gap-2 text-foreground">
                        <BookOpen className="h-4 w-4 text-primary" /> Komposisi Bahan (per {recipe.portionSize} pax)
                    </h4>
                    <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
                        <div className="overflow-x-auto">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-muted hover:bg-muted font-bold">
                                        <TableHead className="w-[50%] font-black uppercase tracking-wider text-[10px]">Nama Bahan</TableHead>
                                        <TableHead className="text-center bg-primary/5 text-primary font-black uppercase tracking-wider text-[10px] border-x border-primary/10">Gramasi / Porsi</TableHead>
                                        <TableHead className="text-center w-[80px] font-black uppercase tracking-wider text-[10px]">Unit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recipe.ingredients.map((ing: any) => {
                                        const qBase = ing.qtyBesar; // Menggunakan qtyBesar sebagai base per porsi

                                        if (ing.isSecukupnya) {
                                            return (
                                                <TableRow key={ing.id} className="hover:bg-amber-50/40 group transition-colors bg-amber-50/20">
                                                    <TableCell className="font-bold text-foreground py-3 border-r group-hover:bg-amber-50/50">{ing.name}</TableCell>
                                                    <TableCell className="py-3 px-4 border-x">
                                                        <span className="inline-flex text-center items-center gap-1.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full px-3 py-1 text-xs font-bold w-full justify-center">
                                                            ⚠️ Secukupnya — estimasi manual dari resep
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center text-muted-foreground font-medium py-3 border-l italic">{ing.unit}</TableCell>
                                                </TableRow>
                                            );
                                        }

                                        return (
                                            <TableRow key={ing.id} className="hover:bg-muted/30 group transition-colors">
                                                <TableCell className="font-bold text-foreground py-3 border-r group-hover:bg-muted/50">{ing.name}</TableCell>
                                                <TableCell className="text-center font-black py-3 bg-primary/5 text-primary text-sm border-x border-primary/10 w-[30%]">{formatRecipeQty(qBase, ing.unit).stringValue}</TableCell>
                                                <TableCell className="text-center text-muted-foreground font-medium py-3 border-l italic">{ing.unit}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
