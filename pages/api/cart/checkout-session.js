
import Stripe from 'stripe';
import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';
import Customer from '@/lib/models/Customer';
import PromoCode from '@/lib/models/PromoCode';
import StoreHours from '@/lib/models/StoreHours';
import { getStoreStatusAt, isDateTimeOpen } from '@/lib/storeHoursHelper';
import { sendOwnerEmail } from '@/lib/ownerEmail';
import * as yup from 'yup';
import { POINTS_PER_DOLLAR } from '../loyalty';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DELIVERY_FEE_AMOUNT = 4.99;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await dbConnect();

  // Yup validation schema
  const schema = yup.object({
    items: yup.array().of(
      yup.object({
        name: yup.string().required(),
        price: yup.number().required().min(0),
        quantity: yup.number().required().min(1),
        modifiers: yup.array().optional(),
      })
    ).min(1).required(),
    orderType: yup.string().oneOf(['pickup', 'delivery']).optional(),
    deliveryAddress: yup.string().optional().nullable(),
    appliedPromotions: yup.array().of(
      yup.object({
        promotionId: yup.string().optional(),
        name: yup.string().optional(),
        type: yup.string().optional(),
        discountAmount: yup.number().optional(),
      })
    ).optional(),
    customerEmail: yup.string().email().optional().nullable(),
    customerPhone: yup.string().optional().nullable(),
    scheduledTime: yup.string().optional().nullable(),
    loyaltyDiscount: yup.number().min(0).optional(),
    loyaltyPointsUsed: yup.number().min(0).optional(),
    couponCode: yup.string().optional().nullable(),
    referralCode: yup.string().optional().nullable(),
  });

  try {
    await schema.validate(req.body, { abortEarly: false });
    const {
      items,
      orderType = 'pickup',
      deliveryAddress,
      appliedPromotions,
      customerEmail,
      customerPhone,
      scheduledTime,
      loyaltyDiscount = 0,
      loyaltyPointsUsed = 0,
      couponCode,
      referralCode,
    } = req.body;
    const safeAppliedPromotions = Array.isArray(appliedPromotions) ? appliedPromotions : [];
    const normalizedPromotions = safeAppliedPromotions.filter((promo) => promo?.type !== 'free_delivery');

    // ── Store hours validation ─────────────────────────────────────────────
    const storeHoursDoc = await StoreHours.findOne({}).lean();
    if (storeHoursDoc) {
      const nowStatus = getStoreStatusAt(storeHoursDoc, new Date());
      if (!nowStatus.isOpen && !scheduledTime) {
        return res.status(400).json({ error: 'We are currently closed. Please schedule your order for a future time when we are open.' });
      }
      if (scheduledTime && !isDateTimeOpen(storeHoursDoc, new Date(scheduledTime))) {
        return res.status(400).json({ error: 'The selected time is outside our opening hours. Please choose a time when we are open.' });
      }
    }

    // Server-side coupon validation
    let couponDiscount = 0;
    let validatedCouponCode = null;
    if (couponCode) {
      const subtotalForCoupon = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const promo = await PromoCode.findOne({ code: couponCode.toUpperCase().trim(), isActive: true });
      if (promo && (!promo.expiresAt || new Date() <= promo.expiresAt) && (promo.maxUses === null || promo.usedCount < promo.maxUses) && subtotalForCoupon >= promo.minOrderAmount) {
        const raw = promo.type === 'percentage' ? subtotalForCoupon * promo.value / 100 : promo.value;
        couponDiscount = Math.min(raw, subtotalForCoupon);
        validatedCouponCode = promo.code;
        // Atomically increment usage
        await PromoCode.findByIdAndUpdate(promo._id, { $inc: { usedCount: 1 } });
      }
    }

    const isDelivery = orderType === 'delivery';
    const safeDeliveryAddress = isDelivery ? String(deliveryAddress || '').trim() : '';
    if (isDelivery && !safeDeliveryAddress) {
      return res.status(400).json({ error: 'Delivery address is required for delivery orders.' });
    }

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFeeAmount = isDelivery ? DELIVERY_FEE_AMOUNT : 0;
    const discountAmount = normalizedPromotions.reduce((sum, p) => sum + (p.discountAmount || 0), 0);
    const provisionalTotal = Math.max(0, subtotal + deliveryFeeAmount - discountAmount - loyaltyDiscount - couponDiscount);

    // Generate a referral code for new customers
    const newReferralCode = `BN${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create a temporary order in database with the provisional total
    const trackingNumber = Math.random().toString(36).substring(2, 10).toUpperCase();
    const order = await Order.create({
      customerName: 'Guest',
      customerEmail: customerEmail ? customerEmail.toLowerCase() : '',
      customerPhone: customerPhone || '',
      items: items.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        modifiers: item.modifiers || [],
      })),
      totalAmount: provisionalTotal, // store provisional total
      status: 'pending',
      orderType,
      deliveryAddress: safeDeliveryAddress,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
      trackingNumber,
      paymentStatus: 'pending',
      appliedPromotions: normalizedPromotions,
      couponCode: validatedCouponCode,
      couponDiscount,
      referralCode: referralCode ? referralCode.toUpperCase().trim() : null,
    });

    const orderPlacedHtml = `
      <h3>New Order Placed (Pending Payment)</h3>
      <p><strong>Tracking #:</strong> ${trackingNumber}</p>
      <p><strong>Type:</strong> ${orderType.toUpperCase()}</p>
      ${isDelivery ? `<p><strong>Address:</strong> ${safeDeliveryAddress}</p>` : ''}
      <p><strong>Email:</strong> ${customerEmail || 'N/A'}</p>
      <p><strong>Phone:</strong> ${customerPhone || 'N/A'}</p>
      <p><strong>Total:</strong> $${provisionalTotal.toFixed(2)}</p>
    `;
    sendOwnerEmail({
      subject: `Order Placed: #${trackingNumber}`,
      html: orderPlacedHtml,
    }).catch((err) => console.error('Order placed email failed:', err.message));

    // Upsert customer with a referral code if they don't have one yet
    if (customerEmail) {
      await Customer.findOneAndUpdate(
        { email: customerEmail.toLowerCase() },
        { $setOnInsert: { referralCode: newReferralCode, name: '', favoriteOrders: [] } },
        { upsert: true }
      );
    }

    // Deduct loyalty points used (already validated on client, deduct optimistically)
    if (loyaltyPointsUsed > 0 && customerEmail) {
      await Customer.findOneAndUpdate(
        { email: customerEmail.toLowerCase() },
        { $inc: { points: -loyaltyPointsUsed } }
      );
    }

    // Build Stripe line items (same as before, include delivery fee and discount as separate line items)
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));
    if (deliveryFeeAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Delivery Fee' },
          unit_amount: Math.round(deliveryFeeAmount * 100),
        },
        quantity: 1,
      });
    }
    if (discountAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Discount' },
          unit_amount: -Math.round(discountAmount * 100),
        },
        quantity: 1,
      });
    }
    if (couponDiscount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: `Coupon: ${validatedCouponCode}` },
          unit_amount: -Math.round(couponDiscount * 100),
        },
        quantity: 1,
      });
    }
    if (loyaltyDiscount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Loyalty Reward Discount' },
          unit_amount: -Math.round(loyaltyDiscount * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.origin}/track-order?order_id=${order._id}`,
      cancel_url: `${req.headers.origin}/cart`,
      metadata: {
        orderId: order._id.toString(),
        appliedPromotions: JSON.stringify(normalizedPromotions),
        customerEmail: customerEmail || '',
        customerPhone: customerPhone || '',
        orderType,
        loyaltyDiscount: loyaltyDiscount.toString(),
      },
    });

    res.status(200).json({ id: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message });
  }
}