// lib/models/Visitor.js
import mongoose from 'mongoose';

const VisitorSchema = new mongoose.Schema({
  ip: String,
  city: String,
  region: String,
  country: String,
  lat: Number,
  lon: Number,
  userAgent: String,
  visitedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Visitor || mongoose.model('Visitor', VisitorSchema);