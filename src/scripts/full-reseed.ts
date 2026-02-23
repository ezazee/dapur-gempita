import 'dotenv/config';
import {
    sequelize,
    Role,
    User,
    Ingredient,
    Recipe,
    RecipeIngredient,
    Menu,
    MenuIngredient
} from '../models';
import { v4 as uuidv4 } from 'uuid';

async function main() {
    console.log('--- Database Purge & Re-seed ---');
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        console.log('Syncing models (force: true) - This will purge everything...');
        await sequelize.sync({ force: true });
        console.log('Database purged.');

        // 1. Seed Roles
        console.log('Seeding roles...');
        const roles = await Role.bulkCreate([
            { id: 1, name: 'SUPER_ADMIN' },
            { id: 2, name: 'AHLI_GIZI' },
            { id: 3, name: 'PEMBELI' },
            { id: 4, name: 'PENERIMA' },
            { id: 5, name: 'CHEF' },
            { id: 6, name: 'KEPALA_DAPUR' }
        ]);

        // 2. Seed Users
        console.log('Seeding users...');
        const adminId = uuidv4();
        const giziId = uuidv4();
        await User.bulkCreate([
            { id: adminId, roleId: 1, email: "admin@dapur.id", password: "admin123", name: "Admin Utama" },
            { id: giziId, roleId: 2, email: "gizi@dapur.id", password: "gizi1234", name: "Ahli Gizi" },
            { id: uuidv4(), roleId: 5, email: "chef@dapur.id", password: "chef1234", name: "Chef Dapur" },
        ]);

        // 3. Seed Ingredients
        console.log('Seeding ingredients...');
        const ingredients = await Ingredient.bulkCreate([
            { id: uuidv4(), name: 'Beras', unit: 'kg', currentStock: 100, minimumStock: 20 },
            { id: uuidv4(), name: 'Ayam Potong', unit: 'kg', currentStock: 50, minimumStock: 10 },
            { id: uuidv4(), name: 'Telor Ayam', unit: 'kg', currentStock: 30, minimumStock: 5 },
            { id: uuidv4(), name: 'Minyak Goreng', unit: 'liter', currentStock: 40, minimumStock: 10 },
            { id: uuidv4(), name: 'Wortel', unit: 'kg', currentStock: 15, minimumStock: 5 },
            { id: uuidv4(), name: 'Kentang', unit: 'kg', currentStock: 20, minimumStock: 5 },
            { id: uuidv4(), name: 'Kangkung', unit: 'ikat', currentStock: 100, minimumStock: 20 },
            { id: uuidv4(), name: 'Bumbu Nasi Goreng', unit: 'pack', currentStock: 50, minimumStock: 10 },
            { id: uuidv4(), name: 'Madu', unit: 'botol', currentStock: 10, minimumStock: 2 },
        ]);

        const findIng = (name: string) => ingredients.find(i => i.name === name)!;

        // 4. Seed Recipes (Kamus Resep)
        console.log('Seeding recipes...');
        const recipes = [
            { id: uuidv4(), name: 'Nasi Goreng Spesial', description: 'Nasi goreng dengan telur dan ayam.', createdBy: giziId },
            { id: uuidv4(), name: 'Sop Ayam Kampung', description: 'Sop ayam sehat dengan sayuran.', createdBy: giziId },
            { id: uuidv4(), name: 'Ayam Bakar Madu', description: 'Ayam bakar manis gurih.', createdBy: giziId },
            { id: uuidv4(), name: 'Tumis Kangkung', description: 'Sayuran hijau segar.', createdBy: giziId },
        ];
        await Recipe.bulkCreate(recipes);

        // Recipe Ingredients (Gramasi)
        const recipeIngs = [
            // Nasi Goreng
            { recipeId: recipes[0].id, ingredientId: findIng('Beras').id, qtyPerPortion: 0.1 },
            { recipeId: recipes[0].id, ingredientId: findIng('Telor Ayam').id, qtyPerPortion: 0.05 },
            { recipeId: recipes[0].id, ingredientId: findIng('Minyak Goreng').id, qtyPerPortion: 0.01 },
            // Sop Ayam
            { recipeId: recipes[1].id, ingredientId: findIng('Ayam Potong').id, qtyPerPortion: 0.15 },
            { recipeId: recipes[1].id, ingredientId: findIng('Wortel').id, qtyPerPortion: 0.05 },
            { recipeId: recipes[1].id, ingredientId: findIng('Kentang').id, qtyPerPortion: 0.05 },
            // Ayam Bakar Madu
            { recipeId: recipes[2].id, ingredientId: findIng('Ayam Potong').id, qtyPerPortion: 0.2 },
            { recipeId: recipes[2].id, ingredientId: findIng('Madu').id, qtyPerPortion: 0.02 },
            // Tumis Kangkung
            { recipeId: recipes[3].id, ingredientId: findIng('Kangkung').id, qtyPerPortion: 0.5 },
        ];
        await RecipeIngredient.bulkCreate(recipeIngs);

        // 5. Seed Menus (Jadwal Masak) Feb 15 - 22
        console.log('Seeding menu schedules (Feb 15 - 22)...');
        const startDate = new Date('2026-02-15');
        const menuData = [
            { date: '2026-02-15', recipe: recipes[0], pax: 150, evaluated: true },
            { date: '2026-02-16', recipe: recipes[1], pax: 120, evaluated: true },
            { date: '2026-02-17', recipe: recipes[2], pax: 100, evaluated: true },
            { date: '2026-02-18', recipe: recipes[3], pax: 80, evaluated: true },
            { date: '2026-02-19', recipe: recipes[0], pax: 150, evaluated: true }, // Repeat NG
            { date: '2026-02-20', recipe: recipes[1], pax: 130, evaluated: true }, // Repeat Sop
            { date: '2026-02-21', recipe: recipes[2], pax: 110, evaluated: false }, // Pending
            { date: '2026-02-22', recipe: recipes[3], pax: 90, evaluated: false }, // Pending
        ];

        for (const data of menuData) {
            const menu = await Menu.create({
                id: uuidv4(),
                name: data.recipe.name,
                description: data.recipe.description,
                menuDate: new Date(data.date),
                portionCount: data.pax,
                createdBy: adminId,
                evaluatorId: data.evaluated ? giziId : undefined
            });

            // Add ingredients with snapshot gramasi
            const ingredientsForRecipe = recipeIngs.filter(ri => ri.recipeId === data.recipe.id);
            for (const ri of ingredientsForRecipe) {
                await MenuIngredient.create({
                    menuId: menu.id,
                    ingredientId: ri.ingredientId,
                    qtyNeeded: ri.qtyPerPortion * data.pax,
                    gramasi: ri.qtyPerPortion,
                    evaluationStatus: data.evaluated ? (Math.random() > 0.3 ? 'PAS' : (Math.random() > 0.5 ? 'KURANG' : 'BERLEBIH')) : undefined,
                    evaluationNote: data.evaluated ? 'Catatan hasil evaluasi masak' : undefined
                });
            }
        }

        console.log('--- Seed Success! ---');
        process.exit(0);
    } catch (e) {
        console.error('Seed Error:', e);
        process.exit(1);
    }
}

main();
