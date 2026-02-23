import { NextResponse } from 'next/server';
import { sequelize } from '@/lib/sequelize';
import { User, Role, Ingredient, Recipe, RecipeIngredient, Menu, MenuIngredient } from '@/models';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // WARNING: This wipes all data!
        await sequelize.sync({ force: true });

        // --- 1. Seed Roles ---
        const rolesData = [
            { id: 1, name: 'SUPER_ADMIN' },
            { id: 2, name: 'AHLI_GIZI' },
            { id: 3, name: 'PEMBELI' },
            { id: 4, name: 'PENERIMA' },
            { id: 5, name: 'CHEF' },
            { id: 6, name: 'KEPALA_DAPUR' }
        ];
        await Role.bulkCreate(rolesData);

        // --- 2. Seed Users (with Fixed IDs for linking) ---
        const adminId = uuidv4();
        const giziId = uuidv4();
        const chefId = uuidv4();

        const demoUsers = [
            { id: adminId, roleId: 1, email: "admin@dapur.id", password: "admin123", name: "Admin Utama" },
            { id: giziId, roleId: 2, email: "gizi@dapur.id", password: "gizi1234", name: "Bu Ahli Gizi" },
            { roleId: 3, email: "pembeli@dapur.id", password: "pembeli1", name: "Staff Pembeli" },
            { roleId: 4, email: "penerima@dapur.id", password: "penerima", name: "Staff Gudang" },
            { id: chefId, roleId: 5, email: "chef@dapur.id", password: "chef1234", name: "Chef Juna" },
            { roleId: 6, email: "kepala@dapur.id", password: "kepala12", name: "Kepala Dapur" },
        ];
        await User.bulkCreate(demoUsers as any);

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
                qtyPerPortion: ing.qty
            }));

            await RecipeIngredient.bulkCreate(recipeIngredients);
        }

        // --- 5. SCENARIO: HISTORY (10 RIWAYAT MASAK) ---
        // We will create 10 menus going backwards from Feb 19, 2026.
        // To test statistics, we'll use repeating menu names like "Nasi Goreng Spesial" and "Sop Ayam".

        const menuNames = [
            "Nasi Goreng Spesial", // Will use this multiple times
            "Sop Ayam Kampung",
            "Nasi Goreng Spesial",
            "Ayam Bakar Madu",
            "Nasi Goreng Spesial",
            "Sop Ayam Kampung",
            "Tumis Kangkung",
            "Nasi Goreng Spesial",
            "Ayam Bakar Madu",
            "Nasi Goreng Spesial"
        ];

        let currentDate = new Date('2026-02-19T08:00:00');

        for (let i = 0; i < 10; i++) {
            const mId = uuidv4();
            const name = menuNames[i];

            await Menu.create({
                id: mId,
                name: name,
                description: `Masakan harian untuk ${name}`,
                menuDate: new Date(currentDate),
                portionCount: 50 + Math.floor(Math.random() * 50), // 50-100 porsi
                createdBy: chefId,
                evaluatorId: i % 3 !== 0 ? giziId : undefined, // About 2/3 of them evaluated
            });

            // Random ingredients for this menu
            const ingredientsToAdd = [
                { ingredientId: berasId, qty: 10 + Math.random() * 5 },
                { ingredientId: telurId, qty: 50 + Math.random() * 20 },
                { ingredientId: kecapId, qty: 1 + Math.random() * 1 },
                { ingredientId: ayamId, qty: 5 + Math.random() * 5 },
            ];

            const evalStatuses: ('PAS' | 'KURANG' | 'BERLEBIH')[] = ['PAS', 'PAS', 'KURANG', 'BERLEBIH', 'PAS'];

            for (const ing of ingredientsToAdd) {
                // If it's evaluated (evaluatorId is set), give it a random status
                const isEvaluated = i % 3 !== 0;
                let evStatus = undefined;
                let evNote: string | undefined = undefined;

                if (isEvaluated) {
                    evStatus = evalStatuses[Math.floor(Math.random() * evalStatuses.length)];
                    if (evStatus === 'KURANG') evNote = "Bahan ternyata kurang di lapangan";
                    if (evStatus === 'BERLEBIH') evNote = "Ada sisa lumayan banyak";
                }

                await MenuIngredient.create({
                    id: uuidv4(),
                    menuId: mId,
                    ingredientId: ing.ingredientId,
                    qtyNeeded: Math.round(ing.qty * 10) / 10,
                    evaluationStatus: evStatus as any,
                    evaluationNote: evNote
                });
            }

            // Go back 1-3 days for the next record
            currentDate.setDate(currentDate.getDate() - (1 + Math.floor(Math.random() * 3)));
        }

        // Add 1 upcoming menu (Not evaluated yet) so we can click the "Statistik" and "Evaluasi" button for it
        const upcomingMenuId = uuidv4();
        await Menu.create({
            id: upcomingMenuId,
            name: "Nasi Goreng Spesial", // Same name to trigger stats
            description: "Persiapan masak untuk besok",
            menuDate: new Date('2026-02-21T08:00:00'),
            portionCount: 80,
            createdBy: chefId,
            evaluatorId: undefined
        });
        await MenuIngredient.bulkCreate([
            { menuId: upcomingMenuId, ingredientId: berasId, qtyNeeded: 12 },
            { menuId: upcomingMenuId, ingredientId: telurId, qtyNeeded: 80 },
            { menuId: upcomingMenuId, ingredientId: kecapId, qtyNeeded: 1.5 },
            { menuId: upcomingMenuId, ingredientId: ayamId, qtyNeeded: 8 },
        ]);

        return NextResponse.json({
            success: true,
            message: 'Database purged and seeded with 10 historical menus with repeating names.',
            scenarios: {
                users: demoUsers.map(u => ({ email: u.email, role: u.roleId }))
            }
        });

    } catch (error: any) {
        console.error('Seeding error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
