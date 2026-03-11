import 'dotenv/config';
import {
    sequelize,
    Role,
    User,
    Ingredient,
    Recipe,
    RecipeIngredient
} from '../models';
import { v4 as uuidv4 } from 'uuid';

// --- Cleaning Logic ---
function getCleanName(originalName: string): string {
    let name = originalName.toLowerCase().trim();
    name = name.replace(/\s*\([^)]+\)/g, '').trim();
    if (name.includes(',')) name = name.split(',')[0].trim();

    const stripPhrases = [
        'untuk mengungkep', 'hangat', 'panas', 'dingin', 'matang', 'rebus',
        'cincang kasar', 'cincang halus', 'iris tipis', 'memarkan', 'dihaluskan',
        'seduh air panas'
    ];
    for (const phrase of stripPhrases) {
        if (name.endsWith(` ${phrase}`)) name = name.replace(` ${phrase}`, '').trim();
    }
    return name.charAt(0).toUpperCase() + name.slice(1);
}

// --- Data Helpers ---
const sdm = (val: number) => Math.round(val * 0.015 * 1000) / 1000;
const sdt = (val: number) => Math.round(val * 0.005 * 1000) / 1000;
const gram = (val: number) => Math.round(val * 0.001 * 1000) / 1000;
const ml = (val: number) => Math.round(val * 0.001 * 1000) / 1000;

async function main() {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ force: true });
        // 1. Seed Roles
        await Role.bulkCreate([
            { id: 1, name: 'SUPER_ADMIN' },
            { id: 2, name: 'AHLI_GIZI' },
            { id: 3, name: 'KEUANGAN' },
            { id: 4, name: 'ASLAP' },
            { id: 5, name: 'CHEF' },
            { id: 6, name: 'KEPALA_DAPUR' }
        ]);

        // 2. Seed Users
        const giziId = uuidv4();
        await User.bulkCreate([
            { id: uuidv4(), roleId: 1, email: "admin@gempita.id", password: "admin123", name: "Admin Utama" },
            { id: giziId, roleId: 2, email: "gizi@gempita.id", password: "gizi1234", name: "Ahli Gizi" },
            { roleId: 3, email: "keuangan@gempita.id", password: "pembeli1", name: "Bagian Keuangan" },
            { roleId: 4, email: "aslap@gempita.id", password: "aslap123", name: "Aslap (Asisten Lapangan)" },
            { id: uuidv4(), roleId: 5, email: "chef@gempita.id", password: "chef1234", name: "Juru Masak" },
            { roleId: 6, email: "kepala@gempita.id", password: "kepala12", name: "Kepala Dapur" },
        ]);

        // 3. Seed Ingredients (Stocks)
        const rawIngredients = [
            { name: 'Daging Sapi Has Dalam', unit: 'kg', currentStock: 50, minimumStock: 10 },
            { name: 'Bawang Putih', unit: 'siung', currentStock: 50, minimumStock: 10 },
            { name: 'Bawang Bombai', unit: 'buah', currentStock: 50, minimumStock: 10 },
            { name: 'Margarin', unit: 'liter', currentStock: 5, minimumStock: 1 },
            { name: 'Kecap Manis', unit: 'liter', currentStock: 10, minimumStock: 2 },
            { name: 'Kecap Inggris', unit: 'liter', currentStock: 2, minimumStock: 0.5 },
            { name: 'Tomat', unit: 'buah', currentStock: 50, minimumStock: 10 },
            { name: 'Wortel', unit: 'kg', currentStock: 50, minimumStock: 10 },
            { name: 'Buncis', unit: 'kg', currentStock: 50, minimumStock: 10 },
            { name: 'Kentang', unit: 'kg', currentStock: 50, minimumStock: 10 },
            { name: 'Telor Ayam', unit: 'butir', currentStock: 500, minimumStock: 100 },
            { name: 'Beras Premium', unit: 'kg', currentStock: 250, minimumStock: 50 },
            { name: 'Ikan Dori Fillet', unit: 'kg', currentStock: 50, minimumStock: 10 },
            { name: 'Daun Jeruk', unit: 'lembar', currentStock: 100, minimumStock: 20 },
            { name: 'Tepung Terigu', unit: 'kg', currentStock: 10, minimumStock: 2 },
            { name: 'Tepung Roti', unit: 'kg', currentStock: 10, minimumStock: 2 },
            { name: 'Tempe', unit: 'kg', currentStock: 50, minimumStock: 10 },
            { name: 'Ayam Potong', unit: 'kg', currentStock: 100, minimumStock: 20 },
            { name: 'Santan', unit: 'liter', currentStock: 20, minimumStock: 5 },
            { name: 'Ikan Nila', unit: 'kg', currentStock: 50, minimumStock: 15 },
        ];

        const cleanedIngredients = rawIngredients.map(ing => ({
            ...ing,
            id: uuidv4(),
            name: getCleanName(ing.name)
        }));

        const ingredients = await Ingredient.bulkCreate(cleanedIngredients);

        const findIng = (name: string) => {
            const clean = getCleanName(name);
            const i = ingredients.find(ing => ing.name === clean);
            if (!i) throw new Error("Ingredient not found: " + clean);
            return i;
        };

        // 4. Seed Recipes (Baseline Examples)
        const recipesData = [
            {
                name: 'Selat Solo Bhayangkari',
                description: `Masak daging hingga empuk dengan bumbu kecap. Sajikan dengan wortel, buncis, dan kentang.`,
                createdBy: giziId, portionSize: 1, calories: 640.6, carbs: 49, protein: 16.6, fat: 43.8,
                ings: [
                    { name: 'Daging Sapi Has Dalam', qty: 0.05 },
                    { name: 'Bawang Putih', qty: 0.3 },
                    { name: 'Margarin', qty: sdm(0.5) },
                    { name: 'Kecap Manis', qty: sdm(0.5) },
                    { name: 'Wortel', qty: 0.013 },
                    { name: 'Buncis', qty: 0.013 },
                    { name: 'Kentang', qty: 0.025 },
                ]
            },
            {
                name: 'Nasi Daun Jeruk Dori',
                description: `Nasi aromatik daun jeruk dengan dori krispi.`,
                createdBy: giziId, portionSize: 1, calories: 596.9, carbs: 89.6, protein: 19.5, fat: 18.2,
                ings: [
                    { name: 'Beras Premium', qty: 0.15 },
                    { name: 'Ikan Dori Fillet', qty: 0.15 },
                    { name: 'Daun Jeruk', qty: 2 },
                    { name: 'Tepung Terigu', qty: sdm(1) },
                    { name: 'Telor Ayam', qty: 1 },
                ]
            }
        ];

        for (const data of recipesData) {
            const rId = uuidv4();
            await Recipe.create({
                id: rId,
                name: data.name,
                description: data.description,
                portionSize: data.portionSize,
                calories: data.calories,
                carbs: data.carbs,
                protein: data.protein,
                fat: data.fat,
                createdBy: data.createdBy
            });

            const recipeIngredients = data.ings.map(ing => ({
                recipeId: rId,
                ingredientId: findIng(ing.name).id,
                qtyBesar: ing.qty,
                qtyKecil: ing.qty * 0.7,
                qtyBumil: ing.qty * 1.25,
                qtyBalita: ing.qty * 0.5
            }));

            await RecipeIngredient.bulkCreate(recipeIngredients);
        }

        process.exit(0);
    } catch (e: any) {
        console.error('Seed Error:', e);
        process.exit(1);
    }
}

main();
