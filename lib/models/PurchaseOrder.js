import mongoose from 'mongoose';

const POItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, default: 'unit' },
  unitCost: { type: Number, required: true },
  conversionFactor: { type: Number, default: 1 }, // e.g. 1 case = 6 bags → conversionFactor=6
  inventoryUnit: { type: String, default: '' },    // unit that inventory tracks (e.g. "bags")
});

const PurchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    unique: true,
    default: () => 'PO-' + Date.now().toString(36).toUpperCase(),
  },
  vendor: { type: String, required: true },
  vendorEmail: { type: String, default: '' },
  items: [POItemSchema],
  totalCost: { type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  taxRate: { type: Number, default: 7 },
  taxAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'received', 'cancelled'],
    default: 'draft',
  },
  notes: { type: String, default: '' },
  submittedAt: { type: Date, default: null },
  receivedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', PurchaseOrderSchema);
