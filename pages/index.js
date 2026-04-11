import Layout from '@/components/Layout';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/components/CartContext';

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [dailyPosts, setDailyPosts] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { addToCart } = useCart();

  const slides = [
    { img: 'https://images.unsplash.com/photo-1558857563-3a9b1c8b3f2e?w=1200', text: 'Fresh Boba Every Day' },
    { img: 'https://images.unsplash.com/photo-1558857563-5f6e6d3b2f3c?w=1200', text: 'Customize Your Drink' },
    { img: 'https://images.unsplash.com/photo-1558857563-6f8a2d0e8b5f?w=1200', text: 'Best in Zephyrhills' },
  ];

  useEffect(() => {
    fetch('/api/admin/products')
      .then(res => res.json())
      .then(data => setFeaturedProducts(data.slice(0, 8)))
      .catch(err => console.error(err));
    fetch('/api/admin/daily-posts')
      .then(res => res.json())
      .then(data => setDailyPosts(data.slice(0, 3)))
      .catch(err => console.error(err));

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      {/* Hero Carousel */}
      <div className="relative h-96 overflow-hidden">
        {slides.map((slide, idx) => (
          <div key={idx} className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
            <img src={slide.img} alt={slide.text} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <h1 className="text-4xl md:text-6xl text-white font-bold">{slide.text}</h1>
            </div>
          </div>
        ))}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {slides.map((_, idx) => (
            <button key={idx} onClick={() => setCurrentSlide(idx)} className={`w-3 h-3 rounded-full ${idx === currentSlide ? 'bg-white' : 'bg-gray-400'}`} />
          ))}
        </div>
      </div>

      {/* Featured Products (8 items) */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Bestsellers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map(product => (
              <div key={product._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition">
                <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover" />
                <div className="p-4">
                  <h3 className="font-bold text-lg">{product.name}</h3>
                  <p className="text-gray-600 text-sm">{product.description.substring(0, 60)}...</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-primary font-bold">${product.price}</span>
                    <button onClick={() => addToCart({ ...product, id: product._id })} className="bg-secondary text-white px-3 py-1 rounded-full text-sm hover:bg-primary">Add</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
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