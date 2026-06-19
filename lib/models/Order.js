import mongoose from 'mongoose';

const ModifierItemSchema = new mongoose.Schema({
  groupName: String,
  options: [String],
});

const OrderItemSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: Number,
  modifiers: [ModifierItemSchema],
});

const AppliedPromotionSchema = new mongoose.Schema({
  promotionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion' },
  name: String,
  type: String,
  discountAmount: Number,
});

const OrderSchema = new mongoose.Schema({
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  items: [OrderItemSchema],
  totalAmount: Number,
  status: { type: String, default: 'pending' },
  stripePaymentIntentId: String,
  trackingNumber: { type: String, unique: true, default: () => Math.random().toString(36).substring(2, 10).toUpperCase() },
  orderType: { type: String, enum: ['pickup', 'delivery'], default: 'pickup' },
  deliveryAddress: { type: String, default: '' },
  scheduledTime: { type: Date, default: null },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  appliedPromotions: [AppliedPromotionSchema],
  couponCode: { type: String, default: null },
  couponDiscount: { type: Number, default: 0 },
  referralCode: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);