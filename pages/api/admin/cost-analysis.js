import dbConnect from '@/lib/dbConnect';
import Product from '@/lib/models/Product';
import Recipe from '@/lib/models/Recipe';
import InventoryItem from '@/lib/models/InventoryItem';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    await dbConnect();

    const [products, recipes, inventoryItems] = await Promise.all([
      Product.find({}).lean(),
      Recipe.find({}).lean(),
      InventoryItem.find({}).lean(),
    ]);

    // Build inventory lookup: name (lowercase) -> costPerUnit
    const invMap = {};
    for (const item of inventoryItems) {
      invMap[item.name.toLowerCase()] = item.costPerUnit ?? null;
    }

    // Build recipe lookup: `productName|size` -> recipe
    const recipeMap = {};
    for (const r of recipes) {
      recipeMap[`${r.productName.toLowerCase()}|${r.size || 'any'}`] = r;
    }

    const rows = products.map(product => {
      const salePrice = product.price ?? 0;
      const sizes = ['standard', 'large'];
      const sizeData = sizes.map(size => {
        const key = `${product.name.toLowerCase()}|${size}`;
        const fallbackKey = `${product.name.toLowerCase()}|any`;
        const recipe = recipeMap[key] || recipeMap[fallbackKey] || null;

        if (!recipe) return { size, hasRecipe: false, ingredientCost: null, margin: null, marginPct: null, ingredients: [] };

        let ingredientCost = 0;
        let missingCost = false;
        const ingredients = recipe.ingredients.map(ing => {
          const cpu = invMap[ing.name.toLowerCase()];
          const lineCost = cpu != null ? cpu * ing.quantity : null;
          if (lineCost == null) missingCost = true;
          else ingredientCost += lineCost;
          return { name: ing.name, quantity: ing.quantity, unit: ing.unit, costPerUnit: cpu, lineCost };
        });

        const totalCost = missingCost ? null : ingredientCost;
        const margin = totalCost != null ? salePrice - totalCost : null;
        const marginPct = totalCost != null && salePrice > 0 ? ((margin / salePrice) * 100) : null;

        return { size, hasRecipe: true, ingredientCost: totalCost, margin, marginPct, missingCost, ingredients };
      });

      return {
        _id: String(product._id),
        name: product.name,
        category: product.category,
        salePrice,
        sizes: sizeData,
      };
    });

    // Sort: products with recipes first, then by name
    rows.sort((a, b) => {
      const aHas = a.sizes.some(s => s.hasRecipe);
      const bHas = b.sizes.some(s => s.hasRecipe);
      if (aHas !== bHas) return aHas ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return res.json(rows);
  } catch (err) {
    console.error('cost-analysis error:', err);
    return res.status(500).json({ error: err.message });
  }
}
