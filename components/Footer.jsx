import { useEffect, useState } from 'react';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime12(time24) {
  if (!time24) return '';
  const [hourRaw, minute] = time24.split(':').map(Number);
  const hour = hourRaw % 12 || 12;
  const suffix = hourRaw >= 12 ? 'PM' : 'AM';
  return `${hour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export default function Footer({ dark = false }) {
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

  const bg = dark ? 'bg-[#0d0705]' : 'bg-dark';
  const headingColor = dark ? 'text-[#e8a33d]' : 'text-white';
  const mutedText = dark ? 'text-[#8a6a50]' : 'text-gray-400';
  const bodyText = dark ? 'text-[#b89070]' : 'text-gray-300';
  const linkHover = dark ? 'hover:text-[#e8a33d]' : 'hover:text-primary';
  const divider = dark ? 'border-[#2a1812]' : 'border-gray-700';

  return (
    <footer className={`${bg} text-white mt-0`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-9 w-9 ${dark ? 'bg-[#e8a33d]' : 'bg-primary'} rounded-full flex items-center justify-center ${dark ? 'text-[#1a0f0c]' : 'text-white'} font-bold text-lg`}>B</div>
              <h3 className={`text-xl font-extrabold ${dark ? 'text-[#f5e6c8]' : 'text-white'}`}>Bobanest</h3>
            </div>
            <p className={bodyText}>Premium bubble tea crafted with love in Zephyrhills, FL.</p>
          </div>
          <div>
            <h4 className={`font-bold mb-4 ${headingColor}`}>Quick Links</h4>
            <ul className={`space-y-2 ${bodyText}`}>
              <li><a href="/products" className={`${linkHover} transition`}>Menu</a></li>
              <li><a href="/gift-cards" className={`${linkHover} transition`}>Gift Cards</a></li>
              <li><a href="/catering" className={`${linkHover} transition`}>Catering</a></li>
              <li><a href="/loyalty" className={`${linkHover} transition`}>Rewards</a></li>
              <li><a href="/contact" className={`${linkHover} transition`}>Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className={`font-bold mb-4 ${headingColor}`}>Hours</h4>
            <ul className={`space-y-1.5 ${bodyText} text-sm`}>
              {sortedHours.length > 0 ? (
                sortedHours.map((slot) => (
                  <li key={slot.day}>
                    {DAY_LABELS[slot.day]}:{' '}
                    {slot.isOpen ? `${formatTime12(slot.openTime)} – ${formatTime12(slot.closeTime)}` : 'Closed'}
                  </li>
                ))
              ) : (
                <>
                  <li>Mon – Thu: 11am – 9pm</li>
                  <li>Fri – Sat: 11am – 10pm</li>
                  <li>Sun: 12pm – 8pm</li>
                </>
              )}
            </ul>
          </div>
          <div>
            <h4 className={`font-bold mb-4 ${headingColor}`}>Location</h4>
            <p className={`${bodyText} text-sm leading-relaxed`}>5004 Mission Square Ln<br />Zephyrhills, FL 33542</p>
            <div className="flex gap-3 mt-4">
              <a href="https://www.instagram.com/bobanest.us/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={`${bodyText} ${linkHover} transition`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/></svg>
              </a>
              <a href="https://www.facebook.com/profile.php?id=61574360884890" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={`${bodyText} ${linkHover} transition`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://www.tiktok.com/@bobanest.us" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className={`${bodyText} ${linkHover} transition`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v3.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.76-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
              </a>
            </div>
          </div>
        </div>
        <div className={`border-t ${divider} mt-10 pt-8 text-center ${mutedText} text-sm`}>
          <p>&copy; 2025 Bobanest. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}