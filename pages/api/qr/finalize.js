import { finalizeQrOrder } from '@/lib/qrOrder';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { paymentIntentId } = req.body || {};
  if (!paymentIntentId || !/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
    return res.status(400).json({ error: 'Invalid payment.' });
  }
  try {
    const order = await finalizeQrOrder(paymentIntentId);
    if (!order) return res.status(402).json({ error: 'Payment not completed.' });
    return res.status(200).json({ trackingNumber: order.trackingNumber });
  } catch (error) {
    console.error('QR finalize error:', error);
    return res.status(500).json({ error: 'Unable to confirm the order.' });
  }
}
