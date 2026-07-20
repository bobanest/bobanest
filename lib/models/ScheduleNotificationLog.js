import mongoose from 'mongoose';

const ScheduleNotificationLogSchema = new mongoose.Schema({
  type: { type: String, enum: ['weekly_summary', 'shift_reminder'], required: true, index: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  schedule: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeSchedule', default: null },
  weekStart: { type: Date, default: null },
  sentAt: { type: Date, default: Date.now, index: true },
}, {
  timestamps: true,
});

ScheduleNotificationLogSchema.index(
  { type: 1, schedule: 1 },
  { unique: true, partialFilterExpression: { type: 'shift_reminder', schedule: { $type: 'objectId' } } }
);

ScheduleNotificationLogSchema.index(
  { type: 1, employee: 1, weekStart: 1 },
  { unique: true, partialFilterExpression: { type: 'weekly_summary', weekStart: { $type: 'date' } } }
);

export default mongoose.models.ScheduleNotificationLog || mongoose.model('ScheduleNotificationLog', ScheduleNotificationLogSchema);
