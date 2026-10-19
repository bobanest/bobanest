import mongoose from 'mongoose';

const SlideSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  durationSec: { type: Number, default: 0 }, // 0 = use screen default
  isActive: { type: Boolean, default: true },
});

const TvScreenSchema = new mongoose.Schema({
  location: { type: String, required: true, unique: true, lowercase: true, trim: true },
  defaultDuration: { type: Number, default: 10, min: 2, max: 600 },
  transition: { type: String, enum: ['fade', 'slide', 'none'], default: 'fade' },
  fit: { type: String, enum: ['cover', 'contain'], default: 'contain' },
  slides: [SlideSchema],
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.TvScreen || mongoose.model('TvScreen', TvScreenSchema);
