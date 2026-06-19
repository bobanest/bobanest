import dbConnect from '@/lib/dbConnect';
import Recipe from '@/lib/models/Recipe';

// One-time migration: drops the old single-field productName_1 unique index
// so the new compound (productName + size) index can work correctly.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  await dbConnect();

  try {
    const collection = Recipe.collection;
    const indexes = await collection.indexes();
    const old = indexes.find(
      idx => idx.key && idx.key.productName === 1 && !idx.key.size
    );
    if (!old) {
      return res.json({ message: 'Old index not found — already cleaned up or never existed.' });
    }
    await collection.dropIndex(old.name);
    return res.json({ message: `Dropped old index "${old.name}" successfully.` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
