import dbConnect from '@/lib/dbConnect';
import Product from '@/lib/models/Product';
import { products as fallbackProducts } from '@/data/products';

const normalizedFallbackProducts = fallbackProducts.map((product) => ({
  _id: String(product.id),
  name: product.name,
  description: product.description,
  price: product.price,
  category: product.category,
  imageUrl: product.image,
  inStock: true,
}));

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    await dbConnect();
  } catch (error) {
    if (req.method === 'GET') {
      if (id) {
        const product = normalizedFallbackProducts.find((item) => item._id === String(id));
        return res.json(product || null);
      }

      return res.json(normalizedFallbackProducts);
    }

    return res.status(503).json({ error: 'Database unavailable' });
  }

  switch (req.method) {
    case 'GET':
      if (id) {
        const product = await Product.findById(id);
        return res.json(product || normalizedFallbackProducts.find((item) => item._id === String(id)) || null);
      }

      try {
        const products = await Product.find({});
        if (products.length > 0) {
          return res.json(products);
        }
      } catch (error) {
        // Fall back to local seed data below.
      }

      return res.json(normalizedFallbackProducts);
    case 'POST':
      return res.status(201).json(await Product.create(req.body));
    case 'PUT':
      return res.json(await Product.findByIdAndUpdate(id, req.body, { new: true }));
    case 'DELETE':
      await Product.findByIdAndDelete(id);
      return res.status(204).end();
    default:
      res.setHeader('Allow', ['GET','POST','PUT','DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}