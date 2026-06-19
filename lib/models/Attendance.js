import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  type: { type: String, enum: ['login', 'logout'], required: true },
  timestamp: { type: Date, default: Date.now },
  ip: { type: String },
  userAgent: { type: String }
});

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
