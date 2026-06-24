// pages/products/[id].js
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useCart } from '@/components/CartContext';

export default function ProductDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    if (id) {
      axios.get(`/api/admin/products?id=${id}`).then(res => {
        if (res.data.length > 0) setProduct(res.data[0]);
      });
    }
  }, [id]);

  if (!product) return <div className="container-custom py-20 text-center">Loading...</div>;

  return (
    <Layout title={`${product.name} - Bobanest`}>
      <div className="container-custom py-12">
        <div className="grid md:grid-cols-2 gap-12">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-[60vh] md:h-[75vh] object-contain bg-gray-50 rounded-lg shadow-lg p-2"
          />
          <div>
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
            <p className="text-gray-600 mb-4">{product.description}</p>
            <div className="text-3xl font-bold text-primary mb-6">${product.price}</div>
            <div className="flex items-center gap-4 mb-6">
              <label className="font-semibold">Quantity:</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="w-20 px-3 py-2 border rounded-md"
              />
            </div>
            <button
              onClick={() => addToCart(product, quantity)}
              className="btn-primary w-full md:w-auto"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}