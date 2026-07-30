import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const DEFAULT_SENDER_EMAIL = 'bobanest.us@gmail.com';

function createGmailTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function sendMarketingEmail({ to, subject, html, text }) {
  const safeTo = String(to || '').trim().toLowerCase();
  if (!safeTo) return { sent: false, provider: 'none', error: 'Recipient email is required' };

  const transporter = createGmailTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER || DEFAULT_SENDER_EMAIL,
        to: safeTo,
        subject,
        html,
        text,
      });
      return { sent: true, provider: 'gmail' };
    } catch (err) {
      console.error('Marketing email via Gmail failed:', err.message);
    }
  }

  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: [safeTo],
        subject,
        html,
        text,
      });
      return { sent: true, provider: 'resend' };
    } catch (err) {
      console.error('Marketing email via Resend failed:', err.message);
      return { sent: false, provider: 'resend', error: err.message };
    }
  }

  return {
    sent: false,
    provider: 'none',
    error: 'No valid sender configured. Set EMAIL_USER/EMAIL_PASS or RESEND_FROM_EMAIL.',
  };
}
