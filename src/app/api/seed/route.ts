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

        // --- 4. SCENARIO: RECIPE (SOP / KAMUS RESEP) ---
        // "Nasi Goreng Spesial (Standar)" - Gramasi Baku
        const recipeId = uuidv4();
        await Recipe.create({
            id: recipeId,
            name: "Nasi Goreng Spesial (SOP)",
            description: "Resep standar Ahli Gizi. Rasa seimbang.",
            portionSize: 1, // Base per 1 porsi
            createdBy: giziId
        });

        // Bahan Baku Resep (Per Porsi)
        await RecipeIngredient.bulkCreate([
            { recipeId, ingredientId: berasId, qtyPerPortion: 0.15 }, // 150g beras
            { recipeId, ingredientId: telurId, qtyPerPortion: 1 },    // 1 butir telur
            { recipeId, ingredientId: kecapId, qtyPerPortion: 0.02 }, // 20ml kecap
            { recipeId, ingredientId: ayamId, qtyPerPortion: 0.1 },   // 100g ayam
        ]);

        // --- 5. SCENARIO: HISTORY (RIWAYAT MASAK KEMARIN) ---
        // "Nasi Goreng (Asin/Pedas)" - Modifikasi lapangan
        const menuId = uuidv4();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        await Menu.create({
            id: menuId,
            name: "Nasi Goreng (Pesanan Partai)", // Nama beda dikit
            description: "Modifikasi: Klien minta kecap dikurangi, ayam dibanyakin.",
            menuDate: yesterday,
            portionCount: 100, // Masak untuk 100 orang
            createdBy: chefId
        });

        // Bahan Baku Menu (Total Aktual yang dipakai)
        // Kalau ikut SOP: Beras 15kg, Telur 100, Kecap 2L, Ayam 10kg
        // Aktual lapangan:
        await MenuIngredient.bulkCreate([
            { menuId, ingredientId: berasId, qtyNeeded: 15 },   // Sesuai standar (15kg)
            { menuId, ingredientId: telurId, qtyNeeded: 100 },  // Sesuai standar (100 btr)
            { menuId, ingredientId: kecapId, qtyNeeded: 1 },    // MODIFIKASI: Cuma pakai 1L (Kurang manis)
            { menuId, ingredientId: ayamId, qtyNeeded: 12 },    // MODIFIKASI: Pakai 12kg (Lebih banyak daging)
        ]);

        return NextResponse.json({
            success: true,
            message: 'Database purged and seeded with Education Scenario.',
            scenarios: {
                recipe: "Nasi Goreng Spesial (SOP) - Check 'Kamus Resep'",
                history: "Nasi Goreng (Pesanan Partai) - Check 'Riwayat'",
                users: demoUsers.map(u => ({ email: u.email, role: u.roleId }))
            }
        });

    } catch (error: any) {
        console.error('Seeding error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
