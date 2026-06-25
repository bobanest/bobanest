import dbConnect from '@/lib/dbConnect';
import Customer from '@/lib/models/Customer';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { code } = req.query;
  if (!code) return res.status(400).json({ valid: false, error: 'Code required' });

  await dbConnect();
  const customer = await Customer.findOne({ referralCode: code.toUpperCase().trim() });
  if (!customer) return res.status(404).json({ valid: false, error: 'Invalid referral code' });

  return res.json({ valid: true, referrerName: customer.name || 'a Bobanest friend' });
}
