import mongoose from 'mongoose';

const IngredientSchema = new mongoose.Schema({
  inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, default: 'unit' },
});

const RecipeSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  size: { type: String, enum: ['standard', 'large', 'any'], default: 'any' },
  ingredients: [IngredientSchema],
  notes: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

// Compound unique index: one recipe per product+size combo
RecipeSchema.index({ productName: 1, size: 1 }, { unique: true });

export default mongoose.models.Recipe || mongoose.model('Recipe', RecipeSchema);
