import dbConnect from '@/lib/dbConnect';
import ModifierGroup from '@/lib/models/Modifier';

export default async function handler(req, res) {
  await dbConnect();

  const { id } = req.query;

  // GET: Fetch all modifier groups (populate applicable products)
  if (req.method === 'GET') {
    try {
      const groups = await ModifierGroup.find({}).populate('applicableProducts');
      return res.status(200).json(groups);
    } catch (error) {
      console.error('GET modifiers error:', error);
      return res.status(500).json({ error: 'Failed to fetch modifiers' });
    }
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