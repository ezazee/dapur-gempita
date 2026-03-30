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
                    through: { attributes: ['qty_besar', 'qty_kecil', 'qty_bumil', 'qty_balita', 'is_secukupnya'] }
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
            ingredients: r.ingredients.map((i: any) => {
                // Sequelize attaches junction data under the model name OR under raw dataValues
                // Try multiple access patterns to be safe in production builds
                const pivot = i.RecipeIngredient?.dataValues ||
                    i.recipe_ingredients?.dataValues ||
                    i.RecipeIngredient ||
                    i.recipe_ingredient ||
                    {};
                return {
                    id: i.id,
                    name: i.name,
                    unit: i.unit,
                    qtyBesar: pivot.qty_besar ?? pivot.qtyBesar ?? 0,
                    qtyKecil: pivot.qty_kecil ?? pivot.qtyKecil ?? null,
                    qtyBumil: pivot.qty_bumil ?? pivot.qtyBumil ?? null,
                    qtyBalita: pivot.qty_balita ?? pivot.qtyBalita ?? null,
                    isSecukupnya: pivot.is_secukupnya ?? pivot.isSecukupnya ?? false,
                };
            })
        }));
    } catch (error) {
        console.error('Error fetching recipes:', error);
        return [];
    }
}

export async function createRecipe(data: {
    name: string;
    description: string;
    portionSize: number;
    calories?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
    ingredients: {
        name: string;
        qtyBesar: number;
        qtyKecil?: number;
        qtyBumil?: number;
        qtyBalita?: number;
        unit: string;
        isSecukupnya?: boolean;
    }[]
}) {
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
                    qtyBesar: item.isSecukupnya ? 0 : item.qtyBesar,
                    qtyKecil: item.isSecukupnya ? 0 : (Number(item.qtyKecil) || 0),
                    qtyBumil: item.isSecukupnya ? 0 : (Number(item.qtyBumil) || 0),
                    qtyBalita: item.isSecukupnya ? 0 : (Number(item.qtyBalita) || 0),
                    isSecukupnya: item.isSecukupnya || false
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
export async function updateRecipe(id: string, data: {
    name: string;
    description: string;
    portionSize: number;
    calories?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
    ingredients: {
        name: string;
        qtyBesar: number;
        qtyKecil?: number;
        qtyBumil?: number;
        qtyBalita?: number;
        unit: string;
        isSecukupnya?: boolean;
    }[]
}) {
    const session = await getSession();
    if (!session || !['AHLI_GIZI', 'SUPER_ADMIN'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        const recipe = await Recipe.findByPk(id);
        if (!recipe) return { error: 'Recipe not found' };

        await recipe.update({
            name: data.name,
            description: data.description,
            portionSize: data.portionSize || 1,
            calories: data.calories || undefined,
            carbs: data.carbs || undefined,
            protein: data.protein || undefined,
            fat: data.fat || undefined,
        });

        // Sync ingredients: Delete old, create new
        await RecipeIngredient.destroy({ where: { recipeId: id } });

        if (data.ingredients.length > 0) {
            for (const item of data.ingredients) {
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
                    recipeId: id,
                    ingredientId: ingredient.id,
                    qtyBesar: item.isSecukupnya ? 0 : item.qtyBesar,
                    qtyKecil: item.isSecukupnya ? 0 : (Number(item.qtyKecil) || 0),
                    qtyBumil: item.isSecukupnya ? 0 : (Number(item.qtyBumil) || 0),
                    qtyBalita: item.isSecukupnya ? 0 : (Number(item.qtyBalita) || 0),
                    isSecukupnya: item.isSecukupnya || false
                });
            }
        }

        revalidatePath('/recipes');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating recipe:', error);
        return { error: error.message || 'Failed to update recipe' };
    }
}
export async function getRecipeByName(name: string) {
    try {
        const recipe = await Recipe.findOne({
            where: sequelize.where(
                sequelize.fn('lower', sequelize.col('name')),
                sequelize.fn('lower', name.trim())
            ),
            include: [
                {
                    model: Ingredient,
                    as: 'ingredients',
                    through: { attributes: ['qty_besar', 'qty_kecil', 'qty_bumil', 'qty_balita', 'is_secukupnya'] }
                }
            ]
        });

        if (!recipe) return null;

        return {
            id: recipe.id,
            name: recipe.name,
            description: recipe.description,
            portionSize: recipe.portionSize,
            calories: recipe.calories,
            carbs: recipe.carbs,
            protein: recipe.protein,
            fat: recipe.fat,
            ingredients: (recipe as any).ingredients.map((i: any) => {
                const pivot = i.RecipeIngredient?.dataValues ||
                    i.RecipeIngredient ||
                    {};
                return {
                    id: i.id,
                    name: i.name,
                    unit: i.unit,
                    qtyBesar: pivot.qty_besar ?? pivot.qtyBesar ?? 0,
                    qtyKecil: pivot.qty_kecil ?? pivot.qtyKecil ?? null,
                    qtyBumil: pivot.qty_bumil ?? pivot.qtyBumil ?? null,
                    qtyBalita: pivot.qty_balita ?? pivot.qtyBalita ?? null,
                    isSecukupnya: pivot.is_secukupnya ?? pivot.isSecukupnya ?? false,
                };
            })
        };
    } catch (error) {
        console.error('Error fetching recipe by name:', error);
        return null;
    }
}
