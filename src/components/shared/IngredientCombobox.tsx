'use client';

import * as React from "react";
import { Check, ChevronsUpDown, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { searchIngredients } from "@/app/actions/menus";

interface IngredientComboboxProps {
    value: string;
    onSelectIngredient: (ingredient: { id: string; name: string; unit: string; currentStock?: number }) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    category?: string;
}

const COMMON_UNITS = ["kg", "gram", "liter", "ml", "sdm", "sdt", "siung", "ruas", "butir", "buah", "pack", "ikat", "sisir", "botol", "karung", "kotak", "potong", "ekor", "bungkus", "porsi"];

export function IngredientCombobox({
    value,
    onSelectIngredient,
    placeholder = "Cari bahan...",
    className,
    disabled,
    category
}: IngredientComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [customUnit, setCustomUnit] = React.useState("");
    const [results, setResults] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);

    // Initial load/search
    React.useEffect(() => {
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await searchIngredients(query, category);
                setResults(data);
            } catch (error) {
                console.error("Failed to search ingredients:", error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, category]);

    const exactMatch = results.find(r => r.name.toLowerCase() === query.toLowerCase());

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between font-normal", className)}
                    disabled={disabled}
                >
                    {value || placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Ketik nama bahan..."
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        {loading && <div className="p-4 text-center text-xs text-muted-foreground">Mencari...</div>}

                        {!loading && results.length > 0 && (
                            <div className="p-1">
                                <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">
                                    Hasil Pencarian di Gudang
                                </div>
                                {results.map((item) => (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none transition-colors",
                                            "hover:bg-accent hover:text-accent-foreground active:bg-accent/80"
                                        )}
                                        // Manual selection logic - trigger on Mousedown AND Click for maximum reliability
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onSelectIngredient({
                                                id: item.id,
                                                name: item.name,
                                                unit: item.unit,
                                                currentStock: item.currentStock
                                            });
                                            setOpen(false);
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4 shrink-0",
                                                value === item.name ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col min-w-0">
                                            <span className="truncate font-medium">{item.name}</span>
                                            <span className="text-[10px] text-muted-foreground">Stok: {item.currentStock} {item.unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && query.trim() !== "" && !exactMatch && (
                            <div className="p-1 border-t border-dashed mt-1 text-left">
                                <div className="px-2 py-1.5 text-[10px] font-bold text-primary uppercase tracking-widest opacity-80">
                                    Daftarkan Bahan Baru
                                </div>
                                {COMMON_UNITS.slice(0, 10).map((unit) => (
                                    <div
                                        key={unit}
                                        className={cn(
                                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                                            "hover:bg-primary/10 hover:text-primary active:bg-primary/20 text-primary/80"
                                        )}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onSelectIngredient({
                                                id: 'NEW',
                                                name: query.trim(),
                                                unit: unit,
                                                currentStock: 0
                                            });
                                            setOpen(false);
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                    >
                                        <Plus className="mr-2 h-4 w-4 shrink-0" />
                                        <div className="flex flex-col min-w-0">
                                            <span className="truncate">Pakai "{query.trim()}"</span>
                                            <span className="text-[10px] opacity-70">Satuan: {unit}</span>
                                        </div>
                                    </div>
                                ))}

                                <div className="mt-2 border-t pt-2 px-1 pb-1">
                                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase opacity-70 mb-1">
                                        Pake Satuan Lain
                                    </div>
                                    <div className="flex items-center gap-2 p-1">
                                        <Input
                                            placeholder="Tulis satuan (misal: potong, ekor)"
                                            value={customUnit}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomUnit(e.target.value)}
                                            className="h-8 text-[11px]"
                                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                                if (e.key === 'Enter' && customUnit.trim()) {
                                                    onSelectIngredient({
                                                        id: 'NEW',
                                                        name: query.trim(),
                                                        unit: customUnit.trim(),
                                                        currentStock: 0
                                                    });
                                                    setOpen(false);
                                                }
                                            }}
                                        />
                                        <Button
                                            size="sm"
                                            className="h-8 px-2 text-[10px]"
                                            disabled={!customUnit.trim()}
                                            // onMouseDown fires before focus loss (blur), 
                                            // ensuring the logic executes while popover is still interactive.
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (customUnit.trim()) {
                                                    onSelectIngredient({
                                                        id: 'NEW',
                                                        name: query.trim(),
                                                        unit: customUnit.trim(),
                                                        currentStock: 0
                                                    });
                                                    setOpen(false);
                                                }
                                            }}
                                        >
                                            OK
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!loading && results.length === 0 && query.trim() === "" && (
                            <CommandEmpty>Ketik untuk mencari atau menambah bahan.</CommandEmpty>
                        )}
                        {!loading && results.length === 0 && query.trim() !== "" && !exactMatch && (
                            <div className="p-4 text-xs text-muted-foreground italic text-center border-t border-dashed mt-2">
                                Bahan "{query}" belum ada di Gudang. Silakan pilih satuan atau ketik satuan kustom di atas.
                            </div>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
