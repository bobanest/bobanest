import mongoose from 'mongoose';

const ModifierOptionSchema = new mongoose.Schema({
  name: String,
  price: { type: Number, default: 0 },
});

const ModifierGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  required: { type: Boolean, default: false },
  multiple: { type: Boolean, default: false },
  options: [ModifierOptionSchema],
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
});

export default mongoose.models.ModifierGroup || mongoose.model('ModifierGroup', ModifierGroupSchema);