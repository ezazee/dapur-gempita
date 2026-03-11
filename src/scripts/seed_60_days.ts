
import 'dotenv/config';
import {
    sequelize,
    Menu,
    Production,
    MenuIngredient,
    Ingredient
} from '../models';
import { v4 as uuidv4 } from 'uuid';
import { subDays, startOfDay, addHours } from 'date-fns';

const PHOTO_PATHS = [
    'C:/Users/KBN Digital/.gemini/antigravity/brain/4c8ea299-cafd-4c81-b3f4-55fac7664690/food_sample_1_1773032449267.png',
    'C:/Users/KBN Digital/.gemini/antigravity/brain/4c8ea299-cafd-4c81-b3f4-55fac7664690/food_sample_2_1773032463926.png',
    'C:/Users/KBN Digital/.gemini/antigravity/brain/4c8ea299-cafd-4c81-b3f4-55fac7664690/food_sample_3_1773032478469.png'
];

const DISH_NAMES = [
    "Rendang Sapi", "Sate Ayam Madura", "Ikan Bakar Jimbaran", "Opor Ayam",
    "Gado-Gado", "Soto Betawi", "Pepes Ikan", "Ayam Goreng Kalasan",
    "Sayur Asem", "Tumis Kangkung Belacan", "Nasi Goreng Spesial",
    "Mie Goreng Jawa", "Capcay Seafood", "Semur Daging", "Tongseng Kambing"
];

const KERING_NAMES = [
    "Snack & Buah", "Bubur Kacang Hijau", "Kolak Pisang", "Kue Tradisional",
    "Roti Isi", "Puding Susu", "Buah Potong Segar"
];

const EVAL_NOTES = [
    "Rasa sangat enak, bumbu meresap.",
    "Porsi pas, presentasi bagus.",
    "Kurang sedikit garam di sayur.",
    "Daging agak keras hari ini.",
    "Sangat memuaskan, anak-anak suka.",
    "Bumbu terlalu pedas untuk balita.",
    "Sempurna!",
    "Bahan-bahan segar sekali."
];

async function seed() {
    try {
        await sequelize.authenticate();
        const userId = '559440ce-6d5b-4bc0-8b18-f6bfc8ed221d';
        const ingredients = await Ingredient.findAll();

        if (ingredients.length === 0) {
            console.error('No ingredients found. Please run baseline seed first.');
            process.exit(1);
        }

        // First, clear existing menus in the 60-day window to avoid duplicates if re-run
        const sixtyDaysAgo = subDays(new Date(), 60);

        for (let i = 0; i < 60; i++) {
            const date = subDays(new Date(), i);
            const menuDate = startOfDay(date);

            const numMenus = Math.random() > 0.3 ? 2 : 1;

            for (let j = 0; j < numMenus; j++) {
                const isOmpreng = j === 0 || (numMenus === 1 && Math.random() > 0.5);
                const type = isOmpreng ? 'OMPRENG' : 'KERING';
                const name = isOmpreng
                    ? DISH_NAMES[Math.floor(Math.random() * DISH_NAMES.length)]
                    : KERING_NAMES[Math.floor(Math.random() * KERING_NAMES.length)];

                const countKecil = Math.floor(Math.random() * 150) + 50;
                const countBesar = Math.floor(Math.random() * 100) + 50;
                const countBumil = Math.floor(Math.random() * 50) + 10;
                const countBalita = Math.floor(Math.random() * 50) + 10;
                const totalPortions = countKecil + countBesar + countBumil + countBalita;

                const isEvaluated = Math.random() > 0.2;
                const rating = isEvaluated ? Math.floor(Math.random() * 3) + 3 : undefined;
                const evaluation = isEvaluated ? EVAL_NOTES[Math.floor(Math.random() * EVAL_NOTES.length)] : undefined;

                const menuId = uuidv4();
                await Menu.create({
                    id: menuId,
                    name: name,
                    menuType: type,
                    menuDate: menuDate,
                    description: `Menu harian: ${name}. Bergizi dan lezat.`,
                    countKecil,
                    countBesar,
                    countBumil,
                    countBalita,
                    createdBy: userId,
                    evaluatorId: isEvaluated ? userId : undefined,
                    rating,
                    evaluation,
                    createdAt: addHours(menuDate, 6),
                    updatedAt: addHours(menuDate, (isEvaluated ? 15 : 6))
                });

                const prodId = uuidv4();
                await Production.create({
                    id: prodId,
                    menuId: menuId,
                    productionDate: addHours(menuDate, 10),
                    countKecil,
                    countBesar,
                    countBumil,
                    countBalita,
                    totalPortions,
                    note: "Proses masak standar.",
                    photoUrl: PHOTO_PATHS[Math.floor(Math.random() * PHOTO_PATHS.length)],
                    createdBy: userId,
                    createdAt: addHours(menuDate, 10),
                    updatedAt: addHours(menuDate, 10)
                });

                const numIngs = Math.floor(Math.random() * 3) + 3;
                const selectedIngs = [...ingredients].sort(() => 0.5 - Math.random()).slice(0, numIngs);

                for (const ing of selectedIngs) {
                    const status = isEvaluated
                        ? (Math.random() > 0.8 ? (Math.random() > 0.5 ? 'KURANG' : 'BERLEBIH') : 'PAS')
                        : undefined;

                    await MenuIngredient.create({
                        id: uuidv4(),
                        menuId,
                        ingredientId: ing.id,
                        qtyNeeded: Math.random() * 10 + 1,
                        gramasi: Math.random() * 50 + 50,
                        evaluationStatus: status as any,
                        evaluationNote: status === 'PAS' ? '' : 'Butuh penyesuaian stok.',
                        createdAt: addHours(menuDate, 6),
                        updatedAt: addHours(menuDate, (isEvaluated ? 15 : 6))
                    });
                }
            }

            if (i % 10 === 0) console.log(`Seeded day ${i}...`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
}

seed();
