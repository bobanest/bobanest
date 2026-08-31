import dbConnect from '@/lib/dbConnect';
import Location from '@/lib/models/Location';

const DEFAULT_LOCATIONS = [
  {
    name: '5004 Mission Sq Ln, Zephyrhills',
    slug: '5004-mission-sq-ln-zephyrhills',
    isActive: true,
    isComingSoon: false,
  },
  {
    name: 'Premium Outlet, Lutz (Coming Soon)',
    slug: 'premium-outlet-lutz-coming-soon',
    isActive: true,
    isComingSoon: true,
  },
];

function dedupeLocations(locations = []) {
  const seen = new Map();

  for (const location of locations) {
    const name = String(location?.name || '').trim();
    const slug = String(location?.slug || '').trim();
    const key = (slug || name || '').toLowerCase().replace(/\s+/g, ' ');

    if (!key || seen.has(key)) continue;
    seen.set(key, { ...location, name, slug });
  }

  return Array.from(seen.values()).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const existingLocations = await Location.find({}).sort({ name: 1 }).lean();
    if (existingLocations.length === 0) {
      const createdLocations = await Promise.all(
        DEFAULT_LOCATIONS.map(location => Location.create(location))
      );
      return res.status(200).json(dedupeLocations(createdLocations));
    }

    return res.status(200).json(dedupeLocations(existingLocations));
  } catch (error) {
    console.error('Location list error:', error);
    return res.status(500).json({ error: error.message || 'Unable to load locations' });
  }
}
