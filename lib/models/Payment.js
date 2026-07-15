import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  employeeName: { type: String, default: '' },
  paymentDate: { type: Date, default: Date.now },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  hours: { type: Number, default: 0 },
  totalHours: { type: Number, default: 0 },
  paidHours: { type: Number, default: 0 },
  gross: { type: Number, default: 0 },
  status: { type: String, enum: ['pending','paid','failed'], default: 'pending' },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
