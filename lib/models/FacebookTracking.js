import mongoose from 'mongoose';

const FacebookTrackingSchema = new mongoose.Schema({
  pixelId: { type: String, default: '' },
  accessToken: { type: String, default: '' }, // For Conversion API
  enabled: { type: Boolean, default: false },
  testEventCode: { type: String, default: '' }, // For testing
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.FacebookTracking || mongoose.model('FacebookTracking', FacebookTrackingSchema);