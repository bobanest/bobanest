import mongoose from 'mongoose';

const GiftCardSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    purchaserName: { type: String, default: '' },
    purchaserEmail: { type: String, default: '' },
    recipientName: { type: String, default: '' },
    recipientEmail: { type: String, default: '' },
    message: { type: String, default: '' },
    initialAmount: { type: Number, required: true, min: 0 },
    balance: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['pending_payment', 'active', 'locked', 'expired', 'fully_redeemed'],
      default: 'pending_payment',
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
    deliverySentAt: { type: Date, default: null },
    stripeSessionId: { type: String, default: '' },
    stripePaymentIntentId: { type: String, default: '' },
    purchasedAt: { type: Date, default: null },
    lastRedeemedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

GiftCardSchema.index({ recipientEmail: 1, createdAt: -1 });
GiftCardSchema.index({ purchaserEmail: 1, createdAt: -1 });

export default mongoose.models.GiftCard || mongoose.model('GiftCard', GiftCardSchema);
