import Layout from '@/components/Layout';
import Link from 'next/link';
import { products } from '@/data/products';

export default function Home() {
  const featured = products.slice(0, 4);

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-to-r from-primary/20 to-secondary/20 py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-dark mb-4">Welcome to Bobanest</h1>
          <p className="text-xl text-gray-600 mb-8">Fresh, handcrafted bubble tea made daily.</p>
          <Link href="/products" className="btn-primary inline-block">View Menu →</Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Featured Drinks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map(product => (
              <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
                <div className="p-4">
                  <h3 className="font-bold text-lg">{product.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">{product.description}</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-primary font-bold">${product.price}</span>
                    <Link href={`/products#${product.id}`} className="text-secondary hover:text-primary">View →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Daily Specials */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Daily Specials</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg overflow-hidden shadow">
              <img src="https://images.unsplash.com/photo-1558857563-3a9b1c8b3f2e?w=500" alt="Taro Milk Tea" className="w-full h-56 object-cover" />
              <div className="p-4">
                <h3 className="font-bold text-xl">Taro Milk Tea</h3>
                <p className="text-gray-600">Creamy taro with chewy boba – Monday special</p>
              </div>
            </div>
            <div className="bg-white rounded-lg overflow-hidden shadow">
              <img src="https://images.unsplash.com/photo-1558857563-5f6e6d3b2f3c?w=500" alt="Mango Green Tea" className="w-full h-56 object-cover" />
              <div className="p-4">
                <h3 className="font-bold text-xl">Mango Green Tea</h3>
                <p className="text-gray-600">Refreshing mango with green tea – Tuesday special</p>
              </div>
            </div>
            <div className="bg-white rounded-lg overflow-hidden shadow">
              <img src="https://images.unsplash.com/photo-1558857563-6f8a2d0e8b5f?w=500" alt="Brown Sugar Boba" className="w-full h-56 object-cover" />
              <div className="p-4">
                <h3 className="font-bold text-xl">Brown Sugar Boba</h3>
                <p className="text-gray-600">Rich brown sugar milk with warm boba – Wednesday special</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}