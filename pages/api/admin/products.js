import dbConnect from '@/lib/dbConnect';
import Product from '@/lib/models/Product';
import { products as fallbackProducts } from '@/data/products';

const DEPLOYED_PRODUCTS_URL = 'https://www.bobanest.com/api/admin/products';

const normalizedFallbackProducts = fallbackProducts.map((product) => ({
  _id: String(product.id),
  name: product.name,
  description: product.description,
  price: product.price,
  category: product.category,
  imageUrl: product.image,
  inStock: true,
}));

const findByAnyId = (items, id) =>
  items.find((item) => String(item?._id ?? item?.id) === String(id));

async function fetchDeployedProducts() {
  try {
    const response = await fetch(DEPLOYED_PRODUCTS_URL);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    await dbConnect();
  } catch (error) {
    if (req.method === 'GET') {
      const deployedProducts = await fetchDeployedProducts();
      const source = deployedProducts.length > 0 ? deployedProducts : normalizedFallbackProducts;

      if (id) {
        const product = findByAnyId(source, id);
        return res.json(product || null);
      }

      return res.json(source);
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

      const deployedProducts = await fetchDeployedProducts();
      return res.json(deployedProducts.length > 0 ? deployedProducts : normalizedFallbackProducts);
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