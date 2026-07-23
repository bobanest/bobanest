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

export async function sendGiftCardEmail({
  to,
  recipientName,
  purchaserName,
  code,
  amount,
  balance,
  message = '',
}) {
  const safeTo = String(to || '').trim().toLowerCase();
  if (!safeTo) return { sent: false, provider: 'none', error: 'Recipient email is required' };

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const transporter = createGmailTransporter();
  const subject = `${purchaserName || 'Someone'} sent you a Bobanest gift card!`;
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,';
  const optionalMessage = message ? `<p><strong>Message:</strong> ${message}</p>` : '';
  const html = `
    <p>${greeting}</p>
    <p>${purchaserName || 'A customer'} sent you a Bobanest virtual gift card.</p>
    <p><strong>Gift Card Code:</strong> ${code}</p>
    <p><strong>Amount:</strong> $${Number(amount || 0).toFixed(2)}</p>
    <p><strong>Current Balance:</strong> $${Number(balance || 0).toFixed(2)}</p>
    ${optionalMessage}
    <p>You can use this code online at checkout or in-store with our team.</p>
  `;
  const text = `${recipientName ? `Hi ${recipientName},` : 'Hi,'}

${purchaserName || 'A customer'} sent you a Bobanest virtual gift card.
Gift Card Code: ${code}
Amount: $${Number(amount || 0).toFixed(2)}
Current Balance: $${Number(balance || 0).toFixed(2)}
${message ? `Message: ${message}` : ''}

You can use this code online at checkout or in-store with our team.`;

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
      console.error('Gift card email via Gmail failed:', err.message);
    }
  }

  if (process.env.RESEND_API_KEY && fromEmail) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: fromEmail,
        to: [safeTo],
        subject,
        html,
        text,
      });
      return { sent: true, provider: 'resend' };
    } catch (err) {
      console.error('Gift card email via Resend failed:', err.message);
      return { sent: false, provider: 'resend', error: err.message };
    }
  }

  return {
    sent: false,
    provider: 'none',
    error: 'No valid sender configured. Set EMAIL_USER/EMAIL_PASS or RESEND_FROM_EMAIL.',
  };
}
