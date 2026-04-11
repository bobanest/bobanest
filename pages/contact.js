import Layout from '@/components/Layout';
import { useState } from 'react';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <Layout title="Contact Us">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-center mb-4">Contact Us</h1>
        <p className="text-center text-gray-600 mb-12">We'd love to hear from you!</p>
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold mb-4">Visit Us</h2>
            <p className="text-gray-600">5004 Mission Square Ln, Zephyrhills, FL 33542</p>
            <h2 className="text-2xl font-bold mt-8 mb-4">Call Us</h2>
            <p className="text-gray-600">(813) 123-4567</p>
            <h2 className="text-2xl font-bold mt-8 mb-4">Hours</h2>
            <ul className="text-gray-600 space-y-1">
              <li>Mon - Thu: 11am - 9pm</li>
              <li>Fri - Sat: 11am - 10pm</li>
              <li>Sun: 12pm - 8pm</li>
            </ul>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Send a Message</h2>
            {submitted ? (
              <div className="text-green-600 text-center py-8">Message sent! We'll reply soon.</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Your Name" required className="w-full px-4 py-2 border rounded-md" />
                <input type="email" placeholder="Email" required className="w-full px-4 py-2 border rounded-md" />
                <textarea placeholder="Message" rows="5" required className="w-full px-4 py-2 border rounded-md"></textarea>
                <button type="submit" className="btn-primary w-full">Send</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}