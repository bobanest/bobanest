import Stripe from 'stripe';
import * as yup from 'yup';
import dbConnect from '@/lib/dbConnect';
import GiftCard from '@/lib/models/GiftCard';
import { generateUniqueGiftCardCode } from '@/lib/giftCardService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const schema = yup.object({
  purchaserName: yup.string().required(),
  purchaserEmail: yup.string().email().required(),
  recipientName: yup.string().required(),
  recipientEmail: yup.string().email().required(),
  amount: yup.number().required().min(10).max(500),
  message: yup.string().max(300).optional().nullable(),
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await dbConnect();

  try {
    await schema.validate(req.body, { abortEarly: false });
    const purchaserName = String(req.body.purchaserName || '').trim();
    const purchaserEmail = String(req.body.purchaserEmail || '').trim().toLowerCase();
    const recipientName = String(req.body.recipientName || '').trim();
    const recipientEmail = String(req.body.recipientEmail || '').trim().toLowerCase();
    const message = String(req.body.message || '').trim();
    const amount = Math.round(Number(req.body.amount || 0) * 100) / 100;

    const code = await generateUniqueGiftCardCode();
    const giftCard = await GiftCard.create({
      code,
      purchaserName,
      purchaserEmail,
      recipientName,
      recipientEmail,
      message,
      initialAmount: amount,
      balance: amount,
      status: 'pending_payment',
      deliveryStatus: 'pending',
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: purchaserEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Bobanest Virtual Gift Card`,
              description: `For ${recipientName}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/gift-cards?success=1`,
      cancel_url: `${req.headers.origin}/gift-cards?canceled=1`,
      metadata: {
        giftCardId: giftCard._id.toString(),
      },
    });

    return res.status(200).json({ id: session.id });
  } catch (error) {
    console.error('Gift card purchase session error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
}
