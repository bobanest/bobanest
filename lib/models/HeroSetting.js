import mongoose from 'mongoose';

const HeroSettingSchema = new mongoose.Schema({
  imageUrl: { type: String, default: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=1600&q=80' },
  title: { type: String, default: 'Fresh Bubble Tea Delivered to You' },
  subtitle: { type: String, default: 'Handcrafted with premium ingredients. Order online for pickup or delivery.' },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.HeroSetting || mongoose.model('HeroSetting', HeroSettingSchema);