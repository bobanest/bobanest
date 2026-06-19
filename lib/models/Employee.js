import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema({
  assignedId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    default: () => `EMP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  role: { type: String, default: 'staff' },
  hourlyRate: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
