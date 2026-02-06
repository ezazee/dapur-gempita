'use server';

import { Ingredient } from '@/models';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// Helper to check auth (simple version for now)
async function isAuthenticated() {
    const cookieStore = await cookies();
    const session = cookieStore.get('auth_session');
    return !!session;
}

export async function getIngredients() {
    try {
        const data = await Ingredient.findAll({
            order: [['name', 'ASC']],
            raw: true // Return plain objects
        });
        // Serialize dates for Next.js server actions (which expect simple JSON)
        return data.map((item: any) => ({
            ...item,
            createdAt: item.createdAt?.toISOString(),
            updatedAt: item.updatedAt?.toISOString(),
        }));
    } catch (error) {
        console.error('Error fetching ingredients:', error);
        throw new Error('Failed to fetch ingredients');
    }
}

export async function createIngredient(data: { name: string; unit: string; minimumStock: number; currentStock?: number }) {
    if (!await isAuthenticated()) throw new Error('Unauthorized');

    try {
        await Ingredient.create({
            name: data.name,
            unit: data.unit,
            minimumStock: data.minimumStock,
            currentStock: data.currentStock || 0
        });
        revalidatePath('/ingredients');
        return { success: true };
    } catch (error) {
        console.error('Error creating ingredient:', error);
        return { error: 'Failed to create ingredient' };
    }
}

export async function updateIngredient(id: string, data: { name: string; unit: string; minimumStock: number }) {
    if (!await isAuthenticated()) throw new Error('Unauthorized');

    try {
        const [updated] = await Ingredient.update({
            name: data.name,
            unit: data.unit,
            minimumStock: data.minimumStock
        }, {
            where: { id }
        });

        if (updated === 0) return { error: 'Ingredient not found' };

        revalidatePath('/ingredients');
        return { success: true };
    } catch (error) {
        console.error('Error updating ingredient:', error);
        return { error: 'Failed to update ingredient' };
    }
}

export async function deleteIngredient(id: string) {
    if (!await isAuthenticated()) throw new Error('Unauthorized');

    try {
        const deleted = await Ingredient.destroy({
            where: { id }
        });

        if (deleted === 0) return { error: 'Ingredient not found' };

        revalidatePath('/ingredients');
        return { success: true };
    } catch (error) {
        console.error('Error deleting ingredient:', error);
        return { error: 'Failed to delete ingredient' };
    }
}
