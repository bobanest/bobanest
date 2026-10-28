import mongoose from 'mongoose';

// locations: store slugs this guide applies to. Empty means every store.
const GuideSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: { type: String, default: 'General', trim: true },
  order: { type: Number, default: 100 },
  locations: { type: [String], default: [] },
  body: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Guide || mongoose.model('Guide', GuideSchema);
