import dbConnect from '@/lib/dbConnect';
import InventoryItem from '@/lib/models/InventoryItem';
import Recipe from '@/lib/models/Recipe';

// ─── INGREDIENT MASTER LIST ────────────────────────────────────────────────────
const INVENTORY_TEMPLATE = [
  { name: 'Powder', unit: 'scoop', stockCount: 0, lowStockThreshold: 10, category: 'ingredients', notes: '$17/bag · 1 scoop per serving', costPerUnit: 0.2125 },
  { name: 'Milk', unit: 'ml', stockCount: 0, lowStockThreshold: 3785, category: 'ingredients', notes: '$4/gallon (3785ml)', costPerUnit: 0.00105680317 },
  { name: 'Cane Sugar Syrup', unit: 'ml', stockCount: 0, lowStockThreshold: 1000, category: 'ingredients', notes: '$16/5kg (5000ml)', costPerUnit: 0.0032 },
  { name: 'Cup 16oz', unit: 'pcs', stockCount: 0, lowStockThreshold: 200, category: 'packaging', notes: '$96/1000 pcs', costPerUnit: 0.096 },
  { name: 'Cup 22oz', unit: 'pcs', stockCount: 0, lowStockThreshold: 200, category: 'packaging', notes: '$104/1000 pcs', costPerUnit: 0.104 },
  { name: 'Bag (1 Compartment)', unit: 'pcs', stockCount: 0, lowStockThreshold: 200, category: 'packaging', notes: '$32/1000 pcs', costPerUnit: 0.032 },
  { name: 'Bag (2 Compartment)', unit: 'pcs', stockCount: 0, lowStockThreshold: 200, category: 'packaging', notes: '$43/1000 pcs', costPerUnit: 0.043 },
  { name: 'Sticker', unit: 'pcs', stockCount: 0, lowStockThreshold: 100, category: 'packaging', notes: '$9.39/400 pcs', costPerUnit: 0.023475 },
  { name: 'Tea Base', unit: 'serving', stockCount: 0, lowStockThreshold: 20, category: 'ingredients', notes: '$37/100 servings', costPerUnit: 0.37 },
  { name: 'Flavor Syrup', unit: 'ml', stockCount: 0, lowStockThreshold: 500, category: 'ingredients', notes: '$17/2500ml', costPerUnit: 0.0068 },
  { name: 'Boba (Tapioca)', unit: 'serving', stockCount: 0, lowStockThreshold: 20, category: 'ingredients', notes: '$54/120 servings · $1 add-on', costPerUnit: 0.45 },
  { name: 'Strawberry Popping Boba', unit: 'serving', stockCount: 0, lowStockThreshold: 10, category: 'ingredients', notes: 'Popping boba add-on', costPerUnit: 0.45 },
  { name: 'Mango Popping Boba', unit: 'serving', stockCount: 0, lowStockThreshold: 10, category: 'ingredients', notes: 'Popping boba add-on', costPerUnit: 0.45 },
  { name: 'Lychee Popping Boba', unit: 'serving', stockCount: 0, lowStockThreshold: 10, category: 'ingredients', notes: 'Popping boba add-on', costPerUnit: 0.45 },
  { name: 'Passion Fruit Popping Boba', unit: 'serving', stockCount: 0, lowStockThreshold: 10, category: 'ingredients', notes: 'Popping boba add-on', costPerUnit: 0.45 },
  { name: 'Hot Water', unit: 'serving', stockCount: 0, lowStockThreshold: 0, category: 'ingredients', notes: '$0.05/serving (utility estimate)', costPerUnit: 0.05 },
  { name: 'Ice', unit: 'serving', stockCount: 0, lowStockThreshold: 0, category: 'ingredients', notes: '$0.10/serving', costPerUnit: 0.10 },
  { name: 'Straw', unit: 'pcs', stockCount: 0, lowStockThreshold: 100, category: 'packaging', notes: '$48/2000 pcs', costPerUnit: 0.024 },
];

// ─── STANDARD (16oz) RECIPE BASES ─────────────────────────────────────────────
const LATTE_16 = [
  { name: 'Powder',              quantity: 1,   unit: 'scoop'   },
  { name: 'Milk',                quantity: 170, unit: 'ml'      },
  { name: 'Cane Sugar Syrup',    quantity: 20,  unit: 'ml'      },
  { name: 'Hot Water',           quantity: 1,   unit: 'serving' },
  { name: 'Ice',                 quantity: 1,   unit: 'serving' },
  { name: 'Cup 16oz',            quantity: 1,   unit: 'pcs'     },
  { name: 'Bag (1 Compartment)', quantity: 1,   unit: 'pcs'     },
  { name: 'Sticker',             quantity: 1,   unit: 'pcs'     },
];

const ALL_IN_ONE_16 = [
  { name: 'Powder',              quantity: 1,   unit: 'scoop'   },
  { name: 'Cane Sugar Syrup',    quantity: 20,  unit: 'ml'      },
  { name: 'Hot Water',           quantity: 1,   unit: 'serving' },
  { name: 'Ice',                 quantity: 1,   unit: 'serving' },
  { name: 'Cup 16oz',            quantity: 1,   unit: 'pcs'     },
  { name: 'Bag (1 Compartment)', quantity: 1,   unit: 'pcs'     },
  { name: 'Sticker',             quantity: 1,   unit: 'pcs'     },
];

const GREEN_TEA_16 = [
  { name: 'Tea Base',            quantity: 1,   unit: 'serving' },
  { name: 'Flavor Syrup',        quantity: 25,  unit: 'ml'      },
  { name: 'Cane Sugar Syrup',    quantity: 20,  unit: 'ml'      },
  { name: 'Ice',                 quantity: 1,   unit: 'serving' },
  { name: 'Cup 16oz',            quantity: 1,   unit: 'pcs'     },
  { name: 'Bag (1 Compartment)', quantity: 1,   unit: 'pcs'     },
  { name: 'Sticker',             quantity: 1,   unit: 'pcs'     },
];

const GREEN_TEA_STRAW_16 = [
  ...GREEN_TEA_16,
  { name: 'Straw', quantity: 1, unit: 'pcs' },
];

// ─── LARGE (22oz) RECIPE BASES — 22/16 = 1.375x liquids, 22oz cup ─────────────
const LATTE_22 = [
  { name: 'Powder',              quantity: 1.5, unit: 'scoop'   },
  { name: 'Milk',                quantity: 234, unit: 'ml'      },
  { name: 'Cane Sugar Syrup',    quantity: 28,  unit: 'ml'      },
  { name: 'Hot Water',           quantity: 1,   unit: 'serving' },
  { name: 'Ice',                 quantity: 1,   unit: 'serving' },
  { name: 'Cup 22oz',            quantity: 1,   unit: 'pcs'     },
  { name: 'Bag (1 Compartment)', quantity: 1,   unit: 'pcs'     },
  { name: 'Sticker',             quantity: 1,   unit: 'pcs'     },
];

const ALL_IN_ONE_22 = [
  { name: 'Powder',              quantity: 1.5, unit: 'scoop'   },
  { name: 'Cane Sugar Syrup',    quantity: 28,  unit: 'ml'      },
  { name: 'Hot Water',           quantity: 1,   unit: 'serving' },
  { name: 'Ice',                 quantity: 1,   unit: 'serving' },
  { name: 'Cup 22oz',            quantity: 1,   unit: 'pcs'     },
  { name: 'Bag (1 Compartment)', quantity: 1,   unit: 'pcs'     },
  { name: 'Sticker',             quantity: 1,   unit: 'pcs'     },
];

const GREEN_TEA_22 = [
  { name: 'Tea Base',            quantity: 1,   unit: 'serving' },
  { name: 'Flavor Syrup',        quantity: 34,  unit: 'ml'      },
  { name: 'Cane Sugar Syrup',    quantity: 28,  unit: 'ml'      },
  { name: 'Ice',                 quantity: 1,   unit: 'serving' },
  { name: 'Cup 22oz',            quantity: 1,   unit: 'pcs'     },
  { name: 'Bag (1 Compartment)', quantity: 1,   unit: 'pcs'     },
  { name: 'Sticker',             quantity: 1,   unit: 'pcs'     },
];

const GREEN_TEA_STRAW_22 = [
  ...GREEN_TEA_22,
  { name: 'Straw', quantity: 1, unit: 'pcs' },
];

// ─── RECIPE TEMPLATE — Standard + Large per product ───────────────────────────
const LATTE_PRODUCTS = [
  'Mango Milk Tea (Latte)', 'Strawberry Milk Tea (Latte)', 'Taro Milk Tea (Latte)',
  'Honey Dew Milk Tea (Latte)', 'Thai Milk Tea (Latte)', 'Classic Milk Tea (Latte)',
  'Matcha Milk Tea (Latte)',
];
const ALL_IN_ONE_PRODUCTS = [
  'Mango Milk Tea (All in One)', 'Strawberry Milk Tea (All in One)', 'Taro Milk Tea (All in One)',
  'Honey Dew Milk Tea (All in One)', 'Thai Milk Tea (All in One)', 'Classic Milk Tea (All in One)',
  'Matcha Milk Tea (All in One)', 'Vanilla Milk Tea (All in One)', 'Water Melon Milk Tea (All in One)',
];
const GREEN_TEA_PRODUCTS = ['Mango Green Tea', 'Strawberry Green Tea', 'Lychee Green Tea'];
const GREEN_TEA_STRAW_PRODUCTS = ['Honey Dew Green Tea', 'Peach Fruit Tea'];

const RECIPE_TEMPLATE = [
  ...LATTE_PRODUCTS.flatMap(p => [
    { productName: p, size: 'standard', ingredients: LATTE_16,     notes: '16oz Standard' },
    { productName: p, size: 'large',    ingredients: LATTE_22,     notes: '22oz Large' },
  ]),
  ...ALL_IN_ONE_PRODUCTS.flatMap(p => [
    { productName: p, size: 'standard', ingredients: ALL_IN_ONE_16, notes: '16oz Standard' },
    { productName: p, size: 'large',    ingredients: ALL_IN_ONE_22,  notes: '22oz Large' },
  ]),
  ...GREEN_TEA_PRODUCTS.flatMap(p => [
    { productName: p, size: 'standard', ingredients: GREEN_TEA_16,       notes: '16oz Standard' },
    { productName: p, size: 'large',    ingredients: GREEN_TEA_22,       notes: '22oz Large' },
  ]),
  ...GREEN_TEA_STRAW_PRODUCTS.flatMap(p => [
    { productName: p, size: 'standard', ingredients: GREEN_TEA_STRAW_16, notes: '16oz Standard' },
    { productName: p, size: 'large',    ingredients: GREEN_TEA_STRAW_22, notes: '22oz Large' },
  ]),
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  await dbConnect();

  const { what = 'all', overwrite = false } = req.body;
  const result = {};

  // ── Seed inventory items ──────────────────────────────────────────────────
  if (what === 'inventory' || what === 'all') {
    let created = 0, skipped = 0;
    for (const item of INVENTORY_TEMPLATE) {
      const existing = await InventoryItem.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(item.name)}$`, 'i') },
      });
      if (existing && !overwrite) { skipped++; continue; }
      if (existing) {
        await InventoryItem.findByIdAndUpdate(existing._id, { ...item, updatedAt: new Date() });
      } else {
        await InventoryItem.create({ ...item, updatedAt: new Date() });
      }
      created++;
    }
    result.inventory = { created, skipped };
  }

  // ── Seed recipes ───────────────────────────────────────────────────────────
  if (what === 'recipes' || what === 'all') {
    let created = 0, skipped = 0;
    for (const recipe of RECIPE_TEMPLATE) {
      const existing = await Recipe.findOne({
        productName: { $regex: new RegExp(`^${escapeRegex(recipe.productName)}$`, 'i') },
        size: recipe.size,
      });
      if (existing && !overwrite) { skipped++; continue; }
      if (existing) {
        await Recipe.findByIdAndUpdate(existing._id, { ...recipe, updatedAt: new Date() });
      } else {
        await Recipe.create({ ...recipe, updatedAt: new Date() });
      }
      created++;
    }
    result.recipes = { created, skipped };
  }

  return res.json(result);
}
