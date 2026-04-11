// lib/models/DailyPost.js
import mongoose from 'mongoose';

const DailyPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

export default mongoose.models.DailyPost || mongoose.model('DailyPost', DailyPostSchema);