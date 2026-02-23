'use server';

import { Recipe, Ingredient, RecipeIngredient, sequelize } from '@/models';
import { getSession } from './auth';
import { revalidatePath } from 'next/cache';
import { Op } from 'sequelize';

export async function getRecipes() {
    try {
        const recipes = await Recipe.findAll({
            include: [
                {
                    model: Ingredient,
                    as: 'ingredients',
                    through: { attributes: ['qtyPerPortion'] }
                }
            ],
            order: [['name', 'ASC']]
        });

        // Serialize
        return recipes.map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            portionSize: r.portionSize,
            calories: r.calories,
            carbs: r.carbs,
            protein: r.protein,
            fat: r.fat,
            ingredients: r.ingredients.map((i: any) => ({
                id: i.id,
                name: i.name,
                unit: i.unit,
                qtyPerPortion: (i as any).RecipeIngredient?.qtyPerPortion || 0
            }))
        }));
    } catch (error) {
        console.error('Error fetching recipes:', error);
        return [];
    }
}

export async function createRecipe(data: { name: string; description: string; portionSize: number; calories?: number; carbs?: number; protein?: number; fat?: number; ingredients: { name: string; qty: number; unit: string }[] }) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    if (!['AHLI_GIZI', 'SUPER_ADMIN'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        const recipe = await Recipe.create({
            name: data.name,
            description: data.description,
            portionSize: data.portionSize || 1,
            calories: data.calories || undefined,
            carbs: data.carbs || undefined,
            protein: data.protein || undefined,
            fat: data.fat || undefined,
            createdBy: session.id
        });

        if (data.ingredients.length > 0) {
            for (const item of data.ingredients) {
                // Find or create ingredient
                let ingredient = await Ingredient.findOne({
                    where: sequelize.where(
                        sequelize.fn('lower', sequelize.col('name')),
                        sequelize.fn('lower', item.name)
                    )
                });

                if (!ingredient) {
                    ingredient = await Ingredient.create({
                        name: item.name,
                        unit: item.unit,
                        currentStock: 0,
                        minimumStock: 10
                    });
                }

                await RecipeIngredient.create({
                    recipeId: recipe.id,
                    ingredientId: ingredient.id,
                    qtyPerPortion: item.qty // This is strict per-portion quantity
                });
            }
        }

        revalidatePath('/recipes');
        return { success: true };
    } catch (error) {
        console.error('Error creating recipe:', error);
        return { error: 'Failed to create recipe' };
    }
}

export async function deleteRecipe(id: string) {
    const session = await getSession();
    if (!session || !['AHLI_GIZI', 'SUPER_ADMIN'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        await Recipe.destroy({ where: { id } });
        revalidatePath('/notes');
        return { success: true };
    } catch (error) {
        return { error: 'Failed' };
    }
}
