import dbConnect from '@/lib/dbConnect';
import Product from '@/lib/models/Product';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const products = await Product.find({}).sort({ category: 1, name: 1 }).lean();
    return res.json(products);
  }

  if (req.method === 'PUT') {
    const { id, inStock, stockCount, lowStockThreshold } = req.body;
    const update = {};
    if (inStock !== undefined) update.inStock = inStock;
    if (stockCount !== undefined) update.stockCount = stockCount;
    if (lowStockThreshold !== undefined) update.lowStockThreshold = lowStockThreshold;
    const product = await Product.findByIdAndUpdate(id, update, { new: true });
    return res.json(product);
  }

  return res.status(405).end();
}
