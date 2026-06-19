import mongoose from 'mongoose';

const FavoriteOrderItemSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: Number,
  imageUrl: String,
  modifiers: [{ groupName: String, options: [String] }],
  id: String,
});

const FavoriteOrderSchema = new mongoose.Schema({
  label: { type: String, required: true },
  items: [FavoriteOrderItemSchema],
  createdAt: { type: Date, default: Date.now },
});

const CustomerSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  points: { type: Number, default: 0 },
  favoriteOrders: [FavoriteOrderSchema],
  referralCode: { type: String, default: null, sparse: true },
  referredBy: { type: String, default: null },
  verificationCode: { type: String, default: null },
  verificationCodeExpiry: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);