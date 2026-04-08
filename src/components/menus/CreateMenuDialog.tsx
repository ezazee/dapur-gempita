'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, X, Calculator, History, BookOpen, Loader2, Save, Warehouse, Copy, Zap, AlertCircle } from 'lucide-react';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { createMenu, updateMenu, deleteMenu } from '@/app/actions/menus';
import { getRecipeByName } from '@/app/actions/recipes';
import { toast } from 'sonner';

import { RecipeSelectionDialog } from './RecipeSelectionDialog';
import { HistorySelectionDialog } from './HistorySelectionDialog';
import { IngredientCombobox } from '@/components/shared/IngredientCombobox';
import { formatRecipeQty, denormalizeQty, getStandardUnit } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface CreateMenuDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    date: Date;
    onSuccess: () => void;
    menuToEdit?: any | null;
    initialData?: any | null; // Added for duplication from History
}

export function CreateMenuDialog({ open, onOpenChange, date, onSuccess, menuToEdit, initialData }: CreateMenuDialogProps) {
    // --- Ompreng States ---
    const [isOmprengEnabled, setIsOmprengEnabled] = useState(true);
    const [omprengName, setOmprengName] = useState('');
    const [omprengDescription, setOmprengDescription] = useState('');
    const [countOmprengBesar, setCountOmprengBesar] = useState<number | string>(100);
    const [countOmprengKecil, setCountOmprengKecil] = useState<number | string>(0);
    const [countOmprengBumil, setCountOmprengBumil] = useState<number | string>(0);
    const [countOmprengBalita, setCountOmprengBalita] = useState<number | string>(0);
    const [activeOmprengTargets, setActiveOmprengTargets] = useState<string[]>(['besar']);
    const [omprengNutritionData, setOmprengNutritionData] = useState<any>({});
    const [omprengBumilOverride, setOmprengBumilOverride] = useState(false);
    const [omprengBalitaOverride, setOmprengBalitaOverride] = useState(false);

    // --- Kering States ---
    const [isKeringEnabled, setIsKeringEnabled] = useState(false);
    const [keringName, setKeringName] = useState('');
    const [keringDescription, setKeringDescription] = useState('');
    const [countKeringBesar, setCountKeringBesar] = useState<number | string>(0);
    const [countKeringKecil, setCountKeringKecil] = useState<number | string>(0);
    const [countKeringBumil, setCountKeringBumil] = useState<number | string>(0);
    const [countKeringBalita, setCountKeringBalita] = useState<number | string>(0);
    const [activeKeringTargets, setActiveKeringTargets] = useState<string[]>([]);
    const [keringNutritionData, setKeringNutritionData] = useState<{
        [key: string]: { energi: string, protein: string, lemak: string, karbo: string }
    }>({});
    const [keringBumilOverride, setKeringBumilOverride] = useState(false);
    const [keringBalitaOverride, setKeringBalitaOverride] = useState(false);

    const [ingredientsOmpreng, setIngredientsOmpreng] = useState<{
        tempId: number,
        name: string;
        qty: number | string;
        qtyBesar?: number;
        qtyKecil?: number;
        qtyBumil?: number;
        qtyBalita?: number;
        energi?: number | string;
        protein?: number | string;
        lemak?: number | string;
        karbo?: number | string;
        gramasi?: number | string;
        unit: string;
        currentStock?: number;
        isSecukupnya?: boolean;
    }[]>([]);

    const [ingredientsKering, setIngredientsKering] = useState<{
        tempId: number,
        name: string;
        qty: number | string;
        qtyBesar?: number;
        qtyKecil?: number;
        qtyBumil?: number;
        qtyBalita?: number;
        energi?: number | string;
        protein?: number | string;
        lemak?: number | string;
        karbo?: number | string;
        gramasi?: number | string;
        unit: string;
        currentStock?: number;
        isSecukupnya?: boolean;
    }[]>([]);

    const [omprengId, setOmprengId] = useState<string | null>(null);
    const [keringId, setKeringId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Dialogs State
    const [isRecipeOpen, setIsRecipeOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyFilterType, setHistoryFilterType] = useState<'OMPRENG' | 'KERING' | null>(null);

    useEffect(() => {
        if (open && initialData) {
            handleSelectHistory(initialData);
        }
    }, [open, initialData]);

    const handleSelectRecipe = (recipe: any) => {
        setIsOmprengEnabled(true);
        setCountOmprengBesar(recipe.portionSize || 100);
        setCountOmprengKecil(0);
        setCountOmprengBumil(0);
        setCountOmprengBalita(0);
        setActiveOmprengTargets(['besar']);
        setOmprengName(`${recipe.name}`);
        setOmprengDescription(recipe.description || '');

        const recipeIngredients = recipe.ingredients.map((ing: any) => {
            const formattedBase = formatRecipeQty(ing.qtyPerPortion, ing.unit);
            let finalUnit = formattedBase.unit;

            return {
                tempId: Math.random(),
                name: ing.name,
                qty: 0,
                qtyBesar: ing.qtyBesar || 0,
                qtyKecil: ing.qtyKecil || 0,
                qtyBumil: ing.qtyBumil || 0,
                qtyBalita: ing.qtyBalita || 0,
                gramasi: ing.qtyBesar || 0,
                unit: finalUnit,
                currentStock: 0,
                isSecukupnya: Number(ing.qtyBesar) === 0,
                nutritionPer100g: ing.ingredient?.nutritionPer100g || {}
            };
        });
        setIngredientsOmpreng(recipeIngredients);

        const baseNutri = {
            energi: Number(recipe.calories) || 0,
            protein: Number(recipe.protein) || 0,
            lemak: Number(recipe.fat) || 0,
            karbo: Number(recipe.carbs) || 0,
        };

        const calcRatio = (ratio: number) => ({
            energi: ratio === 0.7 ? Math.min(400, baseNutri.energi * ratio).toFixed(2) : (baseNutri.energi * ratio).toFixed(2),
            protein: (baseNutri.protein * ratio).toFixed(2),
            lemak: (baseNutri.lemak * ratio).toFixed(2),
            karbo: (baseNutri.karbo * ratio).toFixed(2),
        });

        const nutriData = {
            besar: calcRatio(1),
            kecil: calcRatio(0.7),
            bumil: calcRatio(1),
            balita: calcRatio(0.7)
        };

        setOmprengNutritionData(nutriData);

        setIsRecipeOpen(false);
        toast.success(`Resep standar dimuat. Silakan sesuaikan jumlah porsi.`);
    };

    const handleSelectHistory = async (menu: any) => {
        if (menu.originalMenus && menu.originalMenus.length > 0) {
            if (historyFilterType === 'OMPRENG') {
                setIsOmprengEnabled(false);
            } else if (historyFilterType === 'KERING') {
                setIsKeringEnabled(false);
            } else {
                setIsOmprengEnabled(false);
                setIsKeringEnabled(false);
            }

            for (const m of menu.originalMenus) {
                const isKering = m.menuType === 'KERING';
                if (historyFilterType === 'OMPRENG' && isKering) continue;
                if (historyFilterType === 'KERING' && !isKering) continue;

                if (isKering) {
                    setIsKeringEnabled(true);
                    setKeringName(`${m.name} (Copy)`);
                    setCountKeringKecil(m.countKecil || 0);
                    setCountKeringBesar(m.countBesar || 0);
                    setCountKeringBumil(m.countBumil || 0);
                    setCountKeringBalita(m.countBalita || 0);

                    const activeKering: string[] = [];
                    if (m.countBesar > 0) activeKering.push('besar');
                    if (m.countKecil > 0) activeKering.push('kecil');
                    if (m.countBumil > 0) activeKering.push('bumil');
                    if (m.countBalita > 0) activeKering.push('balita');
                    setActiveKeringTargets(activeKering);

                    setIngredientsKering(m.ingredients.map((ing: any) => {
                        const qBesar = Number(((ing.qtyBesar !== undefined && ing.qtyBesar !== null && ing.qtyBesar !== 0) ? ing.qtyBesar : (ing.gramasi || 0)).toFixed(3));
                        const qKecil = Number(((ing.qtyKecil !== undefined && ing.qtyKecil !== null && ing.qtyKecil !== 0) ? ing.qtyKecil : qBesar).toFixed(3));

                        return {
                            tempId: Math.random(),
                            name: ing.name,
                            qty: Number((ing.qtyNeeded || ing.qty || 0).toFixed(3)),
                            gramasi: ing.gramasi,
                            qtyBesar: qBesar,
                            qtyKecil: qKecil,
                            qtyBumil: Number((ing.qtyBumil || qBesar).toFixed(3)),
                            qtyBalita: Number((ing.qtyBalita || qKecil).toFixed(3)),
                            unit: ing.unit,
                            nutritionPer100g: ing.nutritionPer100g || {}
                        };
                    }));

                    let mNutri = m.nutritionData || {};
                    const hasNutri = Object.values(mNutri).some((v: any) => v && (v.energi > 0 || v.protein > 0));
                    if (!hasNutri) {
                        const recipe = await getRecipeByName(m.name);
                        if (recipe) {
                            const base = { energi: recipe.calories || 0, protein: recipe.protein || 0, lemak: recipe.fat || 0, karbo: recipe.carbs || 0 };
                            mNutri = { besar: { ...base }, kecil: { ...base }, bumil: { ...base }, balita: { ...base } };
                        }
                    }

                    const hasKecilKering = mNutri.kecil && (mNutri.kecil.energi > 0 || mNutri.kecil.protein > 0);
                    const hasBalitaKering = mNutri.balita && (mNutri.balita.energi > 0 || mNutri.balita.protein > 0);
                    const besarK = mNutri.besar || { energi: 0, protein: 0, lemak: 0, karbo: 0 };
                    setKeringNutritionData({
                        besar: besarK,
                        kecil: hasKecilKering ? mNutri.kecil : { energi: Math.min(400, +(besarK.energi * 0.7).toFixed(2)), protein: +(besarK.protein * 0.7).toFixed(2), lemak: +(besarK.lemak * 0.7).toFixed(2), karbo: +(besarK.karbo * 0.7).toFixed(2) },
                        bumil: mNutri.bumil || { energi: 0, protein: 0, lemak: 0, karbo: 0 },
                        balita: hasBalitaKering ? mNutri.balita : { energi: Math.min(400, +(besarK.energi * 0.7).toFixed(2)), protein: +(besarK.protein * 0.7).toFixed(2), lemak: +(besarK.lemak * 0.7).toFixed(2), karbo: +(besarK.karbo * 0.7).toFixed(2) },
                    });
                } else {
                    setIsOmprengEnabled(true);
                    setOmprengName(`${m.name} (Copy)`);
                    setOmprengDescription(m.description || '');
                    setCountOmprengKecil(m.countKecil || 0);
                    setCountOmprengBesar(m.countBesar || 100);
                    setCountOmprengBumil(m.countBumil || 0);
                    setCountOmprengBalita(m.countBalita || 0);

                    const activeOmpreng: string[] = [];
                    if (m.countBesar > 0) activeOmpreng.push('besar');
                    if (m.countKecil > 0) activeOmpreng.push('kecil');
                    if (m.countBumil > 0) activeOmpreng.push('bumil');
                    if (m.countBalita > 0) activeOmpreng.push('balita');
                    setActiveOmprengTargets(activeOmpreng);

                    setIngredientsOmpreng(m.ingredients.map((ing: any) => {
                        const qBesar = Number(((ing.qtyBesar !== undefined && ing.qtyBesar !== null && ing.qtyBesar !== 0) ? ing.qtyBesar : (ing.gramasi || 0)).toFixed(3));
                        const qKecil = Number(((ing.qtyKecil !== undefined && ing.qtyKecil !== null && ing.qtyKecil !== 0) ? ing.qtyKecil : qBesar).toFixed(3));

                        return {
                            tempId: Math.random(),
                            name: ing.name,
                            qty: Number((ing.qtyNeeded || ing.qty || 0).toFixed(3)),
                            gramasi: ing.gramasi,
                            qtyBesar: qBesar,
                            qtyKecil: qKecil,
                            qtyBumil: Number((ing.qtyBumil || qBesar).toFixed(3)),
                            qtyBalita: Number((ing.qtyBalita || qKecil).toFixed(3)),
                            unit: ing.unit,
                            nutritionPer100g: ing.nutritionPer100g || {}
                        };
                    }));

                    let mNutri = m.nutritionData || {};
                    const hasNutri = Object.values(mNutri).some((v: any) => v && (v.energi > 0 || v.protein > 0));
                    if (!hasNutri) {
                        const recipe = await getRecipeByName(m.name);
                        if (recipe) {
                            const base = { energi: recipe.calories || 0, protein: recipe.protein || 0, lemak: recipe.fat || 0, karbo: recipe.carbs || 0 };
                            mNutri = { besar: { ...base }, kecil: { ...base }, bumil: { ...base }, balita: { ...base } };
                        }
                    }

                    const hasKecilO = mNutri.kecil && (mNutri.kecil.energi > 0 || mNutri.kecil.protein > 0);
                    const hasBalitaO = mNutri.balita && (mNutri.balita.energi > 0 || mNutri.balita.protein > 0);
                    const besarO = mNutri.besar || { energi: 0, protein: 0, lemak: 0, karbo: 0 };
                    setOmprengNutritionData({
                        besar: besarO,
                        kecil: hasKecilO ? mNutri.kecil : { energi: Math.min(400, +(besarO.energi * 0.7).toFixed(2)), protein: +(besarO.protein * 0.7).toFixed(2), lemak: +(besarO.lemak * 0.7).toFixed(2), karbo: +(besarO.karbo * 0.7).toFixed(2) },
                        bumil: mNutri.bumil || { energi: 0, protein: 0, lemak: 0, karbo: 0 },
                        balita: hasBalitaO ? mNutri.balita : { energi: Math.min(400, +(besarO.energi * 0.7).toFixed(2)), protein: +(besarO.protein * 0.7).toFixed(2), lemak: +(besarO.lemak * 0.7).toFixed(2), karbo: +(besarO.karbo * 0.7).toFixed(2) },
                    });
                }
            }

            setIsHistoryOpen(false);
            if (!initialData) {
                toast.success(`Satu hari jadwal menu berhasil disalin.`);
            }
            return;
        }

        const isKering = menu.menuType === 'KERING';
        if (isKering) {
            setIsKeringEnabled(true);
            setKeringName(`${menu.name} (Copy)`);
            setKeringDescription(menu.description || '');
            setCountKeringKecil(menu.countKecil || 0);
            setCountKeringBesar(menu.countBesar || 0);
            setCountKeringBumil(menu.countBumil || 0);
            setCountKeringBalita(menu.countBalita || 0);

            const activeKering: string[] = [];
            if (menu.countBesar > 0) activeKering.push('besar');
            if (menu.countKecil > 0) activeKering.push('kecil');
            if (menu.countBumil > 0) activeKering.push('bumil');
            if (menu.countBalita > 0) activeKering.push('balita');
            setActiveKeringTargets(activeKering);

            setIngredientsKering(menu.ingredients.map((ing: any) => {
                const qBesar = Number(((ing.qtyBesar !== undefined && ing.qtyBesar !== null && ing.qtyBesar !== 0) ? ing.qtyBesar : (ing.gramasi || 0)).toFixed(3));
                const qKecil = Number(((ing.qtyKecil !== undefined && ing.qtyKecil !== null && ing.qtyKecil !== 0) ? ing.qtyKecil : qBesar).toFixed(3));
                return {
                    tempId: Math.random(),
                    name: ing.name,
                    qty: Number((ing.qtyNeeded || ing.qty || 0).toFixed(3)),
                    gramasi: ing.gramasi,
                    qtyBesar: qBesar,
                    qtyKecil: qKecil,
                    qtyBumil: Number((ing.qtyBumil || qBesar).toFixed(3)),
                    qtyBalita: Number((ing.qtyBalita || qKecil).toFixed(3)),
                    unit: ing.unit,
                    nutritionPer100g: ing.nutritionPer100g || {}
                };
            }));

            let mNutri = menu.nutritionData || {};
            const hasNutri = Object.values(mNutri).some((v: any) => v && (v.energi > 0 || v.protein > 0));
            if (!hasNutri) {
                const recipe = await getRecipeByName(menu.name);
                if (recipe) {
                    const base = { energi: recipe.calories || 0, protein: recipe.protein || 0, lemak: recipe.fat || 0, karbo: recipe.carbs || 0 };
                    const base70 = { energi: Math.min(400, 400), protein: +(base.protein * 0.7).toFixed(2), lemak: +(base.lemak * 0.7).toFixed(2), karbo: +(base.karbo * 0.7).toFixed(2) };
                    mNutri = { besar: { ...base }, kecil: { ...base70 }, bumil: { ...base }, balita: { ...base70 } };
                }
            }

            const hasKecilKr = mNutri.kecil && (mNutri.kecil.energi > 0 || mNutri.kecil.protein > 0);
            const hasBalitaKr = mNutri.balita && (mNutri.balita.energi > 0 || mNutri.balita.protein > 0);
            const besarKr = mNutri.besar || { energi: 0, protein: 0, lemak: 0, karbo: 0 };
            setKeringNutritionData({
                besar: besarKr,
                kecil: hasKecilKr ? mNutri.kecil : { energi: Math.min(400, +(besarKr.energi * 0.7).toFixed(2)), protein: +(besarKr.protein * 0.7).toFixed(2), lemak: +(besarKr.lemak * 0.7).toFixed(2), karbo: +(besarKr.karbo * 0.7).toFixed(2) },
                bumil: mNutri.bumil || { energi: 0, protein: 0, lemak: 0, karbo: 0 },
                balita: hasBalitaKr ? mNutri.balita : { energi: Math.min(400, +(besarKr.energi * 0.7).toFixed(2)), protein: +(besarKr.protein * 0.7).toFixed(2), lemak: +(besarKr.lemak * 0.7).toFixed(2), karbo: +(besarKr.karbo * 0.7).toFixed(2) },
            });
        } else {
            setIsOmprengEnabled(true);
            setOmprengName(`${menu.name} (Copy)`);
            setOmprengDescription(menu.description || '');
            setCountOmprengKecil(menu.countKecil || 0);
            setCountOmprengBesar(menu.countBesar || 100);
            setCountOmprengBumil(menu.countBumil || 0);
            setCountOmprengBalita(menu.countBalita || 0);

            const activeOmpreng: string[] = [];
            if (menu.countBesar > 0) activeOmpreng.push('besar');
            if (menu.countKecil > 0) activeOmpreng.push('kecil');
            if (menu.countBumil > 0) activeOmpreng.push('bumil');
            if (menu.countBalita > 0) activeOmpreng.push('balita');
            setActiveOmprengTargets(activeOmpreng);

            setIngredientsOmpreng(menu.ingredients.map((ing: any) => {
                const qBesar = Number(((ing.qtyBesar !== undefined && ing.qtyBesar !== null && ing.qtyBesar !== 0) ? ing.qtyBesar : (ing.gramasi || 0)).toFixed(3));
                const qKecil = Number(((ing.qtyKecil !== undefined && ing.qtyKecil !== null && ing.qtyKecil !== 0) ? ing.qtyKecil : qBesar).toFixed(3));
                return {
                    tempId: Math.random(),
                    name: ing.name,
                    qty: Number((ing.qtyNeeded || ing.qty || 0).toFixed(3)),
                    gramasi: ing.gramasi,
                    qtyBesar: qBesar,
                    qtyKecil: qKecil,
                    qtyBumil: Number((ing.qtyBumil || qBesar).toFixed(3)),
                    qtyBalita: Number((ing.qtyBalita || qKecil).toFixed(3)),
                    unit: ing.unit,
                    nutritionPer100g: ing.nutritionPer100g || {}
                };
            }));

            let mNutri = menu.nutritionData || {};
            const hasNutri = Object.values(mNutri).some((v: any) => v && (v.energi > 0 || v.protein > 0));
            if (!hasNutri) {
                const recipe = await getRecipeByName(menu.name);
                if (recipe) {
                    const base = { energi: recipe.calories || 0, protein: recipe.protein || 0, lemak: recipe.fat || 0, karbo: recipe.carbs || 0 };
                    const base70 = { energi: Math.min(400, 400), protein: +(base.protein * 0.7).toFixed(2), lemak: +(base.lemak * 0.7).toFixed(2), karbo: +(base.karbo * 0.7).toFixed(2) };
                    mNutri = { besar: { ...base }, kecil: { ...base70 }, bumil: { ...base }, balita: { ...base70 } };
                }
            }

            const hasKecilOm = mNutri.kecil && (mNutri.kecil.energi > 0 || mNutri.kecil.protein > 0);
            const hasBalitaOm = mNutri.balita && (mNutri.balita.energi > 0 || mNutri.balita.protein > 0);
            const besarOm = mNutri.besar || { energi: 0, protein: 0, lemak: 0, karbo: 0 };
            setOmprengNutritionData({
                besar: besarOm,
                kecil: hasKecilOm ? mNutri.kecil : { energi: Math.min(400, +(besarOm.energi * 0.7).toFixed(2)), protein: +(besarOm.protein * 0.7).toFixed(2), lemak: +(besarOm.lemak * 0.7).toFixed(2), karbo: +(besarOm.karbo * 0.7).toFixed(2) },
                bumil: mNutri.bumil || { energi: 0, protein: 0, lemak: 0, karbo: 0 },
                balita: hasBalitaOm ? mNutri.balita : { energi: Math.min(400, +(besarOm.energi * 0.7).toFixed(2)), protein: +(besarOm.protein * 0.7).toFixed(2), lemak: +(besarOm.lemak * 0.7).toFixed(2), karbo: +(besarOm.karbo * 0.7).toFixed(2) },
            });
        }

        setIsHistoryOpen(false);
        if (!initialData) {
            toast.success(`Menu "${menu.name}" berhasil disalin.`);
        }
    };

    const parsePortion = (val: any) => {
        if (val === '' || val === null || val === undefined) return 0;
        const parsed = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(parsed) ? 0 : parsed;
    };

    const calculateTotal = (ing: any, counts: any, targets: string[]) => {
        const { cBesar, cKecil, cBumil, cBalita } = counts;
        const rawBesar = (typeof ing.qtyBesar === 'number' || (typeof ing.qtyBesar === 'string' && ing.qtyBesar !== '')) ? parseFloat(ing.qtyBesar as any) : null;
        const rawKecil = (typeof ing.qtyKecil === 'number' || (typeof ing.qtyKecil === 'string' && ing.qtyKecil !== '')) ? parseFloat(ing.qtyKecil as any) : null;

        // Fallback: Jika satu diisi dan lainnya kosong, pakai nilai yang ada untuk keduanya
        const qBesar = rawBesar !== null && !isNaN(rawBesar) ? rawBesar : (rawKecil !== null && !isNaN(rawKecil) ? rawKecil : 0);
        const qKecil = rawKecil !== null && !isNaN(rawKecil) ? rawKecil : (rawBesar !== null && !isNaN(rawBesar) ? rawBesar : 0);

        // Jangan bergantung pada targets.includes() karena user bisa langsung ketik angka tanpa klik badge
        const total = (cBesar * qBesar) + (cBumil * qBesar) + (cKecil * qKecil) + (cBalita * qKecil);

        return isNaN(total) ? 0 : parseFloat(total.toFixed(3));
    };

    useEffect(() => {
        const countsOmpreng = {
            cBesar: parsePortion(countOmprengBesar),
            cKecil: parsePortion(countOmprengKecil),
            cBumil: parsePortion(countOmprengBumil),
            cBalita: parsePortion(countOmprengBalita)
        };

        setIngredientsOmpreng(prev => prev.map(ing => ({
            ...ing,
            qty: calculateTotal(ing, countsOmpreng, activeOmprengTargets)
        })));

        const countsKering = {
            cBesar: parsePortion(countKeringBesar),
            cKecil: parsePortion(countKeringKecil),
            cBumil: parsePortion(countKeringBumil),
            cBalita: parsePortion(countKeringBalita)
        };

        setIngredientsKering(prev => prev.map(ing => ({
            ...ing,
            qty: calculateTotal(ing, countsKering, activeKeringTargets)
        })));
    }, [
        countOmprengBesar, countOmprengKecil, countOmprengBumil, countOmprengBalita, activeOmprengTargets,
        countKeringBesar, countKeringKecil, countKeringBumil, countKeringBalita, activeKeringTargets
    ]);

    useEffect(() => {
        if (open) {
            if (menuToEdit) {
                const originalMenus = menuToEdit.originalMenus || (menuToEdit.id ? [menuToEdit] : []);
                setOmprengId(null);
                setKeringId(null);
                setIsOmprengEnabled(false);
                setIsKeringEnabled(false);

                originalMenus.forEach((m: any) => {
                    const isKering = m.menuType === 'KERING';
                    if (isKering) {
                        setKeringId(m.id);
                        setIsKeringEnabled(true);
                        setKeringName(m.name);
                        setKeringDescription(m.description || '');
                        setCountKeringBesar(m.countBesar || 0);
                        setCountKeringKecil(m.countKecil || 0);
                        setCountKeringBumil(m.countBumil || 0);
                        setCountKeringBalita(m.countBalita || 0);
                        const activeKering: string[] = [];
                        if (m.countBesar > 0) activeKering.push('besar');
                        if (m.countKecil > 0) activeKering.push('kecil');
                        if (m.countBumil > 0) activeKering.push('bumil');
                        if (m.countBalita > 0) activeKering.push('balita');
                        setActiveKeringTargets(activeKering);
                        setIngredientsKering(m.ingredients.map((ing: any) => {
                            const qBesar = (ing.qtyBesar !== undefined && ing.qtyBesar !== null && ing.qtyBesar !== 0) ? ing.qtyBesar : (ing.gramasi || 0);
                            const qKecil = (ing.qtyKecil !== undefined && ing.qtyKecil !== null && ing.qtyKecil !== 0) ? ing.qtyKecil : qBesar;

                            return {
                                tempId: Math.random(),
                                name: ing.name,
                                qty: ing.qtyNeeded,
                                gramasi: ing.gramasi,
                                qtyBesar: qBesar,
                                qtyKecil: qKecil,
                                qtyBumil: ing.qtyBumil || qBesar,
                                qtyBalita: ing.qtyBalita || qKecil,
                                unit: ing.unit,
                                currentStock: ing.currentStock || 0
                            };
                        }));
                        setKeringNutritionData({
                            besar: m.nutritionData?.besar || { energi: 0, protein: 0, lemak: 0, karbo: 0 },
                            kecil: m.nutritionData?.kecil || { energi: 0, protein: 0, lemak: 0, karbo: 0 },
                            bumil: m.nutritionData?.bumil || { energi: 0, protein: 0, lemak: 0, karbo: 0 },
                            balita: m.nutritionData?.balita || { energi: 0, protein: 0, lemak: 0, karbo: 0 }
                        });
                    } else {
                        setOmprengId(m.id);
                        setIsOmprengEnabled(true);
                        setOmprengName(m.name);
                        setOmprengDescription(m.description || '');
                        setCountOmprengBesar(m.countBesar || 0);
                        setCountOmprengKecil(m.countKecil || 0);
                        setCountOmprengBumil(m.countBumil || 0);
                        setCountOmprengBalita(m.countBalita || 0);
                        const activeOmpreng: string[] = [];
                        if (m.countBesar > 0) activeOmpreng.push('besar');
                        if (m.countKecil > 0) activeOmpreng.push('kecil');
                        if (m.countBumil > 0) activeOmpreng.push('bumil');
                        if (m.countBalita > 0) activeOmpreng.push('balita');
                        setActiveOmprengTargets(activeOmpreng);
                        setIngredientsOmpreng(m.ingredients.map((ing: any) => {
                            const qBesar = Number(((ing.qtyBesar !== undefined && ing.qtyBesar !== null && ing.qtyBesar !== 0) ? ing.qtyBesar : (ing.gramasi || 0)).toFixed(3));
                            const qKecil = Number(((ing.qtyKecil !== undefined && ing.qtyKecil !== null && ing.qtyKecil !== 0) ? ing.qtyKecil : qBesar).toFixed(3));

                            return {
                                tempId: Math.random(),
                                name: ing.name,
                                qty: Number((ing.qtyNeeded || ing.qty || 0).toFixed(3)),
                                gramasi: ing.gramasi,
                                qtyBesar: qBesar,
                                qtyKecil: qKecil,
                                qtyBumil: Number((ing.qtyBumil || qBesar).toFixed(3)),
                                qtyBalita: Number((ing.qtyBalita || qKecil).toFixed(3)),
                                unit: ing.unit,
                                currentStock: ing.currentStock || 0
                            };
                        }));
                        setOmprengNutritionData({
                            besar: m.nutritionData?.besar || { energi: 0, protein: 0, lemak: 0, karbo: 0 },
                            kecil: m.nutritionData?.kecil || { energi: 0, protein: 0, lemak: 0, karbo: 0 },
                            bumil: m.nutritionData?.bumil || { energi: 0, protein: 0, lemak: 0, karbo: 0 },
                            balita: m.nutritionData?.balita || { energi: 0, protein: 0, lemak: 0, karbo: 0 }
                        });
                    }
                });
            } else if (!initialData) {
                setOmprengId(null);
                setKeringId(null);
                setIsOmprengEnabled(true);
                setIsKeringEnabled(false);
                setOmprengName('');
                setOmprengDescription('');
                setKeringName('');
                setKeringDescription('');
                setCountOmprengKecil(0);
                setCountOmprengBesar(100);
                setCountOmprengBumil(0);
                setCountOmprengBalita(0);
                setCountKeringKecil(0);
                setCountKeringBesar(0);
                setCountKeringBumil(0);
                setCountKeringBalita(0);
                setActiveOmprengTargets(['besar']);
                setActiveKeringTargets([]);
                setIngredientsOmpreng([]);
                setIngredientsKering([]);
                setKeringNutritionData({});
                setOmprengNutritionData({});
            }
        }
    }, [open, menuToEdit, initialData]);

    const addEmptyRowOmpreng = () => {
        setIngredientsOmpreng([...ingredientsOmpreng, { tempId: Date.now(), name: '', qty: 0, gramasi: 0, qtyBesar: 0, qtyKecil: 0, qtyBumil: 0, qtyBalita: 0, unit: 'kg', isSecukupnya: false, currentStock: 0 }]);
    };

    const addEmptyRowKering = () => {
        setIngredientsKering([...ingredientsKering, { tempId: Date.now(), name: '', qty: 0, gramasi: 0, qtyBesar: 0, qtyKecil: 0, qtyBumil: 0, qtyBalita: 0, unit: 'kg', isSecukupnya: false, currentStock: 0 }]);
    };

    const updateIngredientOmprengMultiple = (tempId: number, updates: Partial<typeof ingredientsOmpreng[0]>) => {
        setIngredientsOmpreng(prev => prev.map(i => {
            if (i.tempId !== tempId) return i;
            let updated = { ...i, ...updates };
            if (updates.gramasi !== undefined) updated.qtyBesar = typeof updates.gramasi === 'string' ? parseFloat(updates.gramasi) : (updates.gramasi || 0);
            return updated;
        }));
    };

    const updateIngredientKeringMultiple = (tempId: number, updates: Partial<typeof ingredientsKering[0]>) => {
        setIngredientsKering(prev => prev.map(i => {
            if (i.tempId !== tempId) return i;
            let updated = { ...i, ...updates };
            if (updates.gramasi !== undefined) updated.qtyBesar = typeof updates.gramasi === 'string' ? parseFloat(updates.gramasi) : (updates.gramasi || 0);
            return updated;
        }));
    };

    const updateIngredientOmpreng = (tempId: number, field: keyof typeof ingredientsOmpreng[0], value: any) => {
        setIngredientsOmpreng(prev => prev.map(i => {
            if (i.tempId !== tempId) return i;
            let updated = { ...i, [field]: value };
            if (field === 'gramasi') updated.qtyBesar = typeof value === 'string' ? parseFloat(value) : (value || 0);

            if (field === 'qtyBesar' || field === 'qtyKecil' || field === 'gramasi') {
                const countsOmpreng = {
                    cBesar: parsePortion(countOmprengBesar),
                    cKecil: parsePortion(countOmprengKecil),
                    cBumil: parsePortion(countOmprengBumil),
                    cBalita: parsePortion(countOmprengBalita)
                };
                updated.qty = calculateTotal(updated, countsOmpreng, activeOmprengTargets);
            }
            return updated;
        }));
    };

    const removeIngredientOmpreng = (tempId: number) => {
        setIngredientsOmpreng(ingredientsOmpreng.filter(i => i.tempId !== tempId));
    };

    const updateIngredientKering = (tempId: number, field: keyof typeof ingredientsKering[0], value: any) => {
        setIngredientsKering(prev => prev.map(i => {
            if (i.tempId !== tempId) return i;
            let updated = { ...i, [field]: value };
            if (field === 'gramasi') updated.qtyBesar = typeof value === 'string' ? parseFloat(value) : (value || 0);

            if (field === 'qtyBesar' || field === 'qtyKecil' || field === 'gramasi') {
                const countsKering = {
                    cBesar: parsePortion(countKeringBesar),
                    cKecil: parsePortion(countKeringKecil),
                    cBumil: parsePortion(countKeringBumil),
                    cBalita: parsePortion(countKeringBalita)
                };
                updated.qty = calculateTotal(updated, countsKering, activeKeringTargets);
            }
            return updated;
        }));
    };

    const removeIngredientKering = (tempId: number) => {
        setIngredientsKering(ingredientsKering.filter(i => i.tempId !== tempId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (ingredientsOmpreng.length === 0 && ingredientsKering.length === 0) {
            toast.error('Silahkan tambahkan minimal satu bahan/snack');
            return;
        }

        const allIngredients = [...ingredientsOmpreng, ...ingredientsKering];
        if (allIngredients.length > 0 && allIngredients.some(i => !i.name.trim())) {
            toast.error('Nama bahan tidak boleh kosong');
            return;
        }

        setLoading(true);

        const formatIngredients = (ings: any[]) => {
            return ings.map(i => {
                const q = typeof i.qty === 'string' ? parseFloat(i.qty) : i.qty;
                const bs = typeof i.qtyBesar === 'string' ? parseFloat(i.qtyBesar) : (i.qtyBesar ?? (typeof i.gramasi === 'string' ? parseFloat(i.gramasi) : i.gramasi));
                const kc = typeof i.qtyKecil === 'string' ? parseFloat(i.qtyKecil) : i.qtyKecil;
                const bm = typeof i.qtyBumil === 'string' ? parseFloat(i.qtyBumil) : i.qtyBumil;
                const bl = typeof i.qtyBalita === 'string' ? parseFloat(i.qtyBalita) : i.qtyBalita;

                return {
                    name: i.name.trim(),
                    qty: isNaN(q) ? 0 : q,
                    gramasi: bs === undefined || isNaN(bs) ? undefined : bs,
                    qtyBesar: bs === undefined || isNaN(bs) ? undefined : bs,
                    qtyKecil: kc === undefined || isNaN(kc) ? undefined : kc,
                    qtyBumil: bm === undefined || isNaN(bm) ? undefined : bm,
                    qtyBalita: bl === undefined || isNaN(bl) ? undefined : bl,
                    unit: i.unit.trim(),
                    isSecukupnya: i.isSecukupnya || false
                };
            })
        };

        const parseNumber = (val: any) => {
            const parsed = typeof val === 'string' ? parseFloat(val) : val;
            return isNaN(parsed) ? 0 : parsed;
        };

        if (!isOmprengEnabled && !isKeringEnabled) {
            toast.error('Gagal: Minimal satu Menu (Masak atau Kering) harus diaktifkan.');
            setLoading(false);
            return;
        }

        let hasError = false;

        const processUpdateCreateDispose = async (isEnabled: boolean, existId: string | null, payload: any) => {
            if (isEnabled) {
                if (existId) {
                    const res = await updateMenu(existId, payload);
                    if (!res.success) {
                        toast.error(res.error || `Gagal memperbarui menu ${payload.menuType}`);
                        hasError = true;
                    }
                } else {
                    const res = await createMenu(payload);
                    if (!res.success) {
                        toast.error(res.error || `Gagal membuat menu ${payload.menuType}`);
                        hasError = true;
                    }
                }
            } else if (existId) {
                const res = await deleteMenu(existId);
                if (!res.success) {
                    toast.error(res.error || `Gagal menghapus menu ${payload.menuType}`);
                    hasError = true;
                }
            }
        };

        const menuDate = menuToEdit ? new Date(menuToEdit.menuDate) : date;

        const finalOmprengNutritionData = { ...omprengNutritionData };
        if (!omprengBumilOverride && finalOmprengNutritionData.besar) {
            finalOmprengNutritionData.bumil = { ...finalOmprengNutritionData.besar };
        }
        if (!omprengBalitaOverride && finalOmprengNutritionData.kecil) {
            finalOmprengNutritionData.balita = { ...finalOmprengNutritionData.kecil };
        }

        const finalKeringNutritionData = { ...(keringNutritionData as any) };
        if (!keringBumilOverride && finalKeringNutritionData.besar) {
            finalKeringNutritionData.bumil = { ...finalKeringNutritionData.besar };
        }
        if (!keringBalitaOverride && finalKeringNutritionData.kecil) {
            finalKeringNutritionData.balita = { ...finalKeringNutritionData.kecil };
        }

        if (menuToEdit) {
            const payloadOmpreng = {
                name: omprengName,
                description: omprengDescription,
                menuDate,
                countBesar: parseNumber(countOmprengBesar),
                countKecil: parseNumber(countOmprengKecil),
                countBumil: parseNumber(countOmprengBumil),
                countBalita: parseNumber(countOmprengBalita),
                ingredients: formatIngredients(ingredientsOmpreng),
                menuType: 'OMPRENG' as const,
                nutritionData: Object.keys(finalOmprengNutritionData).length > 0 ? finalOmprengNutritionData : undefined
            };

            const payloadKering = {
                name: keringName,
                description: keringDescription,
                menuDate,
                countBesar: parseNumber(countKeringBesar),
                countKecil: parseNumber(countKeringKecil),
                countBumil: parseNumber(countKeringBumil),
                countBalita: parseNumber(countKeringBalita),
                ingredients: formatIngredients(ingredientsKering),
                menuType: 'KERING' as const,
                nutritionData: Object.keys(finalKeringNutritionData).length > 0 ? finalKeringNutritionData : undefined
            };

            await processUpdateCreateDispose(isOmprengEnabled, omprengId, payloadOmpreng);
            await processUpdateCreateDispose(isKeringEnabled, keringId, payloadKering);
        } else {
            if (isOmprengEnabled && ingredientsOmpreng.length > 0) {
                const res = await createMenu({
                    name: omprengName,
                    description: omprengDescription,
                    menuDate,
                    countBesar: parseNumber(countOmprengBesar),
                    countKecil: parseNumber(countOmprengKecil),
                    countBumil: parseNumber(countOmprengBumil),
                    countBalita: parseNumber(countOmprengBalita),
                    ingredients: formatIngredients(ingredientsOmpreng),
                    menuType: 'OMPRENG',
                    nutritionData: Object.keys(finalOmprengNutritionData).length > 0 ? finalOmprengNutritionData : undefined
                });
                if (!res.success) {
                    toast.error(res.error || 'Gagal menyimpan Menu Masak');
                    hasError = true;
                }
            }
            if (isKeringEnabled && ingredientsKering.length > 0) {
                const res = await createMenu({
                    name: keringName,
                    description: keringDescription,
                    menuDate,
                    countBesar: parseNumber(countKeringBesar),
                    countKecil: parseNumber(countKeringKecil),
                    countBumil: parseNumber(countKeringBumil),
                    countBalita: parseNumber(countKeringBalita),
                    ingredients: formatIngredients(ingredientsKering),
                    menuType: 'KERING',
                    nutritionData: Object.keys(finalKeringNutritionData).length > 0 ? finalKeringNutritionData : undefined
                });
                if (!res.success) {
                    toast.error(res.error || 'Gagal menyimpan Paket Kering');
                    hasError = true;
                }
            }
        }

        setLoading(false);
        if (!hasError) {
            toast.success(menuToEdit ? 'Jadwal berhasil diperbarui' : 'Jadwal berhasil dibuat');
            onOpenChange(false);
            onSuccess();
        }
    };

    const isOmprengBesarActive = activeOmprengTargets.includes('besar') || Number(countOmprengBesar) > 0 || activeOmprengTargets.includes('bumil') || Number(countOmprengBumil) > 0;
    const isOmprengKecilActive = activeOmprengTargets.includes('kecil') || Number(countOmprengKecil) > 0 || activeOmprengTargets.includes('balita') || Number(countOmprengBalita) > 0;

    const isKeringBesarActive = activeKeringTargets.includes('besar') || Number(countKeringBesar) > 0 || activeKeringTargets.includes('bumil') || Number(countKeringBumil) > 0;
    const isKeringKecilActive = activeKeringTargets.includes('kecil') || Number(countKeringKecil) > 0 || activeKeringTargets.includes('balita') || Number(countKeringBalita) > 0;

    const copyBesarToKecilOmpreng = (ratio = 0.7) => {
        const b = omprengNutritionData?.besar || {};
        const bm = omprengNutritionData?.bumil || {};
        setOmprengNutritionData((prev: any) => ({
            ...prev,
            kecil: { energi: Math.min(400, +((b.energi || 0) * ratio).toFixed(2)), protein: +((b.protein || 0) * ratio).toFixed(2), lemak: +((b.lemak || 0) * ratio).toFixed(2), karbo: +((b.karbo || 0) * ratio).toFixed(2) },
            balita: { energi: Math.min(400, +((bm.energi || b.energi || 0) * ratio).toFixed(2)), protein: +((bm.protein || b.protein || 0) * ratio).toFixed(2), lemak: +((bm.lemak || b.lemak || 0) * ratio).toFixed(2), karbo: +((bm.karbo || b.karbo || 0) * ratio).toFixed(2) },
        }));
        toast.success(`Porsi kecil & balita diisi ${Math.round(ratio * 100)}% dari porsi besar (Maks 400 Kalori)`);
    };

    const copyBesarToKecilKering = (ratio = 0.7) => {
        const b = (keringNutritionData as any)?.besar || {};
        const bm = (keringNutritionData as any)?.bumil || {};
        setKeringNutritionData((prev: any) => ({
            ...prev,
            kecil: { energi: Math.min(400, +((b.energi || 0) * ratio).toFixed(2)), protein: +((b.protein || 0) * ratio).toFixed(2), lemak: +((b.lemak || 0) * ratio).toFixed(2), karbo: +((b.karbo || 0) * ratio).toFixed(2) },
            balita: { energi: Math.min(400, +((bm.energi || b.energi || 0) * ratio).toFixed(2)), protein: +((bm.protein || b.protein || 0) * ratio).toFixed(2), lemak: +((bm.lemak || b.lemak || 0) * ratio).toFixed(2), karbo: +((bm.karbo || b.karbo || 0) * ratio).toFixed(2) },
        }));
        toast.success(`Porsi kecil & balita diisi ${Math.round(ratio * 100)}% dari porsi besar (Maks 400 Kalori)`);
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1100px] max-h-[95vh] overflow-y-auto p-5">
                <style>{`
                    input[type="number"]::-webkit-inner-spin-button,
                    input[type="number"]::-webkit-outer-spin-button {
                        -webkit-appearance: none !important;
                        margin: 0 !important;
                    }
                    input[type="number"] {
                        -moz-appearance: textfield !important;
                        appearance: textfield !important;
                    }
                `}</style>
                <DialogHeader>
                    <DialogTitle>{menuToEdit ? 'Edit Jadwal Masak' : 'Buat Jadwal Baru'}</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="form" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-2">
                        <TabsTrigger value="form" className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Atur Jadwal
                        </TabsTrigger>
                        <TabsTrigger value="stock" className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4" />
                            Stok Real Gudang
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="form">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-4 pt-2">
                                <div className="bg-muted/30 p-2 rounded-xl border border-dashed border-muted-foreground/30">
                                    <div className="space-y-2 max-w-sm">
                                        <Label className="font-semibold text-muted-foreground text-xs uppercase flex items-center gap-2">
                                            Tanggal Pengerjaan Jadwal
                                        </Label>
                                        <Input
                                            value={(menuToEdit ? new Date(menuToEdit.menuDate) : date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                                            disabled
                                            className="bg-background/80 text-foreground font-semibold h-10 shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className={`space-y-4 border rounded-xl p-4 transition-colors ${isOmprengEnabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/10 border-dashed opacity-70'}`}>
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-3 border-b border-primary/10">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="toggle-ompreng"
                                                checked={isOmprengEnabled}
                                                onChange={(e) => setIsOmprengEnabled(e.target.checked)}
                                                className="w-5 h-5 accent-primary cursor-pointer"
                                            />
                                            <Label htmlFor="toggle-ompreng" className="font-bold text-base flex items-center gap-2 cursor-pointer text-primary">
                                                <BookOpen className="w-5 h-5" /> MENU MASAK (OMPRENG)
                                            </Label>
                                        </div>
                                        {isOmprengEnabled && (
                                            <Button type="button" variant="outline" size="sm" onClick={() => { setHistoryFilterType('OMPRENG'); setIsHistoryOpen(true); }} className="h-8 bg-background">
                                                <History className="w-3.5 h-3.5 mr-2" /> Riwayat
                                            </Button>
                                        )}
                                    </div>

                                    {isOmprengEnabled && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-2">
                                                <Label className="font-semibold text-primary text-xs uppercase">Nama Menu Masak <span className="text-red-500">*</span></Label>
                                                <Input
                                                    value={omprengName}
                                                    onChange={(e) => setOmprengName(e.target.value)}
                                                    placeholder="Contoh: Nasi, Ayam Goreng, Sayur Sop"
                                                    required={isOmprengEnabled}
                                                    className="bg-background font-bold text-base h-10 border-primary/30 focus-visible:ring-primary/50"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="font-semibold text-primary text-xs uppercase">Catatan Tambahan Menu Masak</Label>
                                                <Textarea
                                                    value={omprengDescription}
                                                    onChange={(e) => setOmprengDescription(e.target.value)}
                                                    placeholder="Contoh: Ayam dipotong dadu kecil untuk PAUD, kurangi asin"
                                                    className="bg-background text-sm min-h-[60px] border-primary/30 focus-visible:ring-primary/50"
                                                />
                                            </div>
                                            <div className="space-y-4 bg-muted/20 p-4 rounded-lg border border-primary/10">
                                                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                                                    <Label className="font-semibold text-sm flex items-center gap-2 text-primary">
                                                        <Calculator className="h-4 w-4" /> Target Pemilih Menu Masak
                                                    </Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {/* CHIP: Besar */}
                                                        {(() => {
                                                            const isOn = activeOmprengTargets.includes('besar') || Number(countOmprengBesar) > 0;
                                                            return (
                                                                <button type="button"
                                                                    onClick={() => {
                                                                        if (isOn) { setActiveOmprengTargets(p => p.filter(c => c !== 'besar')); setCountOmprengBesar(0); }
                                                                        else { setActiveOmprengTargets(p => [...p, 'besar']); setCountOmprengBesar(100); }
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all select-none ${isOn ? 'bg-primary text-white border-primary shadow' : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary'}`}>
                                                                    {isOn ? '✓' : '+'} Porsi Besar <span className="text-[10px] opacity-60 ml-0.5 font-medium">(SD/SMP/SMA)</span>
                                                                </button>
                                                            );
                                                        })()}
                                                        {/* CHIP: Bumil */}
                                                        {(() => {
                                                            const isOn = activeOmprengTargets.includes('bumil') || Number(countOmprengBumil) > 0;
                                                            return (
                                                                <button type="button"
                                                                    onClick={() => {
                                                                        if (isOn) { setActiveOmprengTargets(p => p.filter(c => c !== 'bumil')); setCountOmprengBumil(0); }
                                                                        else { setActiveOmprengTargets(p => [...p, 'bumil']); }
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all select-none ${isOn ? 'bg-pink-500 text-white border-pink-500 shadow' : 'bg-background text-muted-foreground border-border hover:border-pink-300 hover:text-pink-600'}`}>
                                                                    {isOn ? '✓' : '+'} Bumil / Busui
                                                                </button>
                                                            );
                                                        })()}
                                                        {/* CHIP: Kecil */}
                                                        {(() => {
                                                            const isOn = activeOmprengTargets.includes('kecil') || Number(countOmprengKecil) > 0;
                                                            return (
                                                                <button type="button"
                                                                    onClick={() => {
                                                                        if (isOn) { setActiveOmprengTargets(p => p.filter(c => c !== 'kecil')); setCountOmprengKecil(0); }
                                                                        else { setActiveOmprengTargets(p => [...p, 'kecil']); }
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all select-none ${isOn ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-background text-muted-foreground border-border hover:border-blue-300 hover:text-blue-600'}`}>
                                                                    {isOn ? '✓' : '+'} Porsi Kecil <span className="text-[10px] opacity-60 ml-0.5 font-medium">(PAUD/TK/SD 1-3)</span>
                                                                </button>
                                                            );
                                                        })()}
                                                        {/* CHIP: Balita */}
                                                        {(() => {
                                                            const isOn = activeOmprengTargets.includes('balita') || Number(countOmprengBalita) > 0;
                                                            return (
                                                                <button type="button"
                                                                    onClick={() => {
                                                                        if (isOn) { setActiveOmprengTargets(p => p.filter(c => c !== 'balita')); setCountOmprengBalita(0); }
                                                                        else { setActiveOmprengTargets(p => [...p, 'balita']); }
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all select-none ${isOn ? 'bg-orange-500 text-white border-orange-500 shadow' : 'bg-background text-muted-foreground border-border hover:border-orange-300 hover:text-orange-600'}`}>
                                                                    {isOn ? '✓' : '+'} Balita
                                                                </button>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-2 px-4 bg-primary/5 rounded-xl border border-primary/10 text-xs mb-2 shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-muted-foreground mr-1">Ringkasan Porsi:</span>
                                                        <div className="flex items-center gap-1.5 bg-background px-2 py-1 rounded border border-primary/20 shadow-sm">
                                                            <span className="text-muted-foreground">Besar:</span>
                                                            <span className="font-bold text-primary">{(Number(countOmprengBesar) || 0) + (Number(countOmprengBumil) || 0)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 bg-background px-2 py-1 rounded border border-blue-200 shadow-sm">
                                                            <span className="text-muted-foreground">Kecil:</span>
                                                            <span className="font-bold text-blue-700">{(Number(countOmprengKecil) || 0) + (Number(countOmprengBalita) || 0)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-auto">
                                                        <span className="font-bold text-primary/70 uppercase text-[10px] tracking-wider">TOTAL PAX:</span>
                                                        <Badge variant="default" className="font-extrabold text-sm px-3 bg-primary">
                                                            {(Number(countOmprengBesar) || 0) + (Number(countOmprengBumil) || 0) + (Number(countOmprengKecil) || 0) + (Number(countOmprengBalita) || 0)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="rounded-md border bg-card overflow-hidden">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-muted/80 text-muted-foreground border-b text-xs uppercase tracking-wider">
                                                            <tr>
                                                                <th className="px-4 py-2.5 text-left font-bold">Porsi</th>
                                                                <th className="px-4 py-2.5 text-center font-bold w-24 text-foreground whitespace-nowrap">Total Pax</th>
                                                                <th className="px-3 py-2.5 text-center font-medium w-28 whitespace-nowrap">Energi (kcal)<br /><span className="text-[9px] text-muted-foreground font-normal normal-case">per porsi</span></th>
                                                                <th className="px-3 py-2.5 text-center font-medium w-24 whitespace-nowrap">Protein (g)<br /><span className="text-[9px] text-muted-foreground font-normal normal-case">per porsi</span></th>
                                                                <th className="px-3 py-2.5 text-center font-medium w-24 whitespace-nowrap">Lemak (g)<br /><span className="text-[9px] text-muted-foreground font-normal normal-case">per porsi</span></th>
                                                                <th className="px-3 py-2.5 text-center font-medium w-24 whitespace-nowrap">Karbo (g)<br /><span className="text-[9px] text-muted-foreground font-normal normal-case">per porsi</span></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            {/* ROW PORSI BESAR / BUMIL */}
                                                            {isOmprengBesarActive && (
                                                                <>
                                                                    {/* Case: Only Bumil (no SD/SMP/SMA) - show Bumil standalone */}
                                                                    {!activeOmprengTargets.includes('besar') && activeOmprengTargets.includes('bumil') && (
                                                                        <tr className="hover:bg-pink-50/50 transition-colors bg-pink-50/10">
                                                                            <td className="px-4 py-3">
                                                                                <p className="font-bold text-pink-700 text-sm">Bumil / Busui</p>
                                                                                <p className="text-[10px] text-muted-foreground mt-0.5">Nilai gizi mengikuti Porsi Besar</p>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                <Input type="number" min="0"
                                                                                    className="h-10 w-20 text-center text-sm font-extrabold border-pink-300 bg-pink-100 text-pink-700 focus-visible:ring-pink-300 no-spinner mx-auto"
                                                                                    value={countOmprengBumil}
                                                                                    onChange={(e) => setCountOmprengBumil(e.target.value === '' ? '' : Number(e.target.value))}
                                                                                />
                                                                            </td>
                                                                            {['energi', 'protein', 'lemak', 'karbo'].map(nutri => (
                                                                                <td key={`ompreng-bumil-sa-${nutri}`} className="px-2 py-3">
                                                                                    <Input type="number" step="0.01"
                                                                                        className="h-10 text-center text-sm font-bold border-pink-200 bg-pink-50 focus-visible:ring-pink-300 no-spinner"
                                                                                        placeholder="0"
                                                                                        value={omprengNutritionData['bumil']?.[nutri] || ''}
                                                                                        onChange={(e) => {
                                                                                            const val = parseFloat(e.target.value) || 0;
                                                                                            setOmprengNutritionData((prev: any) => ({ ...prev, bumil: { ...prev?.bumil, [nutri]: val } }));
                                                                                        }}
                                                                                    />
                                                                                </td>
                                                                            ))}
                                                                            <td className="px-2 py-3"></td>
                                                                        </tr>
                                                                    )}
                                                                    {/* Case: Besar active (SD/SMP/SMA) - show with optional Bumil sub-row */}
                                                                    {activeOmprengTargets.includes('besar') && (
                                                                        <>
                                                                            <tr className="hover:bg-primary/5 transition-colors">
                                                                                <td className="px-4 py-3">
                                                                                    <p className="font-bold text-primary text-sm">Porsi Besar</p>
                                                                                    <p className="text-[10px] text-muted-foreground mt-0.5">SD 4-6 / SMP / SMA</p>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    <Input type="number" min="0"
                                                                                        className="h-10 w-20 text-center text-sm font-extrabold border-primary/30 bg-primary/10 text-primary focus-visible:ring-primary/30 no-spinner mx-auto"
                                                                                        value={countOmprengBesar}
                                                                                        onChange={(e) => setCountOmprengBesar(e.target.value === '' ? '' : Number(e.target.value))}
                                                                                    />
                                                                                </td>
                                                                                {['energi', 'protein', 'lemak', 'karbo'].map(nutri => (
                                                                                    <td key={`ompreng-besar-${nutri}`} className="px-2 py-3">
                                                                                        <Input type="number" step="0.01"
                                                                                            className="h-10 text-center text-sm font-bold border-primary/20 bg-primary/5 focus-visible:ring-primary/30 no-spinner"
                                                                                            placeholder="0"
                                                                                            value={omprengNutritionData['besar']?.[nutri] || ''}
                                                                                            onChange={(e) => {
                                                                                                const val = parseFloat(e.target.value) || 0;
                                                                                                setOmprengNutritionData((prev: any) => ({ ...prev, besar: { ...prev?.besar, [nutri]: val } }));
                                                                                            }}
                                                                                        />
                                                                                    </td>
                                                                                ))}
                                                                                <td className="px-2 py-3 text-center">
                                                                                    {activeOmprengTargets.includes('bumil') && (
                                                                                        <button type="button" onClick={() => setOmprengBumilOverride(!omprengBumilOverride)} className={`text-[10px] font-bold px-2 py-1 rounded w-full border transition-all ${omprengBumilOverride ? 'bg-pink-100 text-pink-700 border-pink-300' : 'bg-muted text-muted-foreground border-border hover:border-pink-300 hover:text-pink-600'}`}>
                                                                                            {omprengBumilOverride ? '✕ Samakan Gizi' : '+ Atur Gizi Bumil'}
                                                                                        </button>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                            {activeOmprengTargets.includes('bumil') && !omprengBumilOverride && (
                                                                                <tr className="bg-pink-50/10 border-b">
                                                                                    <td className="px-4 py-3 pl-8">
                                                                                        <p className="font-medium text-pink-700 text-sm">↳ Bumil / Busui</p>
                                                                                        <p className="text-[10px] text-muted-foreground mt-0.5">Nilai gizi mengikuti Porsi Besar</p>
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-center">
                                                                                        <Input type="number" min="0"
                                                                                            className="h-9 w-16 text-center text-xs font-bold border-pink-200 bg-pink-50 text-pink-700 focus-visible:ring-pink-300 no-spinner mx-auto"
                                                                                            value={countOmprengBumil}
                                                                                            onChange={(e) => setCountOmprengBumil(e.target.value === '' ? '' : Number(e.target.value))}
                                                                                        />
                                                                                    </td>
                                                                                    <td colSpan={5} className="px-2 py-3 text-center">
                                                                                        <div className="text-[11px] text-muted-foreground bg-muted/30 py-1.5 rounded-md border border-dashed border-gray-200">
                                                                                            Menggunakan nilai gizi Porsi Besar
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                            {activeOmprengTargets.includes('bumil') && omprengBumilOverride && (
                                                                                <tr className="hover:bg-pink-50/50 transition-colors bg-pink-50/30 border-b">
                                                                                    <td className="px-4 py-3 pl-8">
                                                                                        <p className="font-bold text-pink-700 text-sm">↳ Bumil / Busui</p>
                                                                                        <p className="text-[10px] text-pink-600/70 mt-0.5">Nilai gizi mengikuti Porsi Besar</p>
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-center">
                                                                                        <Input type="number" min="0"
                                                                                            className="h-10 w-20 text-center text-sm font-extrabold border-pink-300 bg-pink-100 text-pink-700 focus-visible:ring-pink-300 no-spinner mx-auto"
                                                                                            value={countOmprengBumil}
                                                                                            onChange={(e) => setCountOmprengBumil(e.target.value === '' ? '' : Number(e.target.value))}
                                                                                        />
                                                                                    </td>
                                                                                    {['energi', 'protein', 'lemak', 'karbo'].map(nutri => (
                                                                                        <td key={`ompreng-bumil-${nutri}`} className="px-2 py-3">
                                                                                            <Input type="number" step="0.01"
                                                                                                className="h-10 text-center text-sm font-bold border-pink-300 bg-pink-50 focus-visible:ring-pink-300 no-spinner"
                                                                                                placeholder="0"
                                                                                                value={omprengNutritionData['bumil']?.[nutri] || ''}
                                                                                                onChange={(e) => {
                                                                                                    const val = parseFloat(e.target.value) || 0;
                                                                                                    setOmprengNutritionData((prev: any) => ({ ...prev, bumil: { ...prev?.bumil, [nutri]: val } }));
                                                                                                }}
                                                                                            />
                                                                                        </td>
                                                                                    ))}
                                                                                    <td className="px-2 py-3"></td>
                                                                                </tr>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}

                                                            {/* ROW PORSI KECIL / BALITA */}
                                                            {isOmprengKecilActive && (
                                                                <>
                                                                    {/* Case: Only Balita (no PAUD/TK) - show Balita standalone */}
                                                                    {!activeOmprengTargets.includes('kecil') && activeOmprengTargets.includes('balita') && (
                                                                        <tr className="hover:bg-orange-50/50 transition-colors bg-orange-50/10">
                                                                            <td className="px-4 py-3">
                                                                                <p className="font-bold text-orange-700 text-sm">Balita</p>
                                                                                <p className="text-[10px] text-muted-foreground mt-0.5">Nilai gizi mengikuti Porsi Kecil</p>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                <Input type="number" min="0"
                                                                                    className="h-10 w-20 text-center text-sm font-extrabold border-orange-300 bg-orange-100 text-orange-700 focus-visible:ring-orange-300 no-spinner mx-auto"
                                                                                    value={countOmprengBalita}
                                                                                    onChange={(e) => setCountOmprengBalita(e.target.value === '' ? '' : Number(e.target.value))}
                                                                                />
                                                                            </td>
                                                                            {['energi', 'protein', 'lemak', 'karbo'].map(nutri => (
                                                                                <td key={`ompreng-balita-sa-${nutri}`} className="px-2 py-3">
                                                                                    <Input type="number" step="0.01"
                                                                                        className="h-10 text-center text-sm font-bold border-orange-200 bg-orange-50 focus-visible:ring-orange-300 no-spinner"
                                                                                        placeholder="0"
                                                                                        value={omprengNutritionData['balita']?.[nutri] || ''}
                                                                                        onChange={(e) => {
                                                                                            let val = parseFloat(e.target.value) || 0;
                                                                                            if (nutri === 'energi' && val > 400) val = 400;
                                                                                            setOmprengNutritionData((prev: any) => ({ ...prev, balita: { ...prev?.balita, [nutri]: val } }));
                                                                                        }}
                                                                                    />
                                                                                </td>
                                                                            ))}
                                                                            <td className="px-2 py-3"></td>
                                                                        </tr>
                                                                    )}
                                                                    {/* Case: Kecil active (PAUD/TK) - with optional Balita sub-row */}
                                                                    {activeOmprengTargets.includes('kecil') && (
                                                                        <>
                                                                            <tr className="hover:bg-blue-50/50 transition-colors">
                                                                                <td className="px-4 py-3">
                                                                                    <p className="font-bold text-blue-700 text-sm">Porsi Kecil</p>
                                                                                    <p className="text-[10px] text-muted-foreground mt-0.5">PAUD / TK / SD 1-3</p>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    <Input type="number" min="0"
                                                                                        className="h-10 w-20 text-center text-sm font-extrabold border-blue-300 bg-blue-100 text-blue-700 focus-visible:ring-blue-300 no-spinner mx-auto"
                                                                                        value={countOmprengKecil}
                                                                                        onChange={(e) => setCountOmprengKecil(e.target.value === '' ? '' : Number(e.target.value))}
                                                                                    />
                                                                                </td>
                                                                                {['energi', 'protein', 'lemak', 'karbo'].map(nutri => (
                                                                                    <td key={`ompreng-kecil-${nutri}`} className="px-2 py-3">
                                                                                        <Input type="number" step="0.01"
                                                                                            className="h-10 text-center text-sm font-bold border-blue-200 bg-blue-50/40 focus-visible:ring-blue-300 no-spinner"
                                                                                            placeholder="0"
                                                                                            value={omprengNutritionData['kecil']?.[nutri] || ''}
                                                                                            onChange={(e) => {
                                                                                                let val = parseFloat(e.target.value) || 0;
                                                                                                if (nutri === 'energi' && val > 400) val = 400;
                                                                                                setOmprengNutritionData((prev: any) => ({ ...prev, kecil: { ...prev?.kecil, [nutri]: val } }));
                                                                                            }}
                                                                                        />
                                                                                    </td>
                                                                                ))}
                                                                                <td className="px-2 py-3 text-center">
                                                                                    {activeOmprengTargets.includes('balita') && (
                                                                                        <button type="button" onClick={() => setOmprengBalitaOverride(!omprengBalitaOverride)} className={`text-[10px] font-bold px-2 py-1 rounded w-full border transition-all ${omprengBalitaOverride ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-muted text-muted-foreground border-border hover:border-orange-300 hover:text-orange-600'}`}>
                                                                                            {omprengBalitaOverride ? '✕ Samakan Gizi' : '+ Atur Gizi Balita'}
                                                                                        </button>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                            {activeOmprengTargets.includes('balita') && !omprengBalitaOverride && (
                                                                                <tr className="bg-orange-50/10 border-b">
                                                                                    <td className="px-4 py-3 pl-8">
                                                                                        <p className="font-medium text-orange-700 text-sm">↳ Balita</p>
                                                                                        <p className="text-[10px] text-muted-foreground mt-0.5">Nilai gizi mengikuti Porsi Kecil</p>
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-center">
                                                                                        <Input type="number" min="0"
                                                                                            className="h-9 w-16 text-center text-xs font-bold border-orange-200 bg-orange-50 text-orange-700 focus-visible:ring-orange-300 no-spinner mx-auto"
                                                                                            value={countOmprengBalita}
                                                                                            onChange={(e) => setCountOmprengBalita(e.target.value === '' ? '' : Number(e.target.value))}
                                                                                        />
                                                                                    </td>
                                                                                    <td colSpan={5} className="px-2 py-3 text-center">
                                                                                        <div className="text-[11px] text-muted-foreground bg-muted/30 py-1.5 rounded-md border border-dashed border-gray-200">
                                                                                            Menggunakan nilai gizi Porsi Kecil
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                            {activeOmprengTargets.includes('balita') && omprengBalitaOverride && (
                                                                                <tr className="hover:bg-orange-50/50 transition-colors bg-orange-50/30 border-b">
                                                                                    <td className="px-4 py-3 pl-8">
                                                                                        <p className="font-bold text-orange-700 text-sm">↳ Balita</p>
                                                                                        <p className="text-[10px] text-orange-600/70 mt-0.5">Nilai gizi mengikuti Porsi Kecil</p>
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-center">
                                                                                        <Input type="number" min="0"
                                                                                            className="h-10 w-20 text-center text-sm font-extrabold border-orange-300 bg-orange-100 text-orange-700 focus-visible:ring-orange-300 no-spinner mx-auto"
                                                                                            value={countOmprengBalita}
                                                                                            onChange={(e) => setCountOmprengBalita(e.target.value === '' ? '' : Number(e.target.value))}
                                                                                        />
                                                                                    </td>
                                                                                    {['energi', 'protein', 'lemak', 'karbo'].map(nutri => (
                                                                                        <td key={`ompreng-balita-${nutri}`} className="px-2 py-3">
                                                                                            <Input type="number" step="0.01"
                                                                                                className="h-10 text-center text-sm font-bold border-orange-300 bg-orange-50 focus-visible:ring-orange-300 no-spinner"
                                                                                                placeholder="0"
                                                                                                value={omprengNutritionData['balita']?.[nutri] || ''}
                                                                                                onChange={(e) => {
                                                                                                    let val = parseFloat(e.target.value) || 0;
                                                                                                    if (nutri === 'energi' && val > 400) val = 400;
                                                                                                    setOmprengNutritionData((prev: any) => ({ ...prev, balita: { ...prev?.balita, [nutri]: val } }));
                                                                                                }}
                                                                                            />
                                                                                        </td>
                                                                                    ))}
                                                                                    <td className="px-2 py-3"></td>
                                                                                </tr>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="space-y-4 mt-4 bg-muted/5 p-4 rounded-xl border border-muted/10 shadow-inner">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex flex-col gap-1">
                                                        <Label className="font-bold text-base text-primary flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                                <BookOpen className="w-4 h-4" />
                                                            </div>
                                                            Komposisi Bahan & Resep
                                                        </Label>
                                                        <p className="text-[10px] text-muted-foreground ml-10">Atur porsi dan bahan masak harian</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button type="button" size="sm" variant="default" onClick={() => setIsRecipeOpen(true)} className="h-8 bg-primary/90 text-[11px]">
                                                            <BookOpen className="h-3 w-3 mr-1" /> + Resep
                                                        </Button>
                                                        <Button type="button" size="sm" variant="outline" onClick={addEmptyRowOmpreng} className="h-8 text-[11px]">
                                                            <Plus className="h-3 w-3 mr-1" /> + Manual
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    {ingredientsOmpreng.some(i => i.isSecukupnya) && (
                                                        <Alert className="mb-0 bg-amber-50 border-amber-200 text-amber-800 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <Zap className="h-4 w-4 text-amber-600" />
                                                            <AlertTitle className="text-sm font-bold">Bahan Secukupnya Terdeteksi</AlertTitle>
                                                            <AlertDescription className="text-xs opacity-90">
                                                                Beberapa bahan ditandai sebagai <b>secukupnya</b>. Bahan-bahan ini tidak akan dimasukkan dalam kalkulasi stok gudang karena kuantitasnya fleksibel.
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                    <div className="rounded-md border bg-card overflow-x-auto">
                                                        <table className="w-full text-xs">
                                                        <thead className="bg-muted text-muted-foreground uppercase border-b shadow-sm sticky top-0 z-10">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left font-bold min-w-[140px]">Bahan</th>
                                                                <th className="px-3 py-3 text-center w-24 font-bold whitespace-nowrap">Stok</th>
                                                                <th className="px-3 py-3 text-center w-32 font-bold whitespace-nowrap">
                                                                    <div>Porsi Bsr</div>
                                                                    <div className="text-[9px] text-muted-foreground/70 font-normal normal-case mt-0.5 tracking-wider">gramasi / porsi</div>
                                                                </th>
                                                                <th className="px-3 py-3 text-center w-32 font-bold whitespace-nowrap">
                                                                    <div>Porsi Kc</div>
                                                                    <div className="text-[9px] text-muted-foreground/70 font-normal normal-case mt-0.5 tracking-wider">gramasi / porsi</div>
                                                                </th>
                                                                <th className="px-3 py-3 text-center w-36 font-bold text-primary whitespace-nowrap">Total Kebutuhan</th>
                                                                <th className="px-2 py-3 w-10"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            {ingredientsOmpreng.map((item) => {
                                                                const fBesar = formatRecipeQty(Number(item.qtyBesar) || 0, item.unit);
                                                                const fKecil = formatRecipeQty(Number(item.qtyKecil) || 0, item.unit);
                                                                const fTotal = formatRecipeQty(Number(item.qty) || 0, item.unit);

                                                                return (
                                                                    <tr key={item.tempId} className={`transition-all duration-300 ${item.isSecukupnya ? 'bg-amber-50/50' : 'hover:bg-muted/30'}`}>
                                                                        <td className="px-3 py-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className={`h-8 w-8 rounded-full transition-all flex-shrink-0 ${item.isSecukupnya ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm' : 'text-muted-foreground hover:bg-amber-100 hover:text-amber-600'}`}
                                                                                    onClick={() => updateIngredientOmprengMultiple(item.tempId, { isSecukupnya: !item.isSecukupnya })}
                                                                                    title={item.isSecukupnya ? "Bahan secukupnya (aktif)" : "Tandai bahan secukupnya"}
                                                                                >
                                                                                    <Zap className={`h-4 w-4 ${item.isSecukupnya ? 'animate-pulse' : ''}`} />
                                                                                </Button>
                                                                                <div className="flex-1">
                                                                                    <IngredientCombobox value={item.name} onSelectIngredient={(ing) => updateIngredientOmprengMultiple(item.tempId, { name: ing.name, unit: ing.unit, currentStock: ing.currentStock || 0 })} />
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-3 py-3 text-center text-xs text-muted-foreground bg-muted/20 font-medium">
                                                                            {item.currentStock ?? 0} {item.unit}
                                                                        </td>
                                                                        <td className="px-2 py-2">
                                                                            <div className={`flex items-center gap-1 p-1 rounded border transition-all ${item.isSecukupnya ? 'bg-amber-100/50 border-amber-200 opacity-60' : (isOmprengBesarActive ? 'bg-muted/20 border-transparent hover:border-muted-foreground/20' : 'bg-muted/10 border-dashed border-muted-foreground/20 opacity-40 pointer-events-none grayscale')}`}>
                                                                                {item.isSecukupnya ? (
                                                                                    <div className="h-10 flex-1 flex items-center justify-center text-[10px] font-bold text-amber-700 italic uppercase tracking-wider">Secukupnya</div>
                                                                                ) : (
                                                                                    <>
                                                                                        <Input
                                                                                            type="number"
                                                                                            step="0.001"
                                                                                            disabled={!isOmprengBesarActive}
                                                                                            className={`h-10 text-center text-sm font-semibold flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 no-spinner px-0 ${!isOmprengBesarActive && 'text-muted-foreground'}`}
                                                                                            style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                                                                                            value={item.qtyBesar ? fBesar.value : ''}
                                                                                            onChange={(e) => {
                                                                                                const val = e.target.value === '' ? '' : denormalizeQty(parseFloat(e.target.value), fBesar.unit, item.unit);
                                                                                                updateIngredientOmpreng(item.tempId, 'qtyBesar', val);
                                                                                            }}
                                                                                        />
                                                                                        <span className="text-xs text-muted-foreground w-12 font-semibold pr-1 break-keep">{fBesar.unit}</span>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </td>

                                                                        <td className="px-2 py-2">
                                                                            <div className={`flex items-center gap-1 p-1 rounded border transition-all ${item.isSecukupnya ? 'bg-amber-100/50 border-amber-200 opacity-60' : (isOmprengKecilActive ? 'bg-muted/20 border-transparent hover:border-muted-foreground/20' : 'bg-muted/10 border-dashed border-muted-foreground/20 opacity-40 pointer-events-none grayscale')}`}>
                                                                                {item.isSecukupnya ? (
                                                                                    <div className="h-10 flex-1 flex items-center justify-center text-[10px] font-bold text-amber-700 italic uppercase tracking-wider">Secukupnya</div>
                                                                                ) : (
                                                                                    <>
                                                                                        <Input
                                                                                            type="number"
                                                                                            step="0.001"
                                                                                            disabled={!isOmprengKecilActive}
                                                                                            className={`h-10 text-center text-sm font-semibold flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 no-spinner px-0 ${!isOmprengKecilActive && 'text-muted-foreground'}`}
                                                                                            style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                                                                                            value={item.qtyKecil ? fKecil.value : ''}
                                                                                            onChange={(e) => {
                                                                                                const val = e.target.value === '' ? '' : denormalizeQty(parseFloat(e.target.value), fKecil.unit, item.unit);
                                                                                                updateIngredientOmpreng(item.tempId, 'qtyKecil', val);
                                                                                            }}
                                                                                        />
                                                                                        <span className="text-xs text-muted-foreground w-12 font-semibold pr-1 break-keep">{fKecil.unit}</span>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </td>

                                                                        <td className="px-1 py-1">
                                                                            <div className={`flex items-center gap-1 p-1 w-full rounded border ${item.isSecukupnya ? 'bg-amber-100 border-amber-300' : 'bg-muted/40 border-primary/10'}`}>
                                                                                <Input
                                                                                    type="text"
                                                                                    className={`h-12 text-center text-lg font-bold bg-transparent flex-1 border-none shadow-none focus-visible:ring-0 no-spinner px-0 ${item.isSecukupnya ? 'text-amber-700' : ''}`} style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                                                                                    value={item.isSecukupnya ? '∞' : (fTotal.value || '')}
                                                                                    readOnly
                                                                                />
                                                                                <span className={`text-xs font-bold w-12 pr-1 break-keep ${item.isSecukupnya ? 'text-amber-700' : 'text-primary'}`}>{fTotal.unit}</span>
                                                                            </div>
                                                                        </td>

                                                                        <td className="px-2 py-4 text-center"><X className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-red-500 transition-colors inline" onClick={() => removeIngredientOmpreng(item.tempId)} /></td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    )}
                                </div>

                                <div className={`space-y-4 border rounded-xl p-4 transition-colors ${isKeringEnabled ? 'bg-orange-50/30 border-orange-200' : 'bg-muted/10 border-dashed opacity-70'}`}>
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-3 border-b border-orange-200/50">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="toggle-kering"
                                                checked={isKeringEnabled}
                                                onChange={(e) => setIsKeringEnabled(e.target.checked)}
                                                className="w-5 h-5 accent-orange-500 cursor-pointer"
                                            />
                                            <Label htmlFor="toggle-kering" className="font-bold text-base flex items-center gap-2 cursor-pointer text-orange-700">
                                                <Plus className="w-5 h-5" /> PAKET TAMBAHAN (KERING)
                                            </Label>
                                        </div>
                                        {isKeringEnabled && (
                                            <Button type="button" variant="outline" size="sm" onClick={() => { setHistoryFilterType('KERING'); setIsHistoryOpen(true); }} className="h-8 bg-background border-orange-200 text-orange-700">
                                                <History className="w-3.5 h-3.5 mr-2" /> Riwayat
                                            </Button>
                                        )}
                                    </div>

                                    {isKeringEnabled && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-2">
                                                <Label className="font-semibold text-orange-700 text-xs uppercase">Nama Paket Kering <span className="text-red-500">*</span></Label>
                                                <Input
                                                    value={keringName}
                                                    onChange={(e) => setKeringName(e.target.value)}
                                                    placeholder="Contoh: Snack Buah & Susu"
                                                    required={isKeringEnabled}
                                                    className="bg-background font-bold text-base h-10 border-orange-200"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="font-semibold text-orange-700 text-xs uppercase">Catatan Tambahan Paket Kering</Label>
                                                <Textarea
                                                    value={keringDescription}
                                                    onChange={(e) => setKeringDescription(e.target.value)}
                                                    placeholder="Contoh: Pisang dibagikan saat jam istrihat kedua"
                                                    className="bg-background text-sm min-h-[60px] border-orange-200"
                                                />
                                            </div>
                                            <div className="space-y-3 bg-orange-50/20 p-4 rounded-lg border border-orange-100">
                                                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                                                    <Label className="font-semibold text-sm flex items-center gap-2 text-orange-700">
                                                        <Calculator className="h-4 w-4" /> Target Pemilih Paket Kering
                                                    </Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {/* CHIP: Besar */}
                                                        {(() => {
                                                            const isOn = activeKeringTargets.includes('besar') || Number(countKeringBesar) > 0;
                                                            return (
                                                                <button type="button"
                                                                    onClick={() => {
                                                                        if (isOn) { setActiveKeringTargets(p => p.filter(c => c !== 'besar')); setCountKeringBesar(0); }
                                                                        else { setActiveKeringTargets(p => [...p, 'besar']); setCountKeringBesar(100); }
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all select-none ${isOn ? 'bg-orange-600 text-white border-orange-600 shadow' : 'bg-background text-muted-foreground border-border hover:border-orange-300 hover:text-orange-600'}`}>
                                                                    {isOn ? '✓' : '+'} Porsi Besar <span className="text-[10px] opacity-60 ml-0.5 font-medium">(SD/SMP/SMA)</span>
                                                                </button>
                                                            );
                                                        })()}
                                                        {/* CHIP: Bumil */}
                                                        {(() => {
                                                            const isOn = activeKeringTargets.includes('bumil') || Number(countKeringBumil) > 0;
                                                            return (
                                                                <button type="button"
                                                                    onClick={() => {
                                                                        if (isOn) { setActiveKeringTargets(p => p.filter(c => c !== 'bumil')); setCountKeringBumil(0); }
                                                                        else { setActiveKeringTargets(p => [...p, 'bumil']); }
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all select-none ${isOn ? 'bg-pink-500 text-white border-pink-500 shadow' : 'bg-background text-muted-foreground border-border hover:border-pink-300 hover:text-pink-600'}`}>
                                                                    {isOn ? '✓' : '+'} Bumil / Busui
                                                                </button>
                                                            );
                                                        })()}
                                                        {/* CHIP: Kecil */}
                                                        {(() => {
                                                            const isOn = activeKeringTargets.includes('kecil') || Number(countKeringKecil) > 0;
                                                            return (
                                                                <button type="button"
                                                                    onClick={() => {
                                                                        if (isOn) { setActiveKeringTargets(p => p.filter(c => c !== 'kecil')); setCountKeringKecil(0); }
                                                                        else { setActiveKeringTargets(p => [...p, 'kecil']); }
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all select-none ${isOn ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-background text-muted-foreground border-border hover:border-blue-300 hover:text-blue-600'}`}>
                                                                    {isOn ? '✓' : '+'} Porsi Kecil <span className="text-[10px] opacity-60 ml-0.5 font-medium">(PAUD/TK/SD 1-3)</span>
                                                                </button>
                                                            );
                                                        })()}
                                                        {/* CHIP: Balita */}
                                                        {(() => {
                                                            const isOn = activeKeringTargets.includes('balita') || Number(countKeringBalita) > 0;
                                                            return (
                                                                <button type="button"
                                                                    onClick={() => {
                                                                        if (isOn) { setActiveKeringTargets(p => p.filter(c => c !== 'balita')); setCountKeringBalita(0); }
                                                                        else { setActiveKeringTargets(p => [...p, 'balita']); }
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all select-none ${isOn ? 'bg-orange-500 text-white border-orange-500 shadow' : 'bg-background text-muted-foreground border-border hover:border-orange-300 hover:text-orange-600'}`}>
                                                                    {isOn ? '✓' : '+'} Balita
                                                                </button>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 py-4 px-6 bg-orange-50/50 rounded-xl border border-orange-100 text-xs mb-2 shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-muted-foreground mr-1">Ringkasan Porsi:</span>
                                                        <div className="flex items-center gap-1.5 bg-background px-2 py-1 rounded border border-orange-200 shadow-sm">
                                                            <span className="text-muted-foreground">Besar:</span>
                                                            <span className="font-bold text-orange-700">{(Number(countKeringBesar) || 0) + (Number(countKeringBumil) || 0)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 bg-background px-2 py-1 rounded border border-blue-200 shadow-sm">
                                                            <span className="text-muted-foreground">Kecil:</span>
                                                            <span className="font-bold text-blue-700">{(Number(countKeringKecil) || 0) + (Number(countKeringBalita) || 0)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-auto">
                                                        <span className="font-bold text-orange-800/70 uppercase text-[10px] tracking-wider">TOTAL PAX:</span>
                                                        <Badge variant="default" className="font-extrabold text-sm px-4 py-1.5 bg-orange-600 hover:bg-orange-700 transition-all shadow-md">
                                                            {(Number(countKeringBesar) || 0) + (Number(countKeringBumil) || 0) + (Number(countKeringKecil) || 0) + (Number(countKeringBalita) || 0)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="rounded-md border bg-card overflow-hidden">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-orange-50 text-orange-800 border-b text-xs uppercase tracking-wider">
                                                            <tr>
                                                                <th className="px-4 py-2.5 text-left font-bold">Porsi</th>
                                                                <th className="px-4 py-2.5 text-center font-bold w-24 text-foreground whitespace-nowrap">Total Pax</th>
                                                                <th className="px-3 py-2.5 text-center font-medium w-28 whitespace-nowrap">Energi (kcal)<br /><span className="text-[9px] text-muted-foreground font-normal normal-case">per porsi</span></th>
                                                                <th className="px-3 py-2.5 text-center font-medium w-24 whitespace-nowrap">Protein (g)<br /><span className="text-[9px] text-muted-foreground font-normal normal-case">per porsi</span></th>
                                                                <th className="px-3 py-2.5 text-center font-medium w-24 whitespace-nowrap">Lemak (g)<br /><span className="text-[9px] text-muted-foreground font-normal normal-case">per porsi</span></th>
                                                                <th className="px-3 py-2.5 text-center font-medium w-24 whitespace-nowrap">Karbo (g)<br /><span className="text-[9px] text-muted-foreground font-normal normal-case">per porsi</span></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-orange-100/50">
                                                            {/* ROW PORSI BESAR / BUMIL */}
                                                            {isKeringBesarActive && (
                                                                <>
                                                                    {/* Case: Only Bumil (no SD/SMP/SMA) - show Bumil standalone */}
                                                                    {!activeKeringTargets.includes('besar') && activeKeringTargets.includes('bumil') && (
                                                                        <tr className="hover:bg-pink-50/50 transition-colors bg-pink-50/10">
                                                                            <td className="px-4 py-3">
                                                                                <p className="font-bold text-pink-700 text-sm">Bumil / Busui</p>
                                                                                <p className="text-[10px] text-muted-foreground mt-0.5">Nilai gizi mengikuti Porsi Besar</p>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                <Input type="number" min="0"
                                                                                    className="h-10 w-20 text-center text-sm font-extrabold border-pink-300 bg-pink-100 text-pink-700 focus-visible:ring-pink-300 no-spinner mx-auto"
                                                                                    value={countKeringBumil}
                                                                                    onChange={(e) => setCountKeringBumil(e.target.value === '' ? '' : Number(e.target.value))}
                                                                                />
                                                                            </td>
                                                                            {['energi', 'protein', 'lemak', 'karbo'].map(nutri => (
                                                                                <td key={`kering-bumil-sa-${nutri}`} className="px-2 py-3">
                                                                                    <Input type="number" step="0.01"
                                                                                        className="h-10 text-center text-sm font-bold border-pink-200 bg-pink-50 focus-visible:ring-pink-300 no-spinner"
                                                                                        placeholder="0"
                                                                                        value={(keringNutritionData as any)['bumil']?.[nutri] || ''}
                                                                                        onChange={(e) => {
                                                                                            const val = parseFloat(e.target.value) || 0;
                                                                                            setKeringNutritionData((prev: any) => ({ ...prev, bumil: { ...prev?.bumil, [nutri]: val } }));
                                                                                        }}
                                                                                    />
                                                                                </td>
                                                                            ))}
                                                                            <td className="px-2 py-3"></td>
                                                                        </tr>
                                                                    )}
                                                                    {/* Case: Besar active - with optional Bumil sub-row */}
                                                                    {activeKeringTargets.includes('besar') && (
                                                                        <>
                                                                            <tr className="hover:bg-orange-50/50 transition-colors">
                                                                                <td className="px-4 py-3">
                                                                                    <p className="font-bold text-primary text-sm">Porsi Besar</p>
                                                                                    <p className="text-[10px] text-muted-foreground mt-0.5">SD 4-6 / SMP / SMA</p>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    <Input type="number" min="0"
                                                                                        className="h-10 w-20 text-center text-sm font-extrabold border-orange-300 bg-orange-100 text-orange-700 focus-visible:ring-orange-300 no-spinner mx-auto"
                                                                                        value={countKeringBesar}
                                                                                        onChange={(e) => setCountKeringBesar(e.target.value === '' ? '' : Number(e.target.value))}
                                                                                    />
                                                                                </td>
                                                                                {['energi', 'protein', 'lemak', 'karbo'].map(nutri => (
                                                                                    <td key={`kering-besar-${nutri}`} className="px-2 py-3">
                                                                                        <Input type="number" step="0.01"
                                                                                            className="h-10 text-center text-sm font-bold border-orange-200 bg-orange-50/40 focus-visible:ring-orange-300 no-spinner"
                                                                                            placeholder="0"
                                                                                            value={(keringNutritionData as any)['besar']?.[nutri] || ''}
                                                                                            onChange={(e) => {
                                                                                                const val = parseFloat(e.target.value) || 0;
                                                                                                setKeringNutritionData((prev: any) => ({ ...prev, besar: { ...prev?.besar, [nutri]: val } }));
                                                                                            }}
                                                                                        />
                                                                                    </td>
                                                                                ))}
                                                                                <td className="px-2 py-3 text-center">
                                                                                    {activeKeringTargets.includes('bumil') && (
                                                                                        <button type="button" onClick={() => setKeringBumilOverride(!keringBumilOverride)} className={`text-[10px] font-bold px-2 py-1 rounded w-full border transition-all ${keringBumilOverride ? 'bg-pink-100 text-pink-700 border-pink-300' : 'bg-muted text-muted-foreground border-border hover:border-pink-300 hover:text-pink-600'}`}>
                                                                                            {keringBumilOverride ? '✕ Samakan Gizi' : '+ Atur Gizi Bumil'}
                                                                                        </button>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                            {activeKeringTargets.includes('bumil') && !keringBumilOverride && (
                                                                                <tr className="bg-pink-50/10 border-b border-orange-100/50">
                                                                                    <td className="px-4 py-3 pl-8">
                                                                                        <p className="font-medium text-pink-700 text-sm">↳ Bumil / Busui</p>
                                                                                        <p className="text-[10px] text-muted-foreground mt-0.5">Nilai gizi mengikuti Porsi Besar</p>
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-center">
                                                                                        <Input type="number" min="0"
                                                                                            className="h-9 w-16 text-center text-xs font-bold border-pink-200 bg-pink-50 text-pink-700 focus-visible:ring-pink-300 no-spinner mx-auto"
                                                                                            value={countKeringBumil}
                                                                                            onChange={(e) => setCountKeringBumil(e.target.value === '' ? '' : Number(e.target.value))}
                                                                                        />
                                                                                    </td>
                                                                                    <td colSpan={5} className="px-2 py-3 text-center">
                                                                                        <div className="text-[11px] text-muted-foreground bg-muted/30 py-1.5 rounded-md border border-dashed border-gray-200">
                                                                                            Menggunakan nilai gizi Porsi Besar
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                            {activeKeringTargets.includes('bumil') && keringBumilOverride && (
                                                                                <tr className="hover:bg-pink-50/50 transition-colors bg-pink-50/30 border-b border-orange-100/50">
                                                                                    <td className="px-4 py-3 pl-8">
                                                                                        <p className="font-bold text-pink-700 text-sm">↳ Bumil / Busui</p>
                                                                                        <p className="text-[10px] text-pink-600/70 mt-0.5">Nilai gizi mengikuti Porsi Besar</p>
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-center">
                                                                                        <Input type="number" min="0"
                                                                                            className="h-10 w-20 text-center text-sm font-extrabold border-pink-300 bg-pink-100 text-pink-700 focus-visible:ring-pink-300 no-spinner mx-auto"
                                                                                            value={countKeringBumil}
                                                                                            onChange={(e) => setCountKeringBumil(e.target.value === '' ? '' : Number(e.target.value))}
                                                                                        />
                                                                                    </td>
                                                                                    {['energi', 'protein', 'lemak', 'karbo'].map(nutri => (
                                                                                        <td key={`kering-bumil-${nutri}`} className="px-2 py-3">
                                                                                            <Input type="number" step="0.01"
                                                                                                className="h-10 text-center text-sm font-bold border-pink-300 bg-pink-50 focus-visible:ring-pink-300 no-spinner"
                                                                                                placeholder="0"
                                                                                                value={(keringNutritionData as any)['bumil']?.[nutri] || ''}
                                                                                                onChange={(e) => {
                                                                                                    const val = parseFloat(e.target.value) || 0;
                                                                                                    setKeringNutritionData((prev: any) => ({ ...prev, bumil: { ...prev?.bumil, [nutri]: val } }));
                                                                                                }}
                                                                                            />
                                                                                        </td>
                                                                                    ))}
                                                                                    <td className="px-2 py-3"></td>
                                                                                </tr>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}

                                                            {/* ROW PORSI KECIL / BALITA */}
                                                            {isKeringKecilActive && (
                                                                <>
                                                                    {/* Case: Only Balita (no PAUD/TK) - show Balita standalone */}
                                                                    {!activeKeringTargets.includes('kecil') && activeKeringTargets.includes('balita') && (
                                                                        <tr className="hover:bg-orange-50/50 transition-colors bg-orange-50/10">
                                                                            <td className="px-4 py-3">
                                                                                <p className="font-bold text-orange-700 text-sm">Balita</p>
                                                                                <p className="text-[10px] text-muted-foreground mt-0.5">Nilai gizi mengikuti Porsi Kecil</p>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                <Input type="number" min="0"
                                                                                    className="h-10 w-20 text-center text-sm font-extrabold border-orange-300 bg-orange-100 text-orange-700 focus-visible:ring-orange-300 no-spinner mx-auto"
                                                                                    value={countKeringBalita}
                                                                                    onChange={(e) => setCountKeringBalita(e.target.value === '' ? '' : Number(e.target.value))}
                                                                                />
                                                                            </td>
                                                                            {['energi', 'protein', 'lemak', 'karbo'].map(nutri => (
                                                                                <td key={`kering-balita-sa-${nutri}`} className="px-2 py-3">
                                                                                    <Input type="number" step="0.01"
                                                                                        className="h-10 text-center text-sm font-bold border-orange-200 bg-orange-50 focus-visible:ring-orange-300 no-spinner"
                                                                                        placeholder="0"
                                                                                        value={(keringNutritionData as any)['balita']?.[nutri] || ''}
                                                                                        onChange={(e) => {
                                                                                            let val = parseFloat(e.target.value) || 0;
                                                                                            if (nutri === 'energi' && val > 400) val = 400;
                                                                                            setKeringNutritionData((prev: any) => ({ ...prev, balita: { ...prev?.balita, [nutri]: val } }));
                                                                                        }}
                                                                                    />
                                                                                </td>
                                                                            ))}
                                                                            <td className="px-2 py-3"></td>
                                                                        </tr>
                                                                    )}
                                                                    {/* Case: Kecil active - with optional Balita sub-row */}
                                                                    {activeKeringTargets.includes('kecil') && (
                                                                        <>
                                                                            <tr className="hover:bg-blue-50/50 transition-colors">
                                                                                <td className="px-4 py-3">
                                                                                    <p className="font-bold text-blue-700 text-sm">Porsi Kecil</p>
                                                                                    <p className="text-[10px] text-muted-foreground mt-0.5">PAUD / TK / SD 1-3</p>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    <Input type="number" min="0"
                                                                                        className="h-10 w-20 text-center text-sm font-extrabold border-blue-300 bg-blue-100 text-blue-700 focus-visible:ring-blue-300 no-spinner mx-auto"
                                                                                        value={countKeringKecil}
                                                                                        onChange={(e) => setCountKeringKecil(e.target.value === '' ? '' : Number(e.target.value))}
                                                                                    />
                                                                                </td>
                                                                                {['energi', 'protein', 'lemak', 'karbo'].map(nutri => (
                                                                                    <td key={`kering-kecil-${nutri}`} className="px-2 py-3">
                                                                                        <Input type="number" step="0.01"
                                                                                            className="h-10 text-center text-sm font-bold border-blue-200 bg-blue-50/40 focus-visible:ring-blue-300 no-spinner"
                                                                                            placeholder="0"
                                                                                            value={(keringNutritionData as any)['kecil']?.[nutri] || ''}
                                                                                            onChange={(e) => {
                                                                                                let val = parseFloat(e.target.value) || 0;
                                                                                                if (nutri === 'energi' && val > 400) val = 400;
                                                                                                setKeringNutritionData((prev: any) => ({ ...prev, kecil: { ...prev?.kecil, [nutri]: val } }));
                                                                                            }}
                                                                                        />
                                                                                    </td>
                                                                                ))}
                                                                                <td className="px-2 py-3 text-center">
                                                                                    {activeKeringTargets.includes('balita') && (
                                                                                        <button type="button" onClick={() => setKeringBalitaOverride(!keringBalitaOverride)} className={`text-[10px] font-bold px-2 py-1 rounded w-full border transition-all ${keringBalitaOverride ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-muted text-muted-foreground border-border hover:border-orange-300 hover:text-orange-600'}`}>
                                                                                            {keringBalitaOverride ? '✕ Samakan Gizi' : '+ Atur Gizi Balita'}
                                                                                        </button>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                            {activeKeringTargets.includes('balita') && !keringBalitaOverride && (
                                                                                <tr className="bg-orange-50/10 border-b border-orange-100/50">
                                                                                    <td className="px-4 py-3 pl-8">
                                                                                        <p className="font-medium text-orange-700 text-sm">↳ Balita</p>
                                                                                        <p className="text-[10px] text-muted-foreground mt-0.5">Nilai gizi mengikuti Porsi Kecil</p>
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-center">
                                                                                        <Input type="number" min="0"
                                                                                            className="h-9 w-16 text-center text-xs font-bold border-orange-200 bg-orange-50 text-orange-700 focus-visible:ring-orange-300 no-spinner mx-auto"
                                                                                            value={countKeringBalita}
                                                                                            onChange={(e) => setCountKeringBalita(e.target.value === '' ? '' : Number(e.target.value))}
                                                                                        />
                                                                                    </td>
                                                                                    <td colSpan={5} className="px-2 py-3 text-center">
                                                                                        <div className="text-[11px] text-muted-foreground bg-muted/30 py-1.5 rounded-md border border-dashed border-gray-200">
                                                                                            Menggunakan nilai gizi Porsi Kecil
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                            {activeKeringTargets.includes('balita') && keringBalitaOverride && (
                                                                                <tr className="hover:bg-orange-50/50 transition-colors bg-orange-50/30 border-b border-orange-100/50">
                                                                                    <td className="px-4 py-3 pl-8">
                                                                                        <p className="font-bold text-orange-700 text-sm">↳ Balita</p>
                                                                                        <p className="text-[10px] text-orange-600/70 mt-0.5">Nilai gizi mengikuti Porsi Kecil</p>
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-center">
                                                                                        <Input type="number" min="0"
                                                                                            className="h-10 w-20 text-center text-sm font-extrabold border-orange-300 bg-orange-100 text-orange-700 focus-visible:ring-orange-300 no-spinner mx-auto"
                                                                                            value={countKeringBalita}
                                                                                            onChange={(e) => setCountKeringBalita(e.target.value === '' ? '' : Number(e.target.value))}
                                                                                        />
                                                                                    </td>
                                                                                    {['energi', 'protein', 'lemak', 'karbo'].map(nutri => (
                                                                                        <td key={`kering-balita-${nutri}`} className="px-2 py-3">
                                                                                            <Input type="number" step="0.01"
                                                                                                className="h-10 text-center text-sm font-bold border-orange-300 bg-orange-50 focus-visible:ring-orange-300 no-spinner"
                                                                                                placeholder="0"
                                                                                                value={(keringNutritionData as any)['balita']?.[nutri] || ''}
                                                                                                onChange={(e) => {
                                                                                                    let val = parseFloat(e.target.value) || 0;
                                                                                                    if (nutri === 'energi' && val > 400) val = 400;
                                                                                                    setKeringNutritionData((prev: any) => ({ ...prev, balita: { ...prev?.balita, [nutri]: val } }));
                                                                                                }}
                                                                                            />
                                                                                        </td>
                                                                                    ))}
                                                                                    <td className="px-2 py-3"></td>
                                                                                </tr>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="space-y-4 mt-8 bg-orange-50/10 p-4 rounded-xl border border-orange-200/20 shadow-inner">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex flex-col gap-1">
                                                        <Label className="font-bold text-base text-orange-700 flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                                                <Plus className="w-4 h-4" />
                                                            </div>
                                                            Daftar Snack Kering
                                                        </Label>
                                                        <p className="text-[10px] text-muted-foreground ml-10 text-orange-600/60">Atur porsi snack tambahan harian</p>
                                                    </div>
                                                    <Button type="button" size="sm" variant="default" onClick={addEmptyRowKering} className="h-8 bg-orange-600 text-[11px] text-white hover:bg-orange-700 shadow-sm transition-all">
                                                        <Plus className="h-3 w-3 mr-1" /> + Snack
                                                    </Button>
                                                </div>
                                                <div className="space-y-4">
                                                    {ingredientsKering.some(i => i.isSecukupnya) && (
                                                        <Alert className="mb-0 bg-amber-50 border-amber-200 text-amber-800 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <Zap className="h-4 w-4 text-amber-600" />
                                                            <AlertTitle className="text-sm font-bold">Snack Secukupnya Terdeteksi</AlertTitle>
                                                            <AlertDescription className="text-xs opacity-90">
                                                                Beberapa snack ditandai sebagai <b>secukupnya</b>. Bahan ini akan ditangani manual dan tidak memotong stok otomatis.
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                    <div className="rounded-md border bg-card overflow-x-auto">
                                                        <table className="w-full text-xs">
                                                        <thead className="bg-orange-100/50 text-orange-800 uppercase border-b border-orange-200 shadow-sm sticky top-0 z-10">
                                                            <tr>
                                                                <th className="px-2 py-2 text-left w-auto font-bold min-w-[100px]">Snack</th>
                                                                <th className="px-3 py-3 text-center w-24 font-bold whitespace-nowrap">Stok</th>

                                                                <th className="px-3 py-3 text-center w-32 font-bold whitespace-nowrap">
                                                                    <div>Porsi Bsr</div>
                                                                    <div className="text-[9px] text-orange-600/60 font-normal normal-case mt-0.5 tracking-wider">gramasi / porsi</div>
                                                                </th>

                                                                <th className="px-3 py-3 text-center w-32 font-bold whitespace-nowrap">
                                                                    <div>Porsi Kc</div>
                                                                    <div className="text-[9px] text-orange-600/60 font-normal normal-case mt-0.5 tracking-wider">gramasi / porsi</div>
                                                                </th>

                                                                <th className="px-3 py-3 text-center w-36 font-bold text-primary whitespace-nowrap">Total Kebutuhan</th>

                                                                <th className="px-2 py-3 w-10"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            {ingredientsKering.map((item) => {
                                                                const fBesar = formatRecipeQty(Number(item.qtyBesar) || 0, item.unit);
                                                                const fKecil = formatRecipeQty(Number(item.qtyKecil) || 0, item.unit);
                                                                const fTotal = formatRecipeQty(Number(item.qty) || 0, item.unit);

                                                                return (
                                                                    <tr key={item.tempId} className={`transition-all duration-300 ${item.isSecukupnya ? 'bg-amber-50/50' : 'hover:bg-orange-50/40'}`}>
                                                                        <td className="px-3 py-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className={`h-8 w-8 rounded-full transition-all flex-shrink-0 ${item.isSecukupnya ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm' : 'text-muted-foreground hover:bg-amber-100 hover:text-amber-600'}`}
                                                                                    onClick={() => updateIngredientKeringMultiple(item.tempId, { isSecukupnya: !item.isSecukupnya })}
                                                                                    title={item.isSecukupnya ? "Bahan secukupnya (aktif)" : "Tandai bahan secukupnya"}
                                                                                >
                                                                                    <Zap className={`h-4 w-4 ${item.isSecukupnya ? 'animate-pulse' : ''}`} />
                                                                                </Button>
                                                                                <div className="flex-1">
                                                                                    <IngredientCombobox value={item.name} category="KERING" onSelectIngredient={(ing) => updateIngredientKeringMultiple(item.tempId, { name: ing.name, unit: ing.unit, currentStock: ing.currentStock || 0 })} />
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-1 py-1 text-center text-[12px] text-muted-foreground bg-orange-50/20 font-medium">
                                                                            {item.currentStock ?? 0} {item.unit}
                                                                        </td>
                                                                        <td className="px-2 py-2">
                                                                            <div className={`flex items-center gap-1 p-1 rounded border transition-all ${item.isSecukupnya ? 'bg-amber-100/50 border-amber-200 opacity-60' : (isKeringBesarActive ? 'bg-muted/20 border-transparent hover:border-orange-200/50' : 'bg-muted/10 border-dashed border-muted-foreground/20 opacity-40 pointer-events-none grayscale')}`}>
                                                                                {item.isSecukupnya ? (
                                                                                    <div className="h-10 flex-1 flex items-center justify-center text-[10px] font-bold text-amber-700 italic uppercase tracking-wider">Secukupnya</div>
                                                                                ) : (
                                                                                    <>
                                                                                        <Input
                                                                                            type="number"
                                                                                            step="0.001"
                                                                                            disabled={!isKeringBesarActive}
                                                                                            className={`h-10 text-center text-sm font-semibold flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 no-spinner px-0 ${!isKeringBesarActive && 'text-muted-foreground'}`}
                                                                                            style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                                                                                            value={item.qtyBesar ? fBesar.value : ''}
                                                                                            onChange={(e) => {
                                                                                                const val = e.target.value === '' ? '' : denormalizeQty(parseFloat(e.target.value), fBesar.unit, item.unit);
                                                                                                updateIngredientKering(item.tempId, 'qtyBesar', val);
                                                                                            }}
                                                                                        />
                                                                                        <span className="text-xs text-muted-foreground w-12 font-semibold pr-1 break-keep">{fBesar.unit}</span>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </td>

                                                                        <td className="px-2 py-2">
                                                                            <div className={`flex items-center gap-1 p-1 rounded border transition-all ${item.isSecukupnya ? 'bg-amber-100/50 border-amber-200 opacity-60' : (isKeringKecilActive ? 'bg-muted/20 border-transparent hover:border-orange-200/50' : 'bg-muted/10 border-dashed border-muted-foreground/20 opacity-40 pointer-events-none grayscale')}`}>
                                                                                {item.isSecukupnya ? (
                                                                                    <div className="h-10 flex-1 flex items-center justify-center text-[10px] font-bold text-amber-700 italic uppercase tracking-wider">Secukupnya</div>
                                                                                ) : (
                                                                                    <>
                                                                                        <Input
                                                                                            type="number"
                                                                                            step="0.001"
                                                                                            disabled={!isKeringKecilActive}
                                                                                            className={`h-10 text-center text-sm font-semibold flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 no-spinner px-0 ${!isKeringKecilActive && 'text-muted-foreground'}`}
                                                                                            style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                                                                                            value={item.qtyKecil ? fKecil.value : ''}
                                                                                            onChange={(e) => {
                                                                                                const val = e.target.value === '' ? '' : denormalizeQty(parseFloat(e.target.value), fKecil.unit, item.unit);
                                                                                                updateIngredientKering(item.tempId, 'qtyKecil', val);
                                                                                            }}
                                                                                        />
                                                                                        <span className="text-xs text-muted-foreground w-12 font-semibold pr-1 break-keep">{fKecil.unit}</span>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </td>

                                                                        <td className="px-1 py-1">
                                                                            <div className={`flex items-center gap-2 p-1 rounded border ${item.isSecukupnya ? 'bg-amber-100 border-amber-300' : 'bg-orange-50/40 border-orange-300/30'}`}>
                                                                                <Input
                                                                                    type="text"
                                                                                    className={`h-12 text-center text-lg font-bold bg-transparent flex-1 border-none shadow-none focus-visible:ring-0 ${item.isSecukupnya ? 'text-amber-700' : 'text-orange-900'}`} style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                                                                                    value={item.isSecukupnya ? '∞' : (fTotal.value || '')}
                                                                                    readOnly
                                                                                />
                                                                                <span className={`text-xs font-bold w-12 pr-1 break-keep ${item.isSecukupnya ? 'text-amber-700' : 'text-orange-700'}`}>{fTotal.unit}</span>
                                                                            </div>
                                                                        </td>

                                                                        <td className="px-2 py-4 text-center"><X className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-red-500 transition-colors inline" onClick={() => removeIngredientKering(item.tempId)} /></td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 mt-4 border-t sticky bottom-0 bg-white py-4 shadow-[0_-10px_15px_-3px_rgba(255,255,255,1)] z-20">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
                                <Button type="submit" disabled={loading} className="min-w-[120px] bg-primary hover:bg-primary/90">
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Simpan Menu
                                </Button>
                            </div>
                        </form>
                    </TabsContent>

                    <TabsContent value="stock" className="space-y-4 pt-4 animate-in fade-in duration-300">
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
                            <Warehouse className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div className="space-y-1">
                                <h4 className="font-bold text-blue-800 text-sm">Informasi Ketersediaan Stok</h4>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    Tabel di bawah merangkum total kebutuhan bahan dari <b>Menu Masak</b> dan <b>Paket Kering</b> yang sedang Anda susun dibandingkan dengan stok yang tersedia di gudang saat ini.
                                </p>
                            </div>
                        </div>

                        <div className="border rounded-xl overflow-hidden bg-card">
                            <table className="w-full text-sm">
                                <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                                    <tr>
                                        <th className="px-2 py-2 text-left">Nama Bahan Baku</th>
                                        <th className="px-2 py-2 text-center">Total Dibutuhkan</th>
                                        <th className="px-2 py-2 text-center">Stok Gudang</th>
                                        <th className="px-2 py-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {(() => {
                                        const summary: Record<string, { name: string, unit: string, req: number, stock: number, isSecukupnya: boolean }> = {};
                                        [...ingredientsOmpreng, ...ingredientsKering].forEach(ing => {
                                            if (!ing.name.trim()) return;
                                            const key = ing.name.toLowerCase().trim();
                                            if (!summary[key]) {
                                                summary[key] = { name: ing.name, unit: ing.unit, req: 0, stock: Number(ing.currentStock) || 0, isSecukupnya: false };
                                            }
                                            if (ing.isSecukupnya) {
                                                summary[key].isSecukupnya = true;
                                            } else {
                                                summary[key].req += Number(ing.qty) || 0;
                                            }
                                        });

                                        const items = Object.values(summary);
                                        if (items.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground italic">
                                                        Belum ada bahan yang ditambahkan.
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return items.map((item, idx) => {
                                            const isShortage = !item.isSecukupnya && item.stock < item.req;
                                            return (
                                                <tr key={idx} className={`hover:bg-muted/30 transition-colors ${item.isSecukupnya ? 'bg-amber-50/20' : ''}`}>
                                                    <td className="px-2 py-2 font-semibold text-foreground flex items-center gap-2">
                                                        {item.isSecukupnya && <Zap className="h-3 w-3 text-amber-500" />}
                                                        {item.name}
                                                    </td>
                                                    <td className="px-2 py-2 text-center font-bold text-primary">
                                                        {item.isSecukupnya ? (
                                                            <span className="text-amber-600 italic">Secukupnya</span>
                                                        ) : (
                                                            <>{item.req.toLocaleString('id-ID')} <span className="text-[10px] font-normal text-muted-foreground">{item.unit}</span></>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-2 text-center font-bold">
                                                        {item.stock.toLocaleString('id-ID')} <span className="text-[10px] font-normal text-muted-foreground">{item.unit}</span>
                                                    </td>
                                                    <td className="px-2 py-2 text-center">
                                                        {item.isSecukupnya ? (
                                                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 font-bold text-[10px] px-2 py-0.5 uppercase">
                                                                Cek Manual
                                                            </Badge>
                                                        ) : item.req === 0 ? (
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px] px-2 py-0.5 uppercase">
                                                                Isi Manual
                                                            </Badge>
                                                        ) : isShortage ? (
                                                            <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200 font-black text-[10px] px-2 py-0.5 uppercase">
                                                                Kurang {(item.req - item.stock).toLocaleString('id-ID')}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold text-[10px] px-2 py-0.5 uppercase">
                                                                Mencukupi
                                                            </Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </TabsContent>
                </Tabs >
            </DialogContent >

            <RecipeSelectionDialog open={isRecipeOpen} onOpenChange={setIsRecipeOpen} onSelect={handleSelectRecipe} />
            <HistorySelectionDialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen} onSelect={handleSelectHistory} filterType={historyFilterType} />
        </Dialog >
    );
}
