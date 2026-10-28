import crypto from 'crypto';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/lib/models/Employee';
import EmployeeDocument from '@/lib/models/EmployeeDocument';
import OnboardingInvite from '@/lib/models/OnboardingInvite';

export const config = { api: { bodyParser: { sizeLimit: '3mb' } } };

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function parseImage(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length || buf.length > MAX_IMAGE_BYTES) return null;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if ((m[1] === 'image/jpeg' && !isJpeg) || (m[1] === 'image/png' && !isPng)) return null;
  return { buf, contentType: m[1] };
}

// GET  ?token=...  -> checks the invite and returns the store name
// POST {token, name, email, phone, idImage} -> creates the employee
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  await dbConnect();

  if (req.method === 'GET') {
    const token = String(req.query.token || '');
    const inv = token && (await OnboardingInvite.findOne({ tokenHash: sha256(token), usedAt: null, expiresAt: { $gt: new Date() } }).lean());
    if (!inv) return res.status(404).json({ error: 'This link is invalid, expired or already used. Ask your manager for a new one.' });
    return res.json({ locationName: inv.locationName || inv.location });
  }

  if (req.method !== 'POST') return res.status(405).end();

  const { token, name, email, phone, idImage } = req.body || {};
  const cleanName = String(name || '').trim().slice(0, 100);
  const cleanEmail = String(email || '').trim().toLowerCase().slice(0, 160);
  const cleanPhone = String(phone || '').trim().slice(0, 30);
  if (cleanName.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (cleanPhone.replace(/\D/g, '').length < 7 || !/^[0-9+()\-.\s]+$/.test(cleanPhone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
  const image = parseImage(idImage);
  if (!image) return res.status(400).json({ error: 'Please upload a clear JPG or PNG photo of your ID (under 2 MB).' });

  if (await Employee.exists({ email: cleanEmail })) {
    return res.status(409).json({ error: 'An employee with this email already exists. Please ask your manager.' });
  }

  // Claim the invite atomically so one link can only create one employee.
  const invite = await OnboardingInvite.findOneAndUpdate(
    { tokenHash: sha256(String(token || '')), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { new: true }
  );
  if (!invite) return res.status(404).json({ error: 'This link is invalid, expired or already used. Ask your manager for a new one.' });

  try {
    const guideToken = crypto.randomBytes(24).toString('hex');
    const emp = await Employee.create({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      role: 'staff',
      isActive: true,
      locations: [invite.location],
      guideToken,
      onboardedAt: new Date(),
    });
    await EmployeeDocument.create({ employee: emp._id, contentType: image.contentType, data: image.buf, size: image.buf.length });
    await OnboardingInvite.updateOne({ _id: invite._id }, { $set: { employee: emp._id } });
    return res.json({ ok: true, assignedId: emp.assignedId, guideToken });
  } catch (err) {
    console.error('Onboarding error:', err);
    await OnboardingInvite.updateOne({ _id: invite._id }, { $set: { usedAt: null } });
    const dup = err && err.code === 11000;
    return res.status(dup ? 409 : 500).json({ error: dup ? 'An employee with this email already exists. Please ask your manager.' : 'Could not save your information. Please try again.' });
  }
}
