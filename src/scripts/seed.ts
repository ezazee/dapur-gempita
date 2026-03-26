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
import fs from 'fs';
import path from 'path';

// --- Configuration ---
const MENU_DIR = path.resolve(process.cwd(), 'menu-txt');

// --- Helper for string matching ---
function normalizeStr(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// --- Ingredient Name Normalizer ---
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

// --- Mapping ingredient names to Standard Inventory Names and units ---
function mapIngredient(rawName: string): { name: string, unit: string } | null {
    const raw = rawName.toLowerCase();
    
    if (raw === 'energi' || raw === 'protein' || raw === 'lemak' || raw.includes('karbohidrat') || raw === 'kalori') return null;

    if (raw.includes('daging') || raw.includes('sapi')) return { name: 'Daging Sapi Has Dalam', unit: 'kg' };
    if (raw.includes('ayam')) return { name: 'Ayam Potong', unit: 'kg' };
    if (raw.includes('putih') && raw.includes('bawang')) return { name: 'Bawang Putih', unit: 'siung' };
    if (raw.includes('bombai') || raw.includes('bombay')) return { name: 'Bawang Bombai', unit: 'buah' };
    if (raw.includes('merah') && raw.includes('bawang')) return { name: 'Bawang Merah', unit: 'siung' };
    if (raw.includes('margarin') || raw.includes('mentega')) return { name: 'Margarin', unit: 'liter' };
    if (raw.includes('kecap inggris')) return { name: 'Kecap Inggris', unit: 'liter' };
    if (raw.includes('kecap manis')) return { name: 'Kecap Manis', unit: 'liter' };
    if (raw.includes('kecap asin')) return { name: 'Kecap Asin', unit: 'liter' };
    if (raw.includes('tomat') && !raw.includes('saus')) return { name: 'Tomat', unit: 'buah' };
    if (raw.includes('saus tomat')) return { name: 'Saus Tomat', unit: 'liter' };
    if (raw.includes('wortel')) return { name: 'Wortel', unit: 'kg' };
    if (raw.includes('buncis')) return { name: 'Buncis', unit: 'kg' };
    if (raw.includes('kentang')) return { name: 'Kentang', unit: 'kg' };
    if (raw.includes('telur') || raw.includes('telor')) return { name: 'Telor Ayam', unit: 'butir' };
    if (raw.includes('beras')) return { name: 'Beras Premium', unit: 'kg' };
    if (raw.includes('ikan dori') || raw.includes('dori')) return { name: 'Ikan Dori Fillet', unit: 'kg' };
    if (raw.includes('daun jeruk')) return { name: 'Daun Jeruk', unit: 'lembar' };
    if (raw.includes('daun salam')) return { name: 'Daun Salam', unit: 'lembar' };
    if (raw.includes('daun pandan')) return { name: 'Daun Pandan', unit: 'lembar' };
    if (raw.includes('daun bawang')) return { name: 'Daun Bawang', unit: 'batang' };
    if (raw.includes('seledri')) return { name: 'Seledri', unit: 'ikat' };
    if (raw.includes('terigu') || raw.includes('gandum')) return { name: 'Tepung Terigu', unit: 'kg' };
    if (raw.includes('roti') && raw.includes('tepung')) return { name: 'Tepung Roti', unit: 'kg' };
    if (raw.includes('maizena')) return { name: 'Tepung Maizena', unit: 'kg' };
    if (raw.includes('tempe')) return { name: 'Tempe', unit: 'kg' };
    if (raw.includes('tahu')) return { name: 'Tahu', unit: 'buah' };
    if (raw.includes('santan')) return { name: 'Santan', unit: 'liter' };
    if (raw.includes('ikan nila') || raw.includes('nila')) return { name: 'Ikan Nila', unit: 'kg' };
    if (raw.includes('ikan patin') || raw.includes('patin')) return { name: 'Ikan Patin', unit: 'kg' };
    if (raw.includes('ikan gabus') || raw.includes('gabus')) return { name: 'Ikan Gabus', unit: 'kg' };
    if (raw.includes('ikan lele') || raw.includes('lele')) return { name: 'Ikan Lele', unit: 'kg' };
    if (raw.includes('ikan kembung') || raw.includes('kembung')) return { name: 'Ikan Kembung', unit: 'kg' };
    if (raw.includes('ikan tuna') || raw.includes('tuna')) return { name: 'Ikan Tuna', unit: 'kg' };
    if (raw.includes('ikan asin')) return { name: 'Ikan Asin', unit: 'kg' };
    if (raw.includes('bandeng')) return { name: 'Ikan Bandeng', unit: 'kg' };
    if (raw.includes('cabai') || raw.includes('cabe')) return { name: 'Cabai', unit: 'kg' };
    if (raw.includes('garam') || raw.includes('sea salt')) return { name: 'Garam', unit: 'kg' };
    if (raw.includes('gula')) return { name: 'Gula', unit: 'kg' };
    if (raw.includes('merica') || raw.includes('lada')) return { name: 'Merica Bubuk', unit: 'kg' };
    if (raw.includes('ketumbar')) return { name: 'Ketumbar', unit: 'kg' };
    if (raw.includes('kunyit')) return { name: 'Kunyit', unit: 'kg' };
    if (raw.includes('jahe')) return { name: 'Jahe', unit: 'kg' };
    if (raw.includes('lengkuas') || raw.includes('laos')) return { name: 'Lengkuas', unit: 'kg' };
    if (raw.includes('serai') || raw.includes('sereh')) return { name: 'Serai', unit: 'batang' };
    if (raw.includes('minyak')) return { name: 'Minyak Goreng', unit: 'liter' };
    if (raw.includes('air') && !raw.includes('jeruk') && !raw.includes('asam')) return { name: 'Air', unit: 'liter' };
    if (raw.includes('asam jawa')) return { name: 'Asam Jawa', unit: 'kg' };
    if (raw.includes('jeruk nipis')) return { name: 'Jeruk Nipis', unit: 'buah' };
    if (raw.includes('kemiri')) return { name: 'Kemiri', unit: 'butir' };
    if (raw.includes('pala')) return { name: 'Pala', unit: 'butir' };
    if (raw.includes('cengkeh')) return { name: 'Cengkeh', unit: 'butir' };
    if (raw.includes('kayu manis')) return { name: 'Kayu Manis', unit: 'batang' };
    if (raw.includes('kacang tanah')) return { name: 'Kacang Tanah', unit: 'kg' };
    if (raw.includes('kacang panjang')) return { name: 'Kacang Panjang', unit: 'kg' };
    if (raw.includes('susu')) return { name: 'Susu', unit: 'liter' };
    if (raw.includes('keju')) return { name: 'Keju', unit: 'kg' };
    if (raw.includes('kaldu')) return { name: 'Kaldu Bubuk', unit: 'kg' };
    if (raw.includes('terasi')) return { name: 'Terasi', unit: 'kg' };
    if (raw.includes('daun talas')) return { name: 'Daun Talas', unit: 'lembar' };
    if (raw.includes('labu')) return { name: 'Labu', unit: 'kg' };
    if (raw.includes('lontong')) return { name: 'Lontong', unit: 'buah' };
    if (raw.includes('kerupuk')) return { name: 'Kerupuk', unit: 'kg' };
    if (raw.includes('kangkung')) return { name: 'Kangkung', unit: 'ikat' };
    if (raw.includes('daun singkong')) return { name: 'Daun Singkong', unit: 'ikat' };

    const nameMatch = rawName.split(',')[0].split(/\d/)[0].toLowerCase();
    let cleaned = nameMatch
        .replace(/\b(?:juga|untuk|atau|dibakar|direbus|digoreng|secukupnya|opsional|satu|dua|tiga|porsi|genggam|bungkus|kecil|besar)\b/g, '')
        .replace(/[^a-z\s]/g, '')
        .trim();
    if (!cleaned || cleaned.length > 25) return null;
    const titleCased = cleaned.replace(/\b\w/g, l => l.toUpperCase());
    return { name: titleCased, unit: 'kg' };
}

// --- Parse Quantity and Unit Strings from Text ---
function parseQuantity(line: string, mappedUnit: string) {
    let amt = 0;
    let isSecukupnya = false;

    if (line.toLowerCase().includes('secukupnya')) {
        isSecukupnya = true;
    }

    const match = line.match(/(\d+\/\d+|\d+(?:[.,]\d+)?|½|¼|¾)\s*(sdm|sdt|kg|gram|gr\b|g\b|ml|liter|lit|l\b|buah|biji|butir|siung|lembar|ikat|batang|ruas|cm)/i);
    if (!match && !isSecukupnya) {
        return { qtyBase: 0, isSecukupnya: true };
    }

    if (match) {
        let valRaw = match[1].replace(',', '.');
        if (valRaw === '½') amt = 0.5;
        else if (valRaw === '¼') amt = 0.25;
        else if (valRaw === '¾') amt = 0.75;
        else if (valRaw.includes('/')) {
            const parts = valRaw.split('/');
            amt = parseFloat(parts[0]) / parseFloat(parts[1]);
        }
        else amt = parseFloat(valRaw);

        if (isNaN(amt)) amt = 1;

        const u = match[2].toLowerCase();
        
        if (u === 'sdm') amt = amt * 0.015;
        else if (u === 'sdt') amt = amt * 0.005;
        else if (u === 'gram' || u === 'gr' || u === 'g' || u === 'ml') amt = amt * 0.001;
        else if (mappedUnit === 'kg' && (u === 'buah' || u === 'biji')) amt = amt * 0.01;
        else if (mappedUnit === 'kg' && u === 'siung') amt = amt * 0.01;
        else if (mappedUnit === 'kg' && u === 'lembar') amt = amt * 0.002;
    }

    if (mappedUnit === 'kg' && amt > 5) {
        amt = amt / 1000;
    }

    return { qtyBase: amt, isSecukupnya };
}

// --- Main Parser Function for a single TXT file ---
function parseMenuFile(filePath: string) {
    const text = fs.readFileSync(filePath, 'utf-8');
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    let name = lines[0].match(/^\d+\s*[-—]\s*(.+)$/)?.[1]?.trim() || lines[0];
    let calories = 0, carbs = 0, protein = 0, fat = 0;
    let ingredients = [];
    let basePortion = 1;
    let inIngredientSection = false;
    let inCookingSection = false;
    let cookingSteps = [];

    // Extract Nutrients & Steps
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const low = line.toLowerCase();

        // Detect Nutrients
        const valMatch = low.match(/([\d,]+)/);
        if (valMatch) {
            const val = parseFloat(valMatch[1].replace(',', '.'));
            if (low.includes('energi') || low.includes('kalori')) calories = val;
            else if (low.includes('protein')) protein = val;
            else if (low.includes('lemak')) fat = val;
            else if (low.includes('karbohidrat') || low.includes('karbo')) carbs = val;
        }

        // Section Detection
        if (low.startsWith('cara memasak') || low.startsWith('langkah') || low.includes('instruksi')) {
            inCookingSection = true;
            inIngredientSection = false;
            continue;
        }
        if (low.startsWith('kandungan gizi') || low.startsWith('kandungan')) {
            inIngredientSection = false;
            inCookingSection = false;
            continue;
        }
        if (low.includes('bahan-bahan') || low.includes('bahan (') || low.includes('bumbu') || low.includes('saus') || low.includes('pelengkap')) {
            inIngredientSection = true;
            inCookingSection = false;
            if (low.includes('porsi')) {
                const pMatch = low.match(/(?:\d+\s*[-–]\s*)?(\d+)\s*porsi/);
                if (pMatch) basePortion = parseInt(pMatch[1]) || 1;
            }
            continue;
        }

        // Action
        if (inIngredientSection && (line.startsWith('•') || line.startsWith('-'))) {
            const textIng = line.replace(/^[•-]/, '').trim();
            const mappedIng = mapIngredient(textIng);
            if (mappedIng) {
                const { qtyBase, isSecukupnya } = parseQuantity(textIng, mappedIng.unit);
                ingredients.push({
                    name: mappedIng.name,
                    unit: mappedIng.unit,
                    qtyBesar: isSecukupnya ? 0 : qtyBase,
                    isSecukupnya
                });
            }
        } else if (inCookingSection) {
            if (!line.includes('====')) cookingSteps.push(line);
        }
    }

    let description = cookingSteps.join('\n').trim();
    if (!description) description = `Masakan ${name} kaya akan rempah khas Nusantara.`;

    return { name, description, basePortion, calories, carbs, protein, fat, ingredients };
}

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
        ], { individualHooks: true });

        // 3. Scan & Parse Menus from TXT
        if (!fs.existsSync(MENU_DIR)) {
            throw new Error(`Directory ${MENU_DIR} not found!`);
        }
        const files = fs.readdirSync(MENU_DIR).filter(f => f.endsWith('.txt'));
        const recipesData = files.map(f => parseMenuFile(path.join(MENU_DIR, f)));

        // 4. Collect & Seed All Ingredients
        const ingredientMap = new Map();
        
        // Baseline Stocks
        const baseline = [
            { name: 'Daging Sapi Has Dalam', unit: 'kg' },
            { name: 'Ayam Potong', unit: 'kg' },
            { name: 'Bawang Putih', unit: 'siung' },
            { name: 'Bawang Merah', unit: 'siung' },
            { name: 'Beras Premium', unit: 'kg' },
            { name: 'Minyak Goreng', unit: 'liter' },
            { name: 'Garam', unit: 'kg' },
            { name: 'Gula', unit: 'kg' },
        ];
        baseline.forEach(b => {
             ingredientMap.set(getCleanName(b.name), {
                id: uuidv4(),
                name: getCleanName(b.name),
                unit: b.unit,
                currentStock: 100,
                minimumStock: 10
            });
        });

        // Add from parsed files
        for (const recipe of recipesData) {
            for (const ing of recipe.ingredients) {
                const cName = getCleanName(ing.name);
                if (!ingredientMap.has(cName)) {
                    ingredientMap.set(cName, {
                        id: uuidv4(),
                        name: cName,
                        unit: ing.unit || 'kg',
                        currentStock: 100,
                        minimumStock: 10
                    });
                }
            }
        }

        const insertedIngredients = await Ingredient.bulkCreate(Array.from(ingredientMap.values()));
        const dbIngMap = new Map();
        insertedIngredients.forEach(i => dbIngMap.set(i.name, i.id));

        // 5. Seed Recipes & RecipeIngredients
        for (const data of recipesData) {
            const rId = uuidv4();
            await Recipe.create({
                id: rId,
                name: data.name,
                description: data.description,
                portionSize: 1,
                calories: data.calories || 0,
                carbs: data.carbs || 0,
                protein: data.protein || 0,
                fat: data.fat || 0,
                createdBy: giziId
            });

            const recipeIngsMap = new Map();
            for (const ing of data.ingredients) {
                const cName = getCleanName(ing.name);
                const iId = dbIngMap.get(cName);
                if (!iId) continue;

                const portion = data.basePortion > 0 ? data.basePortion : 1;
                const qtyPerPax = (ing.qtyBesar || 0) / portion;

                if (recipeIngsMap.has(iId)) {
                    const existing = recipeIngsMap.get(iId);
                    existing.qtyBesar += qtyPerPax;
                    existing.qtyKecil += qtyPerPax * 0.7;
                    existing.qtyBumil += qtyPerPax * 1.25;
                    existing.qtyBalita += qtyPerPax * 0.5;
                } else {
                    recipeIngsMap.set(iId, {
                        recipeId: rId,
                        ingredientId: iId,
                        qtyBesar: qtyPerPax,
                        qtyKecil: qtyPerPax * 0.7,
                        qtyBumil: qtyPerPax * 1.25,
                        qtyBalita: qtyPerPax * 0.5,
                        isSecukupnya: !!ing.isSecukupnya
                    });
                }
            }
            await RecipeIngredient.bulkCreate(Array.from(recipeIngsMap.values()));
        }

        console.log(`Successfully parsed ${files.length} TXT files and seeded everything!`);
        process.exit(0);
    } catch (e: any) {
        console.error('Unified Seed Error:', e);
        process.exit(1);
    }
}

main();
