import mongoose from 'mongoose';

const WalkInItemSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
});

const WalkInLogSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  items: [WalkInItemSchema],
  note: { type: String, default: '' },
  inventoryDeducted: { type: Boolean, default: true },
  source: { type: String, enum: ['manual', 'csv_import', 'shift4'], default: 'manual' },
  grossSales: { type: Number, default: 0 },
  netSales: { type: Number, default: 0 },
  discounts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.WalkInLog || mongoose.model('WalkInLog', WalkInLogSchema);
