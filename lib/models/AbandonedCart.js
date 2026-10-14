import mongoose from 'mongoose';

const CartItemSchema = new mongoose.Schema({
  id: String,
  name: String,
  price: Number,
  quantity: Number,
  imageUrl: String,
  modifiers: { type: mongoose.Schema.Types.Mixed, default: [] },
  isFreeBogo: { type: Boolean, default: false },
}, { _id: false });

const AbandonedCartSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  token: { type: String, required: true, unique: true },
  items: [CartItemSchema],
  subtotal: { type: Number, default: 0 },
  pickupLocation: { type: String, default: '' },
  status: { type: String, enum: ['active', 'recovered', 'closed', 'unsubscribed'], default: 'active', index: true },
  lastActivityAt: { type: Date, default: Date.now, index: true },
  remindersSent: { type: Number, default: 0 },
  lastReminderAt: { type: Date, default: null },
  recoveredAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.AbandonedCart || mongoose.model('AbandonedCart', AbandonedCartSchema);
