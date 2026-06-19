import mongoose from 'mongoose';

const HeroSettingSchema = new mongoose.Schema({
  imageUrl: { type: String, default: '/hero-default.jpg' },
  title: { type: String, default: 'Fresh Bubble Tea Delivered to You' },
  subtitle: { type: String, default: 'Handcrafted with premium ingredients. Order online for pickup or delivery.' },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.HeroSetting || mongoose.model('HeroSetting', HeroSettingSchema);