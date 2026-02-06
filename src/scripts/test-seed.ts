import 'dotenv/config';
import { sequelize } from '../lib/sequelize';
import { User, Role, Ingredient } from '../models';

async function main() {
    console.log('Testing Sequelize connection...');
    try {
        await sequelize.authenticate();
        console.log('Connection success.');

        console.log('Syncing models (force: true)...');
        await sequelize.sync({ force: true });

        // 1. Seed Roles
        console.log('Seeding roles...');
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
        console.log('Seeding users...');
        const demoUsers = [
            { roleId: 1, email: "admin@dapur.id", password: "admin123", name: "Admin Utama" },
            { roleId: 2, email: "gizi@dapur.id", password: "gizi1234", name: "Ahli Gizi" },
            { roleId: 3, email: "pembeli@dapur.id", password: "pembeli1", name: "Pembeli" },
            { roleId: 4, email: "penerima@dapur.id", password: "penerima", name: "Penerima Barang" },
            { roleId: 5, email: "chef@dapur.id", password: "chef1234", name: "Chef Dapur" },
            { roleId: 6, email: "kepala@dapur.id", password: "kepala12", name: "Kepala Dapur" },
        ];

        await User.bulkCreate(demoUsers);

        // 3. Seed Ingredients (Basic) - SKIPPED as per request to start empty
        console.log('Skipping ingredient seeding...');
        // await Ingredient.bulkCreate([
        //     { name: 'Beras', unit: 'kg', minimumStock: 50, currentStock: 100 },
        //     { name: 'Telur', unit: 'kg', minimumStock: 10, currentStock: 20 },
        //     { name: 'Minyak Goreng', unit: 'liter', minimumStock: 20, currentStock: 40 },
        //     { name: 'Bawang Merah', unit: 'kg', minimumStock: 5, currentStock: 8 },
        //     { name: 'Garam', unit: 'kg', minimumStock: 2, currentStock: 10 },
        // ]);

        console.log('Seed success!');
        process.exit(0);
    } catch (e) {
        console.error('Seed/DB Error:', e);
        process.exit(1);
    }
}

main();
