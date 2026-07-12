import mongoose from 'mongoose';

const PaymentHistorySchema = new mongoose.Schema({
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  action: { type: String, enum: ['created', 'status_changed'], required: true },
  previousStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: null },
  newStatus: { type: String, enum: ['pending', 'paid', 'failed'], required: true },
  gross: { type: Number, default: 0 },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.PaymentHistory || mongoose.model('PaymentHistory', PaymentHistorySchema);
