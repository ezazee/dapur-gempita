import { NextResponse } from 'next/server';
import { sequelize } from '@/lib/sequelize';
import '@/models'; // Force load all models and associations so sync creates all tables correctly
import { User, Role, Ingredient, Recipe, RecipeIngredient, Menu, MenuIngredient } from '@/models';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    // SECURITY: Only allow in development mode or with a secret token
    const { searchParams } = new URL(request.url);
    const secretToken = searchParams.get('token');
    const isDev = process.env.NODE_ENV === 'development';
    const isValidToken = secretToken === process.env.API_SECRET_TOKEN;

    if (!isDev && !isValidToken) {
        return NextResponse.json({ error: 'Unauthorized. This action is restricted to development or requires a valid secret token.' }, { status: 401 });
    }

    try {
        await sequelize.authenticate();
        // WARNING: This WIPES all data!
        await sequelize.sync({ force: true });

        // --- 1. Seed Roles ---
        const rolesData = [
            { id: 1, name: 'SUPER_ADMIN' },
            { id: 2, name: 'AHLI_GIZI' },
            { id: 3, name: 'KEUANGAN' },
            { id: 4, name: 'ASLAP' },
            { id: 5, name: 'CHEF' },
            { id: 6, name: 'KEPALA_DAPUR' }
        ];
        await Role.bulkCreate(rolesData);
        // --- 2. Seed Users (with Fixed IDs for linking) ---
        const adminId = uuidv4();
        const giziId = uuidv4();
        const chefId = uuidv4();

        const demoUsers = [
            { id: adminId, roleId: 1, email: "admin@gempita.id", password: "admin123", name: "Admin Utama" },
            { id: giziId, roleId: 2, email: "gizi@gempita.id", password: "gizi1234", name: "Ahli Gizi" },
            { roleId: 3, email: "keuangan@gempita.id", password: "pembeli1", name: "Keuangan" },
            { roleId: 4, email: "aslap@gempita.id", password: "aslap123", name: "Aslap (Asisten Lapangan)" },
            { id: chefId, roleId: 5, email: "chef@gempita.id", password: "chef1234", name: "Chef Dapur" },
            { roleId: 6, email: "kepala@gempita.id", password: "kepala12", name: "Kepala Dapur" },
        ];
        await User.bulkCreate(demoUsers as any, { individualHooks: true });
        // --- 3. Seed Ingredients ---
        const berasId = uuidv4();
        const telurId = uuidv4();
        const kecapId = uuidv4();
        const ayamId = uuidv4();

        await Ingredient.bulkCreate([
            { id: berasId, name: 'Beras Premium', unit: 'kg', minimumStock: 50, currentStock: 100 },
            { id: telurId, name: 'Telur Ayam', unit: 'butir', minimumStock: 100, currentStock: 50 },
            { id: kecapId, name: 'Kecap Manis', unit: 'liter', minimumStock: 20, currentStock: 40 },
            { id: ayamId, name: 'Daging Ayam', unit: 'kg', minimumStock: 10, currentStock: 25 },
            { name: 'Garam', unit: 'kg', minimumStock: 5, currentStock: 10 },
            { name: 'Minyak Goreng', unit: 'liter', minimumStock: 20, currentStock: 30 },
        ]);
        // --- 4. SCENARIO: RECIPES (KAMUS RESEP) ---
        // Create standard recipes (SOP) that match the kinds of meals served

        const standardRecipes = [
            {
                name: "Nasi Goreng Spesial",
                desc: "Resep standar Ahli Gizi. Rasa seimbang.",
                cal: 450.5, carbs: 65.2, protein: 18.5, fat: 12.0,
                ings: [
                    { id: berasId, qty: 0.15 },
                    { id: telurId, qty: 1 },
                    { id: kecapId, qty: 0.02 },
                    { id: ayamId, qty: 0.1 },
                ]
            },
            {
                name: "Sop Ayam Kampung",
                desc: "Kuah bening, kaya gizi.",
                cal: 320.0, carbs: 10.5, protein: 25.0, fat: 15.0,
                ings: [
                    { id: ayamId, qty: 0.15 },
                    { id: telurId, qty: 0.5 },
                ]
            },
            {
                name: "Ayam Bakar Madu",
                desc: "Manis gurih, dibakar empuk.",
                cal: 400.0, carbs: 20.0, protein: 30.0, fat: 18.0,
                ings: [
                    { id: ayamId, qty: 0.2 },
                    { id: kecapId, qty: 0.03 },
                ]
            },
            {
                name: "Tumis Kangkung",
                desc: "Sayuran segar dengan sedikit udang rebon.",
                cal: 150.0, carbs: 15.0, protein: 5.0, fat: 8.0,
                ings: [
                    { id: telurId, qty: 0.5 }, // maybe puyuh eggs?
                    { id: kecapId, qty: 0.01 },
                ]
            },
            {
                name: "Ayam Kecap Pedas",
                desc: "Ayam potong dadu bumbu kecap manis pedas.",
                cal: 380.0, carbs: 25.0, protein: 28.0, fat: 16.0,
                ings: [
                    { id: ayamId, qty: 0.18 },
                    { id: kecapId, qty: 0.05 },
                ]
            },
            {
                name: "Nasi Uduk",
                desc: "Gurih bersantan dengan lauk telur iris.",
                cal: 480.0, carbs: 70.0, protein: 12.0, fat: 14.0,
                ings: [
                    { id: berasId, qty: 0.15 },
                    { id: telurId, qty: 1 },
                ]
            },
            {
                name: "Telur Balado",
                desc: "Telur rebus bumbu merah pedas.",
                cal: 250.0, carbs: 8.0, protein: 12.0, fat: 16.0,
                ings: [
                    { id: telurId, qty: 2 },
                ]
            },
            {
                name: "Soto Ayam Bening",
                desc: "Kuah soto ringan tanpa santan.",
                cal: 300.0, carbs: 15.0, protein: 22.0, fat: 10.0,
                ings: [
                    { id: ayamId, qty: 0.12 },
                    { id: telurId, qty: 0.5 },
                ]
            },
            {
                name: "Mie Goreng Jawa",
                desc: "Mie telur dengan sayuran dan suwiran ayam.",
                cal: 420.0, carbs: 60.0, protein: 15.0, fat: 13.0,
                ings: [
                    { id: telurId, qty: 1 },
                    { id: ayamId, qty: 0.08 },
                    { id: kecapId, qty: 0.03 },
                ]
            },
            {
                name: "Opor Ayam",
                desc: "Ayam kuah santan kuning kental.",
                cal: 450.0, carbs: 12.0, protein: 26.0, fat: 28.0,
                ings: [
                    { id: ayamId, qty: 0.2 },
                    { id: telurId, qty: 1 },
                ]
            }
        ];

        for (const recipeData of standardRecipes) {
            const recipeId = uuidv4();
            await Recipe.create({
                id: recipeId,
                name: recipeData.name,
                description: recipeData.desc,
                portionSize: 1, // Base per 1 porsi
                calories: recipeData.cal,
                carbs: recipeData.carbs,
                protein: recipeData.protein,
                fat: recipeData.fat,
                createdBy: giziId
            });

            const recipeIngredients = recipeData.ings.map(ing => ({
                recipeId,
                ingredientId: ing.id,
                qtyBesar: ing.qty,
                qtyKecil: ing.qty * 0.7,
                qtyBumil: ing.qty * 1.25,
                qtyBalita: ing.qty * 0.5
            }));

            await RecipeIngredient.bulkCreate(recipeIngredients);
        }
        // --- 5. SCENARIO: HISTORY & EVALUASI ---
        // 1 riwayat hanya 1 menu masak (Ompreng)
        // 1 riwayat hanya 1 menu kering (Kering)
        // 1 riwayat punya 2 menu (Ompreng & Kering)

        const today = new Date();
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1); tomorrow.setHours(8, 0, 0, 0);

        const createMenuData = async (
            name: string,
            date: Date,
            type: 'OMPRENG' | 'KERING',
            counts: { besar: number, kecil: number, bumil: number, balita: number },
            evaluated: boolean
        ) => {
            const mId = uuidv4();
            await Menu.create({
                id: mId,
                name,
                description: `Skenario test untuk ${name}`,
                menuDate: date,
                countBesar: counts.besar,
                countKecil: counts.kecil,
                countBumil: counts.bumil,
                countBalita: counts.balita,
                menuType: type,
                createdBy: chefId,
                evaluatorId: evaluated ? giziId : undefined,
            });

            const totalPax = (counts.besar || 0) + (counts.kecil || 0) + (counts.bumil || 0) + (counts.balita || 0) || 1;

            // Random ingredients for this menu
            const ingredientsToAdd = [
                { ingredientId: berasId, qty: 10 + Math.random() * 5, unit: 'kg' },
                { ingredientId: telurId, qty: totalPax * (0.5 + Math.random() * 0.5), unit: 'butir' },
                { ingredientId: kecapId, qty: 1 + Math.random() * 1, unit: 'liter' },
                { ingredientId: ayamId, qty: 5 + Math.random() * 5, unit: 'kg' },
            ];

            for (const ing of ingredientsToAdd) {
                let evStatus = undefined;
                let evNote = undefined;

                if (evaluated) {
                    const statuses = ['PAS', 'KURANG', 'BERLEBIH'];
                    evStatus = statuses[Math.floor(Math.random() * statuses.length)];
                    if (evStatus === 'KURANG') evNote = "Bahan ternyata kurang di lapangan";
                    if (evStatus === 'BERLEBIH') evNote = "Ada sisa lumayan banyak";
                }


                const gramasiValue = Math.round((ing.qty / totalPax) * 1000) / 1000;

                await MenuIngredient.create({
                    id: uuidv4(),
                    menuId: mId,
                    ingredientId: ing.ingredientId,
                    qtyNeeded: Math.round(ing.qty * 10) / 10,
                    gramasi: gramasiValue,
                    evaluationStatus: evStatus as any,
                    evaluationNote: evNote
                });
            }
        };

        // Create 12 days of history
        for (let i = 12; i >= 1; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            date.setHours(8, 0, 0, 0);

            // Scenarios:
            // 1, 4, 7, 10: Only Ompreng
            // 2, 5, 8, 11: Only Kering
            // 3, 6, 9, 12: Both (Gabungan)

            const menuNames = [
                "Nasi Goreng Spesial", "Sop Ayam Kampung", "Ayam Bakar Madu",
                "Telur Balado", "Soto Ayam Bening", "Opor Ayam"
            ];
            const keringNames = [
                "Susu UHT & Biskuit", "Puding Buah", "Sari Kacang Hijau", "Roti Kasur"
            ];

            const omprengName = menuNames[i % menuNames.length];
            const keringName = keringNames[i % keringNames.length];
            const counts = { besar: 100, kecil: 50, bumil: 10, balita: 15 };
            const isEvaluated = i > 2; // Older ones are evaluated

            if (i % 3 === 1 || i % 3 === 0) {
                await createMenuData(omprengName, date, 'OMPRENG', counts, isEvaluated);
            }
            if (i % 3 === 2 || i % 3 === 0) {
                await createMenuData(keringName, date, 'KERING', counts, isEvaluated);
            }
        }

        // Tomorrow: 1 Upcoming Masak
        await createMenuData("Soto Ayam Bening", tomorrow, 'OMPRENG', { besar: 120, kecil: 30, bumil: 5, balita: 10 }, false);
        return NextResponse.json({
            success: true,
            message: 'Database purged and seeded with explicit history and evaluation scenarios.',
            scenarios: {
                users: demoUsers.map(u => ({ email: u.email, role: u.roleId }))
            }
        });

    } catch (error: any) {
        console.error('Seeding error details:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            console.error('Duplicate keys:', error.errors.map((e: any) => e.message));
        }
        return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 500 });
    }
}
