import mongoose from 'mongoose';

const OnboardingInviteSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  locationName: { type: String, default: '' },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.OnboardingInvite || mongoose.model('OnboardingInvite', OnboardingInviteSchema);
