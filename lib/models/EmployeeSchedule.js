import mongoose from 'mongoose';

const EmployeeScheduleSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  title: { type: String, trim: true, default: 'Shift' },
  startAt: { type: Date, required: true, index: true },
  endAt: { type: Date, required: true, index: true },
  notes: { type: String, trim: true, default: '' },
  createdBy: { type: String, trim: true, default: 'admin' },
  isCancelled: { type: Boolean, default: false, index: true },
}, {
  timestamps: true,
});

EmployeeScheduleSchema.index({ employee: 1, startAt: 1 });

export default mongoose.models.EmployeeSchedule || mongoose.model('EmployeeSchedule', EmployeeScheduleSchema);
