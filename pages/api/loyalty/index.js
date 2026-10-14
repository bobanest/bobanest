import dbConnect from '@/lib/dbConnect';
import Customer from '@/lib/models/Customer';
import * as yup from 'yup';

// 100 points = $5 reward
export const POINTS_PER_DOLLAR = 1;
export const POINTS_PER_REWARD = 100;
export const REWARD_VALUE = 5;

export function getLoyaltyTier(points) {
  if (points >= 1000) return { name: 'Gold', color: 'text-yellow-500', min: 1000 };
  if (points >= 500) return { name: 'Silver', color: 'text-gray-500', min: 500 };
  return { name: 'Bronze', color: 'text-orange-400', min: 0 };
}

export default async function handler(req, res) {
  await dbConnect();

  // GET: look up customer by email
  if (req.method === 'GET') {
    const schema = yup.object({ email: yup.string().email().required() });
    try {
      await schema.validate(req.query, { abortEarly: false });
      const { email } = req.query;
      const customer = await Customer.findOne({ email: email.toLowerCase() }).select('points').lean();
      if (!customer) return res.status(404).json({ error: 'Not found' });
      return res.json({ points: customer.points || 0 });
    } catch (err) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
  }

  // Redemption now happens server-side during checkout with a verified reward token.
  if (req.method === 'POST') {
    return res.status(410).json({ error: 'Redeem points at checkout' });
  }

  res.status(405).end();
}
