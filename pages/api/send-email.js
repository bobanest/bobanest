
import { Resend } from 'resend';
import * as yup from 'yup';
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Yup validation schema for email
  const schema = yup.object({
    to: yup.string().email().required(),
    subject: yup.string().required(),
    html: yup.string().required(),
  });
  try {
    await schema.validate(req.body, { abortEarly: false });
    const { to, subject, html } = req.body;
    const { data, error } = await resend.emails.send({
      from: 'Bobanest <orders@bobanest.com>',
      to: [to],
      subject,
      html,
    });
    if (error) return res.status(400).json(error);
    res.status(200).json(data);
  } catch (err) {
    res.status(400).json({ error: 'Validation failed', details: err.errors });
  }
}