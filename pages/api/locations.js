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
      return res.status(200).json(createdLocations);
    }

    return res.status(200).json(existingLocations);
  } catch (error) {
    console.error('Location list error:', error);
    return res.status(500).json({ error: error.message || 'Unable to load locations' });
  }
}
