import { NextResponse } from 'next/server';
import { Ingredient, MenuIngredient, RecipeIngredient, PurchaseItem, ReceiptItem, ProductionItem, StockMovement, sequelize } from '@/models';
import { Op } from 'sequelize';

export async function POST() {
    const transaction = await sequelize.transaction();
    try {
        // Items to be completely deleted (like nutritional values)
        const toDeleteList = [
            "Energi       :",
            "Karbohidrat  :",
            "Lemak        :",
            "Protein      :"
        ];

        // Items to be merged into a standard name
        const mapping: Record<string, string> = {
            "Sambal atau saus": "Saus Sambal",
            "Tempe goreng atau rempeyek kacang": "Tempe",
            "Tempe goreng atau orek tempe": "Tempe",
            "Kunyit bubuk 1/2 sdt atau kunyit segar": "Kunyit",
            "Saus sambal atau saus tomat": "Saus Sambal",
            "Margarin atau minyak goreng": "Margarin",
            "Air ±60 ml atau": "Air",
            "Dada atau paha ayam": "Ayam Potong",
            "Garam dan merica": "Garam",
            "Garam dan jeruk nipis": "Garam",
            "Garam dan gula": "Garam",
            "Garam dan lada": "Garam",
            "Garam dan gula merah": "Garam",
            "Seledri dan daun bawang": "Daun Bawang",
            "Garam dan kecap manis": "Garam",

            // From new findings
            "Tomat merah": "Tomat",
            "Ayam dada": "Ayam Potong",
            "Daging ayam": "Ayam Potong",

            // Bawang merah
            "Bawang merah iris": "Bawang Merah",
            "Bawang merah goreng": "Bawang Merah",

            // Bawang putih
            "Bawang putih cincang": "Bawang Putih",
            "Bawang putih halus": "Bawang Putih",

            // Tahu/Tempe
            "Tahu goreng kecil": "Tahu",
            "Tahu/tempe goreng": "Tahu",
            "Tempe goreng kecil": "Tempe",
            "Tempe kecil": "Tempe",

            // Bumbu lain
            "Kemiri sangrai": "Kemiri",
            "Ketumbar bubuk": "Ketumbar",
            "Ketumbar sangrai": "Ketumbar",
            "Lada bubuk": "Merica",
            "Merica bubuk": "Merica",
            "Lengkuas parut": "Lengkuas",
            "Kunyit bakar": "Kunyit",

            // Daun Bawang / Seledri
            "Daun bawang iris": "Daun Bawang",

            // Minyak
            "Minyak": "Minyak Goreng",
            "Minyak kelapa": "Minyak Goreng",
            "Minyak Kelapa": "Minyak Goreng", // Fix mixed casing
            "Minyak untuk menumis": "Minyak Goreng",

            // Beras / Nasi
            "Beras putih": "Beras",
            "Nasi": "Beras",
            "Nasi putih": "Beras",
            "Nasi putih pulen": "Beras",

            // Ayam
            "Ayam": "Ayam Potong",
            "Ayam kampung": "Ayam Kampung",
            "Daging ayam kampung": "Ayam Kampung",
            "Dada ayam tanpa tulang": "Ayam Potong",
            "Daging ayam tanpa tulang": "Ayam Potong",
            "Dada ayam": "Ayam Potong",

            // Santan
            "Santan cair": "Santan",
            "Santan encer": "Santan",
            "Santan kental": "Santan",

            // Saus dan Tepung
            "Saus sambal": "Saus Sambal", // force capitalisation
            "Saus kecap": "Kecap Manis",
            "Saus kecap slap pakai": "Kecap Manis",
            "Tepung roti/panko": "Tepung Roti",

            // Other fixes
            "Jeruk limau/jeruk sambal": "Jeruk Limau",
            "Ikan dori tanpa tulang dan kulit": "Ikan Dori Fillet",
            "Ikan patin tanpa duri dan tulang": "Ikan Patin",
            "Ikan tanpa kulit dan tulang": "Ikan Dori Fillet",
            "Ikan tuna tanpa kulit dan tulang": "Ikan Tuna",
            "Ikan bandeng tanpa duri": "Ikan Bandeng",
            "Jagung pipil kering": "Jagung Pipil"
        };

        const results = [];

        // 1. Hard deletes first
        for (const badName of toDeleteList) {
            const badIng = await Ingredient.findOne({ where: { name: badName }, transaction });
            if (badIng) {
                await MenuIngredient.destroy({ where: { ingredientId: badIng.id }, transaction });
                await RecipeIngredient.destroy({ where: { ingredientId: badIng.id }, transaction });
                await PurchaseItem.destroy({ where: { ingredientId: badIng.id }, transaction });
                await ReceiptItem.destroy({ where: { ingredientId: badIng.id }, transaction });
                await ProductionItem.destroy({ where: { ingredientId: badIng.id }, transaction });
                await StockMovement.destroy({ where: { ingredientId: badIng.id }, transaction });
                await badIng.destroy({ transaction });
                results.push(`Deleted junk item: "${badName}"`);
            }
        }

        async function safeMerge(badIngId: string, goodIngId: string) {
            // RecipeIngredient
            const bris = await RecipeIngredient.findAll({ where: { ingredientId: badIngId }, transaction });
            for (const bri of bris) {
                const exist = await RecipeIngredient.findOne({ where: { recipeId: bri.recipeId, ingredientId: goodIngId }, transaction });
                if (exist) {
                    await exist.update({
                        qtyBesar: (exist.qtyBesar || 0) + (bri.qtyBesar || 0),
                        qtyKecil: (exist.qtyKecil || 0) + (bri.qtyKecil || 0),
                        qtyBumil: (exist.qtyBumil || 0) + (bri.qtyBumil || 0),
                        qtyBalita: (exist.qtyBalita || 0) + (bri.qtyBalita || 0)
                    }, { transaction });
                    await bri.destroy({ transaction });
                } else {
                    await bri.update({ ingredientId: goodIngId }, { transaction });
                }
            }

            // MenuIngredient
            const bmis = await MenuIngredient.findAll({ where: { ingredientId: badIngId }, transaction });
            for (const bmi of bmis) {
                const exist = await MenuIngredient.findOne({ where: { menuId: bmi.menuId, ingredientId: goodIngId }, transaction });
                if (exist) {
                    await exist.update({
                        qtyNeeded: (exist.qtyNeeded || 0) + (bmi.qtyNeeded || 0),
                        gramasi: (exist.gramasi || 0) + (bmi.gramasi || 0)
                    }, { transaction });
                    await bmi.destroy({ transaction });
                } else {
                    await bmi.update({ ingredientId: goodIngId }, { transaction });
                }
            }

            // PurchaseItem
            await PurchaseItem.update({ ingredientId: goodIngId }, { where: { ingredientId: badIngId }, transaction }).catch(() => { });
            // ReceiptItem
            await ReceiptItem.update({ ingredientId: goodIngId }, { where: { ingredientId: badIngId }, transaction }).catch(() => { });
            // ProductionItem
            await ProductionItem.update({ ingredientId: goodIngId }, { where: { ingredientId: badIngId }, transaction }).catch(() => { });
            // StockMovement
            await StockMovement.update({ ingredientId: goodIngId }, { where: { ingredientId: badIngId }, transaction }).catch(() => { });
        }

        for (const [badName, goodName] of Object.entries(mapping)) {
            // Because case matters in finding, let's use Op.iLike or exact match
            const badIngs = await Ingredient.findAll({ where: { name: { [Op.like]: badName } }, transaction });

            for (const badIng of badIngs) {
                if (badIng.name.toLowerCase() === goodName.toLowerCase() && badIng.name === goodName) {
                    // Same exact string, no need to merge, skip
                    continue;
                }

                let goodIng = await Ingredient.findOne({ where: { name: goodName }, transaction });
                if (!goodIng) {
                    goodIng = await Ingredient.create({
                        name: goodName,
                        unit: badIng.unit || 'kg',
                        currentStock: badIng.currentStock,
                        minimumStock: badIng.minimumStock
                    }, { transaction });
                } else {
                    // Update stock
                    await goodIng.update({
                        currentStock: (goodIng.currentStock || 0) + (badIng.currentStock || 0)
                    }, { transaction });
                }

                await safeMerge(badIng.id, goodIng.id);
                await badIng.destroy({ transaction });
                results.push(`Merged "${badIng.name}" into "${goodName}"`);
            }
        }

        await transaction.commit();
        return NextResponse.json({ success: true, message: "Comprehensive cleanup completed", results });
    } catch (e: any) {
        await transaction.rollback();
        return NextResponse.json({ success: false, error: e.message, stack: e.stack }, { status: 500 });
    }
}
