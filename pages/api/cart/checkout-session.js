import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { items } = req.body;
  const lineItems = items.map(item => ({
    price_data: { currency: 'usd', product_data: { name: item.name }, unit_amount: Math.round(item.price * 100) },
    quantity: item.quantity,
  }));
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: `${req.headers.origin}/?success=true`,
    cancel_url: `${req.headers.origin}/cart`,
  });
  res.status(200).json({ id: session.id });
}