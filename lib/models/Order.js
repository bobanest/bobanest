// lib/models/Order.js
import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    quantity: Number,
    price: Number,
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  stripePaymentIntentId: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);