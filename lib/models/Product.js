import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  category: String,
  imageUrl: String,
  inStock: { type: Boolean, default: true },
  stockCount: { type: Number, default: null }, // null = untracked
  lowStockThreshold: { type: Number, default: 5 },
  cupImageUrl: { type: String, default: '' },
  isNewItem: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);