import crypto from 'crypto';
import dbConnect from '@/lib/dbConnect';
import Location from '@/lib/models/Location';
import OnboardingInvite from '@/lib/models/OnboardingInvite';
import Employee from '@/lib/models/Employee';
import EmployeeDocument from '@/lib/models/EmployeeDocument';

// Admin only (the proxy requires a login session for /api/admin/*).
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  await dbConnect();

  if (req.method === 'GET') {
    const [invites, employees] = await Promise.all([
      OnboardingInvite.find().sort({ createdAt: -1 }).limit(30).select('-tokenHash').lean(),
      Employee.find({ onboardedAt: { $exists: true } }).sort({ onboardedAt: -1 }).limit(50)
        .select('name email phone assignedId locations guideToken onboardedAt isActive').lean(),
    ]);
    const withId = new Set((await EmployeeDocument.find({ employee: { $in: employees.map((e) => e._id) } }).select('employee').lean()).map((d) => String(d.employee)));
    return res.json({ invites, employees: employees.map((e) => ({ ...e, hasId: withId.has(String(e._id)) })) });
  }

  if (req.method === 'POST') {
    const slug = String(req.body?.location || '');
    const loc = await Location.findOne({ slug }).lean();
    if (!loc) return res.status(400).json({ error: 'Choose a store.' });
    const token = crypto.randomBytes(24).toString('hex');
    const inv = await OnboardingInvite.create({
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      location: loc.slug,
      locationName: loc.name,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });
    // The raw token is returned only now; only its hash is stored.
    return res.json({ id: inv._id, token, locationName: loc.name, expiresAt: inv.expiresAt });
  }

  if (req.method === 'DELETE') {
    await OnboardingInvite.updateOne({ _id: req.query.id, usedAt: null }, { $set: { expiresAt: new Date() } });
    return res.json({ ok: true });
  }

  res.status(405).end();
}
