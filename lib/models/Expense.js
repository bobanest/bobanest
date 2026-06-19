import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  category: {
    type: String,
    enum: ['ingredients', 'packaging', 'equipment', 'rent', 'utilities', 'marketing', 'labor', 'other'],
    default: 'other',
  },
  date: { type: Date, required: true },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
