import dbConnect from '@/lib/dbConnect';
import Payment from '@/lib/models/Payment';

export default async function handler(req, res) {
  await dbConnect();
  const secret = req.headers['x-employee-secret'] || req.body?.secret;
  const validSecret = process.env.EMPLOYEE_API_SECRET || process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET;
  if (!validSecret || secret !== validSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { start, end, status } = req.query;
    const query = {};

    if (start) {
      query.periodStart = { $gte: new Date(start) };
    }

    if (end) {
      query.periodEnd = { $lte: new Date(end) };
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const list = await Payment.find(query).populate('employee').sort({ createdAt: -1 }).lean();
    return res.json(list);
  }

  if (req.method === 'POST') {
    const { employeeId, periodStart, periodEnd, hours, gross } = req.body;
    if (!employeeId || !periodStart || !periodEnd) return res.status(400).json({ error: 'Missing fields' });
    try {
      const p = await Payment.create({ employee: employeeId, periodStart, periodEnd, hours: hours || 0, gross: gross || 0, status: 'pending' });
      return res.json(p);
    } catch (err) {
      console.error('Create payment error:', err);
      return res.status(500).json({ error: 'Failed to create payment' });
    }
  }

  res.status(405).end();
}
