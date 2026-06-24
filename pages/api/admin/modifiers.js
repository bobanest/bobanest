import dbConnect from '@/lib/dbConnect';
import ModifierGroup from '@/lib/models/Modifier';

const fallbackModifierGroups = [
  {
    _id: 'fallback-size',
    name: 'Size',
    required: true,
    multiple: false,
    options: [
      { _id: 'size-regular', name: 'Regular (16oz)', price: 0 },
      { _id: 'size-large', name: 'Large (22oz)', price: 1.0 },
    ],
    applicableProducts: [],
  },
  {
    _id: 'fallback-boba',
    name: 'Boba',
    required: false,
    multiple: false,
    options: [
      { _id: 'boba-classic', name: 'Classic Tapioca', price: 0.75 },
      { _id: 'boba-popping', name: 'Popping Boba', price: 1.0 },
      { _id: 'boba-none', name: 'No Boba', price: 0 },
    ],
    applicableProducts: [],
  },
];

export default async function handler(req, res) {
  let dbReady = true;
  try {
    await dbConnect();
  } catch (error) {
    dbReady = false;
  }

  const { id } = req.query;

  // GET: Fetch all modifier groups (populate applicable products)
  if (req.method === 'GET') {
    if (!dbReady) {
      return res.status(200).json(fallbackModifierGroups);
    }

    try {
      const groups = await ModifierGroup.find({}).populate('applicableProducts');
      if (Array.isArray(groups) && groups.length > 0) {
        return res.status(200).json(groups);
      }

      return res.status(200).json(fallbackModifierGroups);
    } catch (error) {
      console.error('GET modifiers error:', error);
      return res.status(200).json(fallbackModifierGroups);
    }
  }

  if (!dbReady) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  // POST: Create a new modifier group
  if (req.method === 'POST') {
    try {
      const group = await ModifierGroup.create(req.body);
      // Populate the applicableProducts before returning
      const populated = await group.populate('applicableProducts');
      return res.status(201).json(populated);
    } catch (error) {
      console.error('POST modifier error:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  // PUT: Update an existing modifier group
  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    try {
      const group = await ModifierGroup.findByIdAndUpdate(id, req.body, { new: true }).populate('applicableProducts');
      if (!group) return res.status(404).json({ error: 'Modifier group not found' });
      return res.status(200).json(group);
    } catch (error) {
      console.error('PUT modifier error:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  // DELETE: Remove a modifier group
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    try {
      await ModifierGroup.findByIdAndDelete(id);
      return res.status(204).end();
    } catch (error) {
      console.error('DELETE modifier error:', error);
      return res.status(500).json({ error: 'Failed to delete' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}