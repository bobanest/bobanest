import dbConnect from '@/lib/dbConnect';
import Payment from '@/lib/models/Payment';

export default async function handler(req, res) {
  await dbConnect();
  const secret = req.headers['x-employee-secret'] || req.body?.secret;
  const validSecret = process.env.EMPLOYEE_API_SECRET || process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET;
  if (!validSecret || secret !== validSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing payment id' });

  if (req.method === 'PATCH') {
    const { status } = req.body;
    if (!['pending', 'paid', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    try {
      const payment = await Payment.findByIdAndUpdate(id, { status }, { new: true }).lean();
      if (!payment) return res.status(404).json({ error: 'Payment not found' });
      return res.json(payment);
    } catch (err) {
      console.error('Update payment error:', err);
      return res.status(500).json({ error: 'Failed to update payment status' });
    }
  }

  res.status(405).end();
}
