import dbConnect from '@/lib/dbConnect';
import PaymentHistory from '@/lib/models/PaymentHistory';

export default async function handler(req, res) {
  await dbConnect();

  const secret = req.headers['x-employee-secret'] || req.body?.secret;
  if (!process.env.EMPLOYEE_API_SECRET || secret !== process.env.EMPLOYEE_API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const list = await PaymentHistory.find({})
      .populate('employee')
      .populate('payment')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    return res.json(list);
  }

  res.status(405).end();
}
