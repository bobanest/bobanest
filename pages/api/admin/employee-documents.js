import dbConnect from '@/lib/dbConnect';
import EmployeeDocument from '@/lib/models/EmployeeDocument';

// Admin only. GET streams the ID photo, DELETE removes it.
export default async function handler(req, res) {
  await dbConnect();
  const employee = String(req.query.employeeId || '');
  if (!/^[a-f0-9]{24}$/.test(employee)) return res.status(400).json({ error: 'Bad id' });

  if (req.method === 'GET') {
    const doc = await EmployeeDocument.findOne({ employee }).sort({ createdAt: -1 });
    if (!doc) return res.status(404).json({ error: 'No ID on file' });
    res.setHeader('Content-Type', doc.contentType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    return res.end(doc.data);
  }

  if (req.method === 'DELETE') {
    await EmployeeDocument.deleteMany({ employee });
    return res.json({ ok: true });
  }

  res.status(405).end();
}
