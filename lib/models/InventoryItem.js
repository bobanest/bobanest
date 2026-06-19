import mongoose from 'mongoose';

const InventoryItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  unit: { type: String, default: 'unit' },
  stockCount: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  category: {
    type: String,
    enum: ['ingredients', 'packaging', 'supplies', 'other'],
    default: 'other',
  },
  notes: { type: String, default: '' },
  costPerUnit: { type: Number, default: null },
  servingsPerUnit: { type: Number, default: null }, // e.g. 1 bottle = 25 servings
  usageUnit: { type: String, default: '' },          // unit used in recipes, e.g. 'ml' or 'g'
  mlPerUnit: { type: Number, default: null },        // how many usageUnits per purchase unit, e.g. 2500 ml per bottle
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.InventoryItem || mongoose.model('InventoryItem', InventoryItemSchema);
