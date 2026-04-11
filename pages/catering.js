import Layout from '@/components/Layout';
import { useState } from 'react';

export default function Catering() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <Layout title="Catering – Bobanest">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-center mb-4">Catering Services</h1>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">Make your event unforgettable with Bobanest's bubble tea catering.</p>
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold mb-4">Our Catering Options</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3"><span className="text-primary text-xl">✓</span> <strong>Bubble Tea Bar</strong> – 5 flavors + toppings</li>
              <li className="flex items-start gap-3"><span className="text-primary text-xl">✓</span> <strong>Party Packs</strong> – Pre-made for 10+ guests</li>
              <li className="flex items-start gap-3"><span className="text-primary text-xl">✓</span> <strong>Corporate Events</strong> – Custom branding</li>
              <li className="flex items-start gap-3"><span className="text-primary text-xl">✓</span> <strong>Weddings</strong> – Signature drink creation</li>
            </ul>
            <div className="mt-8 p-4 bg-gray-100 rounded-lg">
              <p className="font-bold">Minimum order: $150</p>
              <p className="text-sm text-gray-600">Please request at least 5 days in advance.</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Request a Quote</h2>
            {submitted ? (
              <div className="text-green-600 text-center py-8">Thank you! We'll contact you within 24 hours.</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Full Name" required className="w-full px-4 py-2 border rounded-md" />
                <input type="email" placeholder="Email" required className="w-full px-4 py-2 border rounded-md" />
                <input type="tel" placeholder="Phone" required className="w-full px-4 py-2 border rounded-md" />
                <input type="date" required className="w-full px-4 py-2 border rounded-md" />
                <input type="number" placeholder="Number of Guests" required className="w-full px-4 py-2 border rounded-md" />
                <textarea placeholder="Special requests" rows="3" className="w-full px-4 py-2 border rounded-md"></textarea>
                <button type="submit" className="btn-primary w-full">Send Request</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}