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
      const customer = await Customer.findOne({ email: email.toLowerCase() });
      if (!customer) return res.status(404).json({ error: 'Not found' });
      return res.json(customer);
    } catch (err) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
  }

  // POST: redeem points for a discount
  // body: { email, pointsToRedeem }
  if (req.method === 'POST') {
    const { email, pointsToRedeem } = req.body;
    if (!email || !pointsToRedeem) return res.status(400).json({ error: 'email and pointsToRedeem required' });
    const pts = parseInt(pointsToRedeem, 10);
    if (isNaN(pts) || pts < POINTS_PER_REWARD || pts % POINTS_PER_REWARD !== 0)
      return res.status(400).json({ error: `Points must be a multiple of ${POINTS_PER_REWARD}` });

    const customer = await Customer.findOne({ email: email.toLowerCase() });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (customer.points < pts) return res.status(400).json({ error: 'Not enough points' });

    const discount = (pts / POINTS_PER_REWARD) * REWARD_VALUE;
    customer.points -= pts;
    await customer.save();
    return res.json({ success: true, discount, pointsUsed: pts, remainingPoints: customer.points });
  }

  res.status(405).end();
}
