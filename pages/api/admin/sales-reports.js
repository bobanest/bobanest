import dbConnect from '@/lib/dbConnect';
import SalesReport from '@/lib/models/SalesReport';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const reports = await SalesReport.find().sort({ reportDate: -1, receivedAt: -1 }).limit(120).lean();
    return res.json(reports);
  }

  if (req.method === 'PUT') {
    const { id, reportDate, location } = req.body || {};
    const set = {};
    if (reportDate !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(reportDate))) return res.status(400).json({ error: 'Invalid date' });
      set.reportDate = reportDate;
    }
    if (location !== undefined) set.location = String(location).toLowerCase().slice(0, 80);
    const doc = await SalesReport.findByIdAndUpdate(id, { $set: set }, { new: true }).lean();
    if (!doc) return res.status(404).json({ error: 'Not found' });
    return res.json(doc);
  }

  if (req.method === 'DELETE') {
    await SalesReport.deleteOne({ _id: String(req.query.id || '') });
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
