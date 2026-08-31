import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, unique: true, lowercase: true },
  isActive: { type: Boolean, default: true },
  isComingSoon: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

LocationSchema.pre('validate', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  if (this.name) {
    this.name = this.name.trim();
  }
  next();
});

export default mongoose.models.Location || mongoose.model('Location', LocationSchema);
