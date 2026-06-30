import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const OWNER_EMAIL = 'bobanest.us@gmail.com';
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

export async function sendOwnerEmail({ subject, html, text }) {
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const transporter = createGmailTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER || DEFAULT_SENDER_EMAIL,
        to: OWNER_EMAIL,
        subject,
        html,
        text,
      });
      return { sent: true, provider: 'gmail' };
    } catch (err) {
      console.error('Owner email via Gmail failed:', err.message);
    }
  }

  if (process.env.RESEND_API_KEY && fromEmail) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: fromEmail,
        to: [OWNER_EMAIL],
        subject,
        html,
        text,
      });
      return { sent: true, provider: 'resend' };
    } catch (err) {
      console.error('Owner email via Resend failed:', err.message);
      return { sent: false, provider: 'resend', error: err.message };
    }
  }

  return {
    sent: false,
    provider: 'none',
    error: 'No valid sender configured. Set EMAIL_USER/EMAIL_PASS or RESEND_FROM_EMAIL.',
  };
}
