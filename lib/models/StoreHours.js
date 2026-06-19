import mongoose from 'mongoose';

const WeeklyHourSchema = new mongoose.Schema({
  day: { type: Number, required: true }, // 0=Sun … 6=Sat
  isOpen: { type: Boolean, default: true },
  openTime: { type: String, default: '10:00' },   // "HH:MM" 24-hour
  closeTime: { type: String, default: '21:00' },
}, { _id: false });

const SpecialHourSchema = new mongoose.Schema({
  date: { type: String, required: true }, // "YYYY-MM-DD"
  isOpen: { type: Boolean, default: false },
  openTime: { type: String, default: '10:00' },
  closeTime: { type: String, default: '21:00' },
  note: { type: String, default: '' },
}, { _id: false });

const StoreHoursSchema = new mongoose.Schema({
  weeklyHours: [WeeklyHourSchema],
  specialHours: [SpecialHourSchema],
  timezone: { type: String, default: 'America/New_York' },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.StoreHours || mongoose.model('StoreHours', StoreHoursSchema);
