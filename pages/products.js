import Layout from '@/components/Layout';
import { useEffect, useState } from 'react';
import { useCart } from '@/components/CartContext';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { addToCart } = useCart();

  const fetchJson = async (url) => {
    const res = await fetch(url);
    const contentType = res.headers.get('content-type') || '';

    if (!res.ok || !contentType.includes('application/json')) {
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  };

  useEffect(() => {
    fetchJson('/api/admin/products')
      .then(data => {
        setProducts(data);
        const uniqueCategories = [...new Set(data.map(p => p.category))];
        setCategories(uniqueCategories);
      })
      .catch(err => console.error('Failed to load products', err));
  }, []);

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category === selectedCategory);

  return (
    <Layout title="Our Menu – Bobanest">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-center mb-8">Our Menu</h1>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full ${
              selectedCategory === 'all' ? 'bg-primary text-white' : 'bg-gray-200 text-dark hover:bg-gray-300'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full ${
                selectedCategory === cat ? 'bg-primary text-white' : 'bg-gray-200 text-dark hover:bg-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map(product => (
            <div key={product._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition">
              <img src={product.imageUrl} alt={product.name} className="w-full h-56 object-cover" />
              <div className="p-6">
                <h3 className="text-xl font-bold">{product.name}</h3>
                <p className="text-gray-600 mt-2">{product.description}</p>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-2xl font-bold text-primary">${product.price}</span>
                  <button
                    onClick={() => addToCart({ ...product, id: product._id })}
                    className="btn-primary py-2 px-4"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <p className="text-center text-gray-500 py-12">No products found in this category.</p>
        )}
      </div>
    </Layout>
  );
}