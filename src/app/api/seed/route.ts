import { NextResponse } from 'next/server';
import { sequelize } from '@/lib/sequelize';
import { User, Role, Ingredient } from '@/models';

export async function GET() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Sync models (Force true drops table if exists)
        // Warning: This wipes data!
        await sequelize.sync({ force: true });

        // 1. Seed Roles
        const rolesData = [
            { id: 1, name: 'SUPER_ADMIN' },
            { id: 2, name: 'AHLI_GIZI' },
            { id: 3, name: 'PEMBELI' },
            { id: 4, name: 'PENERIMA' },
            { id: 5, name: 'CHEF' },
            { id: 6, name: 'KEPALA_DAPUR' }
        ];
        await Role.bulkCreate(rolesData);

        // 2. Seed Users
        const demoUsers = [
            { roleId: 1, email: "admin@dapur.id", password: "admin123", name: "Admin Utama" },
            { roleId: 2, email: "gizi@dapur.id", password: "gizi1234", name: "Ahli Gizi" },
            { roleId: 3, email: "pembeli@dapur.id", password: "pembeli1", name: "Pembeli" },
            { roleId: 4, email: "penerima@dapur.id", password: "penerima", name: "Penerima Barang" },
            { roleId: 5, email: "chef@dapur.id", password: "chef1234", name: "Chef Dapur" },
            { roleId: 6, email: "kepala@dapur.id", password: "kepala12", name: "Kepala Dapur" },
        ];
        // Cast to any to avoid strict TS partial checks for seeding
        await User.bulkCreate(demoUsers as any);

        // 3. Seed Ingredients
        await Ingredient.bulkCreate([
            { name: 'Beras', unit: 'kg', minimumStock: 50, currentStock: 100 },
            { name: 'Telur', unit: 'kg', minimumStock: 10, currentStock: 20 },
            { name: 'Minyak Goreng', unit: 'liter', minimumStock: 20, currentStock: 40 },
            { name: 'Bawang Merah', unit: 'kg', minimumStock: 5, currentStock: 8 },
            { name: 'Garam', unit: 'kg', minimumStock: 2, currentStock: 10 },
        ]);

        return NextResponse.json({
            success: true,
            message: 'Database seeded successfully with Roles usage',
            users: demoUsers.map(u => u.email)
        });

    } catch (error: any) {
        console.error('Seeding error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
