import dbConnect from '@/lib/dbConnect';
import Employee from '@/lib/models/Employee';
import Guide from '@/lib/models/Guide';
import Location from '@/lib/models/Location';

// Public (token-protected): guides for one employee's store(s).
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).end();
  const token = String(req.query.token || '');
  if (!/^[a-f0-9]{48}$/.test(token)) return res.status(404).json({ error: 'Link not found.' });

  await dbConnect();
  const emp = await Employee.findOne({ guideToken: token, isActive: true }).lean();
  if (!emp) return res.status(404).json({ error: 'Link not found.' });

  const locs = emp.locations || [];
  const guides = await Guide.find({ $or: [{ locations: { $size: 0 } }, { locations: { $in: locs } }] })
    .sort({ order: 1, title: 1 })
    .select('title category order body')
    .lean();
  const stores = await Location.find({ slug: { $in: locs } }).select('name').lean();
  return res.json({
    firstName: String(emp.name || '').split(' ')[0],
    stores: stores.map((s) => s.name),
    guides,
  });
}
