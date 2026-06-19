import mongoose from 'mongoose';

const PromoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true },        // % or $ amount
  minOrderAmount: { type: Number, default: 0 },
  maxUses: { type: Number, default: null },        // null = unlimited
  usedCount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.PromoCode || mongoose.model('PromoCode', PromoCodeSchema);
