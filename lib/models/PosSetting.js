import mongoose from 'mongoose';

const PosSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.PosSetting || mongoose.model('PosSetting', PosSettingSchema);
