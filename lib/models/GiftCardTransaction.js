import mongoose from 'mongoose';

const GiftCardTransactionSchema = new mongoose.Schema(
  {
    giftCard: { type: mongoose.Schema.Types.ObjectId, ref: 'GiftCard', required: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    type: {
      type: String,
      enum: ['purchase', 'redeem', 'refund', 'adjustment'],
      required: true,
    },
    channel: {
      type: String,
      enum: ['web', 'in_store', 'admin', 'system'],
      default: 'system',
    },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true, min: 0 },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    employeeAssignedId: { type: String, default: '' },
    stripeSessionId: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

GiftCardTransactionSchema.index({ code: 1, createdAt: -1 });
GiftCardTransactionSchema.index({ type: 1, stripeSessionId: 1 });

export default mongoose.models.GiftCardTransaction || mongoose.model('GiftCardTransaction', GiftCardTransactionSchema);
