import mongoose from 'mongoose';

const EmployeeDocumentSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  kind: { type: String, default: 'government-id' },
  contentType: { type: String, required: true },
  data: { type: Buffer, required: true },
  size: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.EmployeeDocument || mongoose.model('EmployeeDocument', EmployeeDocumentSchema);
