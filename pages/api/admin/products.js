import dbConnect from '@/lib/dbConnect';
import Product from '@/lib/models/Product';

export default async function handler(req, res) {
  try {
    await dbConnect();
    const { id } = req.query;

    if (req.method === 'GET') {
      if (id) {
        // Return a single product as an array (for compatibility with frontend)
        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        return res.status(200).json([product]);
      }
      // Return all products
      const products = await Product.find({});
      return res.status(200).json(products);
    }

    if (req.method === 'POST') {
      const product = await Product.create(req.body);
      return res.status(201).json(product);
    }

    if (req.method === 'PUT') {
      const product = await Product.findByIdAndUpdate(id, req.body, { new: true });
      return res.status(200).json(product);
    }

    if (req.method === 'DELETE') {
      await Product.findByIdAndDelete(id);
      return res.status(204).end();
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('Products API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}