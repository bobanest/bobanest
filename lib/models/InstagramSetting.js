import mongoose from 'mongoose';

const InstagramSettingSchema = new mongoose.Schema({
  instagramHandle: { type: String, default: 'bobanest.us' },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.InstagramSetting || mongoose.model('InstagramSetting', InstagramSettingSchema);