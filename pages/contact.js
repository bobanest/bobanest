import Layout from '@/components/Layout';
import { useState } from 'react';
import axios from 'axios';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post('/api/contact', formData).catch(console.error);
    setSubmitted(true);
    setFormData({ name: '', email: '', message: '' });
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <Layout title="Contact Us - Bobanest">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-center mb-4">Contact Us</h1>
        <p className="text-center text-gray-600 mb-12">We'd love to hear from you!</p>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-3">Visit Us</h2>
              <p className="text-gray-600">5004 Mission Square Ln, Zephyrhills, FL 33542</p>
            </div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-3">Call Us</h2>
              <p className="text-gray-600">656-900-2050</p>
            </div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-3">Hours</h2>
              <ul className="text-gray-600 space-y-1">
                <li>Mon - Thu: 11am - 9pm</li>
                <li>Fri - Sat: 11am - 10pm</li>
                <li>Sun: 12pm - 8pm</li>
              </ul>
            </div>
            {/* Google Maps Embed */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-3">Find Us</h2>
              <div className="aspect-video w-full rounded overflow-hidden shadow">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3519.123456!2d-82.1907!3d28.2435!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88dd7e123456789%3A0x123456789!2s5004%20Mission%20Square%20Ln%2C%20Zephyrhills%2C%20FL%2033542!5e0!3m2!1sen!2sus!4v1234567890"
                  width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
                  title="Bobanest Location"
                ></iframe>
              </div>
              <p className="text-sm text-gray-500 mt-2">Free parking available behind the building.</p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Send a Message</h2>
            {submitted ? (
              <div className="bg-green-100 text-green-700 p-3 rounded text-center">Thanks! We'll reply soon.</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Your Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-md" required />
                <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border rounded-md" required />
                <textarea placeholder="Message" rows="5" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full px-4 py-2 border rounded-md" required />
                <button type="submit" className="btn-primary w-full">Send Message</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}