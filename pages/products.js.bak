import Layout from '@/components/Layout';
import { useState } from 'react';
import { products } from '@/data/products';
import { useCart } from '@/components/CartContext';

export default function ProductsPage() {
  const [category, setCategory] = useState('all');
  const { addToCart } = useCart();

  const categories = ['all', ...new Set(products.map(p => p.category))];
  const filtered = category === 'all' ? products : products.filter(p => p.category === category);

  return (
    <Layout title="Our Menu – Bobanest">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-center mb-8">Our Menu</h1>
        
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full ${category === cat ? 'bg-primary text-white' : 'bg-gray-200 text-dark hover:bg-gray-300'}`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
              <img src={product.image} alt={product.name} className="w-full h-56 object-cover" />
              <div className="p-6">
                <h3 className="text-xl font-bold">{product.name}</h3>
                <p className="text-gray-600 mt-2">{product.description}</p>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-2xl font-bold text-primary">${product.price}</span>
                  <button onClick={() => addToCart(product)} className="btn-primary py-2 px-4">Add to Cart</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}