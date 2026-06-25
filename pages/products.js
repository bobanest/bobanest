import Layout from '@/components/Layout';
import { useState, useRef, useEffect } from 'react';
import { useCart } from '@/components/CartContext';
import ProductModal from '@/components/ProductModal';

// Helper: check if product should show NEW badge
function isProductNew(product) {
  return !!product.isNewItem;
}

// Helper: get promotion badge for a product
function getProductPromotion(product, promotions) {
  for (const promo of promotions) {
    const applicableProductIds = (promo.applicableProducts || []).map(p => p._id || p);
    const applies = applicableProductIds.length === 0 || applicableProductIds.includes(product._id);
    if (!applies) continue;
    if (promo.type === 'bogo') return { text: 'Buy 1 Get 1 Free', color: 'bg-red-500' };
    if (promo.type === 'percentage') return { text: `${promo.value}% OFF`, color: 'bg-orange-500' };
    if (promo.type === 'fixed') return { text: `$${promo.value} OFF`, color: 'bg-green-500' };
    if (promo.type === 'second_discount') return { text: `${promo.value}% off 2nd`, color: 'bg-purple-500' };
    if (promo.type === 'free_delivery') return { text: 'Free Delivery', color: 'bg-blue-500' };
  }
  return null;
}

export default function ProductsPage({ products, promotions }) {
  const categories = [...new Set(products.map(p => p.category))];
  const [activeCategory, setActiveCategory] = useState(categories[0] || '');
  const [modalProduct, setModalProduct] = useState(null);
  const { addToCart } = useCart();
  const categoryRefs = useRef({});

  // Scroll spy for sticky categories
  useEffect(() => {
    const handleScroll = () => {
      for (let i = categories.length - 1; i >= 0; i--) {
        const cat = categories[i];
        const section = categoryRefs.current[cat];
        if (section && window.scrollY >= section.offsetTop - 100) {
          setActiveCategory(cat);
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

  const handleAddToCart = (productWithModifiers) => {
    addToCart({
      id: productWithModifiers._id,
      name: productWithModifiers.name,
      price: productWithModifiers.finalPrice || productWithModifiers.price,
      imageUrl: productWithModifiers.imageUrl,
      modifiers: productWithModifiers.modifiers,
      quantity: 1,
    });
    setModalProduct(null);
  };

  return (
    <Layout title="Our Menu – Bobanest">
      {/* Sticky Category Bar */}
      <div className="sticky top-16 z-20 bg-white shadow-md overflow-x-auto py-3 px-4">
        <div className="flex justify-center gap-4 min-w-max">
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
          <div key={category} ref={el => (categoryRefs.current[category] = el)} className="mb-12">
            <h2 className="text-2xl font-bold mb-6">{category}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {items.map(product => {
                const promo = getProductPromotion(product, promotions);
                const showNew = isProductNew(product);
                return (
                  <div key={product._id} className="product-card bg-white rounded-lg shadow p-4 text-center hover:shadow-md transition relative">
                    {promo && (
                      <div className={`absolute top-2 left-2 ${promo.color} text-white text-xs font-bold px-2 py-1 rounded-full z-10`}>
                        {promo.text}
                      </div>
                    )}
                    {showNew && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                        NEW
                      </div>
                    )}
                    <div className="cup-container h-32 flex items-center justify-center">
                      <img src={product.imageUrl} alt={product.name} className="product-cup-image max-h-full max-w-full object-contain" />
                    </div>
                    <h3 className="font-bold mt-2">{product.name}</h3>
                    <p className="text-primary font-bold mt-1">${product.price}</p>
                    <button
                      onClick={() => setModalProduct(product)}
                      className="mt-3 bg-secondary text-white px-4 py-1 rounded-full text-sm hover:bg-primary transition"
                    >
                      Add to Cart
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {modalProduct && (
        <ProductModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}
    </Layout>
  );
}

// SSR data fetching
export async function getServerSideProps() {
  const BASE_URL = 'https://bobanest.vercel.app';
  const [productsRes, promosRes] = await Promise.all([
    fetch(BASE_URL + '/api/admin/products'),
    fetch(BASE_URL + '/api/admin/promotions?active=true'),
  ]);
  const products = await productsRes.json();
  const promotions = await promosRes.json();
  return { props: { products, promotions } };
}

