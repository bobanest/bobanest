import mongoose from 'mongoose';

const IngredientUsageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
});

const InventoryLogSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  source: { type: String, enum: ['online_order', 'walkin', 'manual'], required: true },
  sourceRef: { type: String, default: '' }, // order trackingNumber or walkinLog id
  ingredients: [IngredientUsageSchema],
  createdAt: { type: Date, default: Date.now },
});

// Index for fast date-range queries
InventoryLogSchema.index({ date: -1 });
InventoryLogSchema.index({ source: 1, date: -1 });

export default mongoose.models.InventoryLog || mongoose.model('InventoryLog', InventoryLogSchema);
