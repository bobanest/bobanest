import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  customerName: String,
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: String,
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);