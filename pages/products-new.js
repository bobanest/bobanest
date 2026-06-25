'use client';
import Layout from '@/components/Layout';
import { useEffect, useState, useRef } from 'react';
import { useCart } from '@/components/CartContext';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const { addToCart } = useCart();
  const categoryRefs = useRef({});

  useEffect(() => {
    fetch('/api/admin/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        const uniqueCategories = [...new Set(data.map(p => p.category))];
        setCategories(uniqueCategories);
        if (uniqueCategories.length) setActiveCategory(uniqueCategories[0]);
      })
      .catch(err => console.error(err));
  }, []);

  // Scroll spy logic
  useEffect(() => {
    const handleScroll = () => {
      for (let i = categories.length - 1; i >= 0; i--) {
        const category = categories[i];
        const section = categoryRefs.current[category];
        if (section && window.scrollY >= section.offsetTop - 100) {
          setActiveCategory(category);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories]);

  const scrollToCategory = (category) => {
    const section = categoryRefs.current[category];
    if (section) window.scrollTo({ top: section.offsetTop - 80, behavior: 'smooth' });
  };

  const groupedProducts = categories.map(cat => ({
    category: cat,
    items: products.filter(p => p.category === cat),
  }));

  return (
    <Layout title="Our Menu – Bobanest">
      {/* Sticky Category Filter */}
      <div className="sticky top-16 z-20 bg-white shadow-md overflow-x-auto whitespace-nowrap py-3 px-4">
        <div className="flex gap-4">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => scrollToCategory(cat)}
              className={`px-4 py-2 rounded-full transition ${activeCategory === cat ? 'bg-primary text-white' : 'bg-gray-200 text-dark'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Category Sections */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {groupedProducts.map(({ category, items }) => (
          <div key={category} ref={el => categoryRefs.current[category] = el} className="mb-12">
            <h2 className="text-2xl font-bold mb-6">{category}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {items.map(product => (
                <div key={product._id} className="bg-white rounded-lg shadow p-4 text-center">
                  <img src={product.cupImageUrl || product.imageUrl} alt={product.name} className="w-full h-32 object-contain" />
                  <h3 className="font-bold mt-2">{product.name}</h3>
                  <p className="text-primary font-bold mt-1">${product.price}</p>
                  <button onClick={() => addToCart({ ...product, id: product._id })} className="mt-3 bg-secondary text-white px-4 py-1 rounded-full text-sm hover:bg-primary">Add</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}