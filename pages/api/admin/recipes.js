import dbConnect from '@/lib/dbConnect';
import Recipe from '@/lib/models/Recipe';

// Strip inventoryItemId if it's not a valid 24-char hex string (avoids ObjectId cast errors)
function cleanIngredients(ingredients) {
  return (ingredients || []).map(({ name, quantity, unit, inventoryItemId }) => {
    const base = { name, quantity: Number(quantity), unit: unit || 'unit' };
    const idStr = inventoryItemId ? String(inventoryItemId) : '';
    if (idStr.match(/^[a-f\d]{24}$/i)) base.inventoryItemId = idStr;
    return base;
  });
}

export default async function handler(req, res) {
  try {
    await dbConnect();

    if (req.method === 'GET') {
      const recipes = await Recipe.find({}).sort({ productName: 1, size: 1 }).lean();
      // Ensure all ObjectId fields are plain strings for safe client round-trip
      const safe = recipes.map(r => ({
        ...r,
        _id: String(r._id),
        ingredients: (r.ingredients || []).map(i => ({
          ...i,
          _id: i._id ? String(i._id) : undefined,
          inventoryItemId: i.inventoryItemId ? String(i.inventoryItemId) : undefined,
        })),
      }));
      return res.json(safe);
    }

    // POST and PUT both upsert by (productName, size) — no _id round-trip needed
    if (req.method === 'POST' || req.method === 'PUT') {
      const { productName, size = 'any', ingredients, notes } = req.body;
      if (!productName || !ingredients?.length) {
        return res.status(400).json({ error: 'productName and ingredients required' });
      }
      const clean = cleanIngredients(ingredients).filter(i => i.name && i.quantity);
      if (!clean.length) {
        return res.status(400).json({ error: 'At least one valid ingredient required' });
      }
      const recipe = await Recipe.findOneAndUpdate(
        { productName, size },
        { $set: { ingredients: clean, notes: notes || '', updatedAt: new Date() },
          $setOnInsert: { productName, size, createdAt: new Date() } },
        { upsert: true, new: true }
      );
      return res.json({ ...recipe.toObject(), _id: String(recipe._id) });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      await Recipe.findByIdAndDelete(id);
      return res.json({ success: true });
    }

    return res.status(405).end();
  } catch (err) {
    console.error('recipes API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
