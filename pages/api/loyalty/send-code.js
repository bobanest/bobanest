import nodemailer from 'nodemailer';
import dbConnect from '@/lib/dbConnect';
import Customer from '@/lib/models/Customer';

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body;
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    await dbConnect();
    const emailLower = email.toLowerCase().trim();

    const code = generateCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await Customer.findOneAndUpdate(
      { email: emailLower },
      { $set: { verificationCode: code, verificationCodeExpiry: expiry } },
      { upsert: true, setDefaultsOnInsert: true }
    );

    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Bobanest Rewards" <${process.env.EMAIL_USER}>`,
      to: emailLower,
      subject: 'Your Bobanest Verification Code',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px;">
          <h2 style="color: #e91e8c; margin: 0 0 8px;">Bobanest Rewards 🧋</h2>
          <p style="color: #555; margin-bottom: 24px;">Enter this code to check your loyalty points:</p>
          <div style="font-size: 44px; font-weight: 900; letter-spacing: 12px; color: #e91e8c; padding: 24px 16px; background: #fff0f8; border-radius: 12px; text-align: center; border: 2px solid #f9a8d4;">
            ${code}
          </div>
          <p style="color: #999; font-size: 13px; margin-top: 20px;">
            This code expires in <strong>10 minutes</strong>. If you didn't request this, you can safely ignore it.
          </p>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('send-code error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
