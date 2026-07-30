import mongoose from 'mongoose';

const MarketingAutomationLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['abandoned_cart', 'post_purchase_review', 'win_back'],
    required: true,
    index: true,
  },
  dedupeKey: { type: String, required: true, unique: true },
  customerEmail: { type: String, required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  sentAt: { type: Date, default: Date.now, index: true },
  windowStart: { type: Date, default: null },
  context: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
});

export default mongoose.models.MarketingAutomationLog || mongoose.model('MarketingAutomationLog', MarketingAutomationLogSchema);
