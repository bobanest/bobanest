import Layout from '@/components/Layout';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/components/CartContext';
import ProductModal from '@/components/ProductModal';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [promotions, setPromotions] = useState([]);
  const [dailyPosts, setDailyPosts] = useState([]);
  const [hero, setHero] = useState({
    imageUrl: '/hero-default.jpg',
    title: 'Fresh Bubble Tea Delivered to You',
    subtitle: 'Handcrafted with premium ingredients. Order online for pickup or delivery.',
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { addToCart } = useCart();
  const productsSectionRef = useRef(null);
  const categorySectionRefs = useRef({});

  const fetchData = async (url) => {
    const res = await fetch(url);
    const contentType = res.headers.get('content-type') || '';

    if (!res.ok || !contentType.includes('application/json')) {
      return null;
    }

    return res.json();
  };

  useEffect(() => {
    fetchData('/api/admin/hero')
      .then(data => {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          setHero(prev => ({
            ...prev,
            ...data,
          }));
        }
      })
      .catch(err => console.error('Failed to fetch hero', err));

    fetchData('/api/admin/products')
      .then(data => {
        if (!Array.isArray(data)) {
          setProducts([]);
          setCategories([]);
          return;
        }

        setProducts(data);
        const uniqueCategories = [...new Set(data.map((item) => item.category).filter(Boolean))];
        setCategories(uniqueCategories);
      })
      .catch(err => console.error('Failed to fetch products', err));

    fetchData('/api/admin/promotions?active=true')
      .then(data => setPromotions(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to fetch promotions', err));

    fetchData('/api/admin/daily-posts')
      .then(data => setDailyPosts(Array.isArray(data) ? data.slice(0, 3) : []))
      .catch(err => console.error('Failed to fetch daily posts', err));
  }, []);

  useEffect(() => {
    if (!categories.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          const activeCategory = visible[0].target.getAttribute('data-category');
          if (activeCategory) setSelectedCategory(activeCategory);
        }
      },
      { rootMargin: '-140px 0px -55% 0px', threshold: [0.2, 0.4, 0.6] }
    );

    categories.forEach((category) => {
      const node = categorySectionRefs.current[category];
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [categories]);

  const heroImage =
    hero.imageUrl && (hero.imageUrl.startsWith('http://') || hero.imageUrl.startsWith('https://'))
      ? hero.imageUrl
      : 'https://www.bobanest.com/hero-default.jpg';

  const productsByCategory = categories.map((category) => ({
    category,
    items: products.filter((product) => product.category === category),
  }));

  const getPromotionLabel = (promo) => {
    if (promo.name) return promo.name;

    switch (promo.type) {
      case 'bogo':
        return 'Buy 1 Get 1 Free';
      case 'percentage':
        return `${promo.value || 0}% Off`;
      case 'fixed':
        return `$${promo.value || 0} Off`;
      case 'free_delivery':
        return 'Free Delivery';
      case 'second_discount':
        return `${promo.value || 0}% Off 2nd Item`;
      default:
        return 'Special Offer';
    }
  };

  const scrollToCategory = (category) => {
    if (category === 'all') {
      productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const node = categorySectionRefs.current[category];
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Layout>
      {/* Hero Banner */}
      <div className="relative h-96 overflow-hidden">
        <img src={heroImage} alt={hero.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <h1 className="text-4xl md:text-6xl font-bold">{hero.title}</h1>
            <p className="mt-4 text-lg md:text-2xl">{hero.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Category Products */}
      <section ref={productsSectionRef} className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-6">Our Menu Categories</h2>

          <div className="sticky top-16 z-40 bg-white/95 backdrop-blur border-y border-gray-100 mb-10">
            <div className="py-3">
              {promotions.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {promotions.map((promo) => (
                    <span
                      key={promo._id || promo.name}
                      className="shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-white"
                    >
                      {getPromotionLabel(promo)}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 overflow-x-auto">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    scrollToCategory('all');
                  }}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border ${
                    selectedCategory === 'all'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-dark border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      scrollToCategory(cat);
                    }}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border ${
                      selectedCategory === cat
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-dark border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-14">
            {productsByCategory.map(({ category, items }) => (
              <section
                key={category}
                data-category={category}
                ref={(node) => {
                  categorySectionRefs.current[category] = node;
                }}
              >
                <h3 className="text-2xl font-bold mb-6">{category}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {items.map((product) => (
                    <div key={product._id || product.id || product.name} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition">
                      <img
                        src={product.imageUrl || product.image || 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800'}
                        alt={product.name}
                        className="w-full h-[34vh] md:h-[40vh] object-contain bg-gray-50 p-2"
                      />
                      <div className="p-4">
                        <h4 className="font-bold text-lg">{product.name}</h4>
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-primary font-bold">${product.price}</span>
                          <button
                            onClick={() => setSelectedProduct(product)}
                            className="bg-secondary text-white px-3 py-1 rounded-full text-sm hover:bg-primary"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {items.length === 0 && (
                  <p className="text-gray-500">No products available in this category yet.</p>
                )}
              </section>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/products" className="btn-primary">View Full Menu →</Link>
          </div>
        </div>
      </section>

      {/* Daily Specials */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Daily Specials</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {dailyPosts.map(post => (
              <div key={post._id} className="bg-white rounded-lg overflow-hidden shadow">
                <img src={post.imageUrl} alt={post.title} className="w-full h-56 object-cover" />
                <div className="p-4">
                  <h3 className="font-bold text-xl">{post.title}</h3>
                  <p className="text-gray-600">{post.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rewards Program */}
      <section className="py-16 bg-primary/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <h2 className="text-3xl font-bold mb-3">Rewards Program</h2>
            <p className="text-gray-600 mb-6">Earn points on every order and unlock free drinks, exclusive promos, and birthday perks.</p>
            <Link href="/contact" className="btn-primary inline-block">Join Rewards</Link>
          </div>
        </div>
      </section>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(configuredProduct) =>
            addToCart({
              ...configuredProduct,
              id: configuredProduct._id || configuredProduct.id,
              price: configuredProduct.finalPrice ?? configuredProduct.price,
            })
          }
        />
      )}

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">What Our Customers Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-50 rounded-lg shadow">⭐️⭐️⭐️⭐️⭐️<br/>"Best bubble tea in town! The taro milk tea is amazing."<br/>- Sarah</div>
            <div className="p-6 bg-gray-50 rounded-lg shadow">⭐️⭐️⭐️⭐️⭐️<br/>"Fast delivery and great flavors. Love the mango green tea."<br/>- Mike</div>
            <div className="p-6 bg-gray-50 rounded-lg shadow">⭐️⭐️⭐️⭐️⭐️<br/>"My kids love the boba. We order every week."<br/>- Jessica</div>
          </div>
        </div>
      </section>

      {/* Follow & Connect */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Follow & Connect</h2>
          <p className="text-gray-600 mb-8">Stay connected for new drinks, flash offers, and daily updates.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="px-5 py-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50">Instagram</a>
            <a href="https://www.facebook.com" target="_blank" rel="noreferrer" className="px-5 py-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50">Facebook</a>
            <Link href="/contact" className="px-5 py-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50">Contact Us</Link>
          </div>
        </div>
      </section>

      {/* Stay in the Loop */}
      <section className="py-16 bg-dark text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Stay in the Loop</h2>
          <p className="text-lg mb-8">Get updates on new flavors, rewards, and limited-time specials.</p>
          <Link href="/contact" className="btn-primary bg-white text-dark hover:bg-gray-100">Subscribe for Updates</Link>
        </div>
      </section>

      {/* Catering CTA */}
      <section className="py-16 bg-dark text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Catering for Events</h2>
          <p className="text-xl mb-8">Make your next event special with Bobanest's catering service.</p>
          <Link href="/catering" className="btn-primary bg-white text-dark hover:bg-gray-100">Request Catering</Link>
        </div>
      </section>
    </Layout>
  );
}