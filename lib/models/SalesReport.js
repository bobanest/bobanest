import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema({
  item: String,
  revenueClass: String,
  department: String,
  qty: Number,
  grossSales: Number,
  discounts: Number,
  netSales: Number,
}, { _id: false });

const SalesReportSchema = new mongoose.Schema({
  emailId: { type: String, required: true, unique: true },
  location: { type: String, default: '', index: true },
  locationTag: { type: String, default: '' },
  reportDate: { type: String, required: true, index: true },
  subject: { type: String, default: '' },
  fromAddress: { type: String, default: '' },
  filename: { type: String, default: '' },
  receivedAt: { type: Date, default: Date.now },
  items: [ItemSchema],
  totals: {
    qty: { type: Number, default: 0 },
    grossSales: { type: Number, default: 0 },
    discounts: { type: Number, default: 0 },
    netSales: { type: Number, default: 0 },
  },
}, { timestamps: true });

export default mongoose.models.SalesReport || mongoose.model('SalesReport', SalesReportSchema);
