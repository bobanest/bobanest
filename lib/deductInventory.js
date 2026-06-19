import Recipe from '@/lib/models/Recipe';
import InventoryItem from '@/lib/models/InventoryItem';
import InventoryLog from '@/lib/models/InventoryLog';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Maps boba modifier option names → inventory item names
const BOBA_MAP = {
  'tapioca pearl':              'Boba (Tapioca)',
  'tapioca pearls':             'Boba (Tapioca)',
  'strawberry popping boba':    'Strawberry Popping Boba',
  'mango popping boba':         'Mango Popping Boba',
  'lychee popping boba':        'Lychee Popping Boba',
  'passion fruit popping boba': 'Passion Fruit Popping Boba',
};

function detectSize(modifiers = []) {
  for (const mod of modifiers) {
    for (const opt of (mod.options || [])) {
      const lower = opt.toLowerCase();
      if (lower.includes('large') || lower.includes('22')) return 'large';
      if (lower.includes('standard') || lower.includes('16')) return 'standard';
    }
  }
  return null; // no size modifier found
}

function detectBoba(modifiers = []) {
  for (const mod of modifiers) {
    for (const opt of (mod.options || [])) {
      const lower = opt.toLowerCase();
      const mapped = BOBA_MAP[lower];
      if (mapped) return mapped;
    }
  }
  return null;
}

async function deductSingleIngredient(name, amount) {
  const escaped = escapeRegex(name);
  const nameRegex = new RegExp(`^${escaped}$`, 'i');
  // Check for usage-unit → purchase-unit conversion (e.g. recipe says 20 ml, inventory tracks in bottles)
  const item = await InventoryItem.findOne({ name: nameRegex }, { mlPerUnit: 1 });
  const deductAmount = (item?.mlPerUnit > 0) ? amount / item.mlPerUnit : amount;
  const updated = await InventoryItem.findOneAndUpdate(
    { name: nameRegex },
    { $inc: { stockCount: -deductAmount }, $set: { updatedAt: new Date() } },
    { new: true }
  );
  return updated ? { ingredient: name, deducted: deductAmount, remaining: updated.stockCount } : null;
}

/**
 * Deducts inventory for a list of sold/ordered items.
 * Respects size modifier (standard=16oz / large=22oz) and boba modifier.
 * @param {Array<{name: string, quantity: number, modifiers?: Array}>} orderItems
 * @param {{ source?: string, sourceRef?: string, date?: Date }} [meta]
 */
export async function deductInventoryForItems(orderItems, meta = {}) {
  const results = [];
  const logIngredients = [];

  for (const orderItem of orderItems) {
    const qty = parseFloat(orderItem.quantity) || 1;
    const modifiers = orderItem.modifiers || [];
    const detectedSize = detectSize(modifiers);
    const detectedBoba = detectBoba(modifiers);
    const escaped = escapeRegex(orderItem.name);
    const nameRegex = new RegExp(`^${escaped}$`, 'i');

    // Recipe lookup: prefer size-specific, fall back to 'any', then any recipe for this product
    let recipe = null;
    if (detectedSize) {
      recipe = await Recipe.findOne({ productName: nameRegex, size: detectedSize });
    }
    if (!recipe) {
      recipe = await Recipe.findOne({ productName: nameRegex, size: 'any' });
    }
    if (!recipe) {
      // Last resort: pick standard first, then large — best guess for walk-ins with no size info
      recipe = await Recipe.findOne({ productName: nameRegex, size: 'standard' });
    }
    if (!recipe) {
      recipe = await Recipe.findOne({ productName: nameRegex });
    }

    if (recipe?.ingredients?.length) {
      for (const ingredient of recipe.ingredients) {
        const amount = ingredient.quantity * qty;
        const r = await deductSingleIngredient(ingredient.name, amount);
        if (r) {
          results.push(r);
          logIngredients.push({ name: ingredient.name, amount });
        }
      }
    }

    // Deduct boba add-on if selected
    if (detectedBoba) {
      const r = await deductSingleIngredient(detectedBoba, qty);
      if (r) {
        results.push(r);
        logIngredients.push({ name: detectedBoba, amount: qty });
      }
    }
  }

  // Write inventory usage log
  if (logIngredients.length > 0) {
    try {
      await InventoryLog.create({
        date: meta.date || new Date(),
        source: meta.source || 'manual',
        sourceRef: meta.sourceRef || '',
        ingredients: logIngredients,
      });
    } catch (e) {
      console.error('InventoryLog create error:', e.message);
    }
  }

  return results;
}
