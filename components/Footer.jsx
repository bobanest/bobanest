import { useEffect, useState } from 'react';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime12(time24) {
  if (!time24) return '';
  const [hourRaw, minute] = time24.split(':').map(Number);
  const hour = hourRaw % 12 || 12;
  const suffix = hourRaw >= 12 ? 'PM' : 'AM';
  return `${hour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export default function Footer() {
  const [weeklyHours, setWeeklyHours] = useState([]);

  useEffect(() => {
    fetch('/api/store-hours')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.weeklyHours)) {
          setWeeklyHours(data.weeklyHours);
        }
      })
      .catch(() => {});
  }, []);

  const sortedHours = [...weeklyHours].sort((a, b) => a.day - b.day);

  return (
    <footer className="bg-dark text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Bobanest</h3>
            <p className="text-gray-300">Premium bubble tea crafted with love.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-300">
              <li><a href="/products" className="hover:text-primary">Menu</a></li>
              <li><a href="/catering" className="hover:text-primary">Catering</a></li>
              <li><a href="/contact" className="hover:text-primary">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Hours</h4>
            <ul className="space-y-2 text-gray-300">
              {sortedHours.length > 0 ? (
                sortedHours.map((slot) => (
                  <li key={slot.day}>
                    {DAY_LABELS[slot.day]}:{' '}
                    {slot.isOpen ? `${formatTime12(slot.openTime)} - ${formatTime12(slot.closeTime)}` : 'Closed'}
                  </li>
                ))
              ) : (
                <>
                  <li>Mon - Thu: 11am - 9pm</li>
                  <li>Fri - Sat: 11am - 10pm</li>
                  <li>Sun: 12pm - 8pm</li>
                </>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Location</h4>
            <p className="text-gray-300">5004 Mission Square Ln, Zephyrhills, FL 33542</p>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 Bobanest. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}