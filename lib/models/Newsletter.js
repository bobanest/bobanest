import mongoose from 'mongoose';

const NewsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  subscribedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
});

export default mongoose.models.Newsletter || mongoose.model('Newsletter', NewsletterSchema);
