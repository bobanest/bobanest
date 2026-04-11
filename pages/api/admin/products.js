import dbConnect from '@/lib/dbConnect';
import Product from '@/lib/models/Product';

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;
  switch (req.method) {
    case 'GET':
      if (id) return res.json(await Product.findById(id));
      return res.json(await Product.find({}));
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