// Ensure Product model is registered before Promotion to avoid MissingSchemaError
import './Product';
import mongoose from 'mongoose';

const PromotionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['bogo', 'percentage', 'fixed', 'free_delivery', 'second_discount'], required: true },
  value: { type: Number, default: 0 },
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  minOrderAmount: { type: Number, default: 0 },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true },
  description: String,
});

export default mongoose.models.Promotion || mongoose.model('Promotion', PromotionSchema);