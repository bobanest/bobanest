import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export const LOCATION_STORAGE_KEY = 'bobanest-selected-pickup-location';

export function getSelectedPickupLocation() {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(LOCATION_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setSelectedPickupLocation(locationName) {
  if (typeof window === 'undefined') return;
  if (!locationName) {
    localStorage.removeItem(LOCATION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(LOCATION_STORAGE_KEY, locationName);
}

export default function LocationSelector() {
  const router = useRouter();
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocationState] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (router.pathname.startsWith('/admin') || router.pathname.startsWith('/employee')) {
      return;
    }

    let isMounted = true;

    const loadLocations = async () => {
      try {
        const res = await fetch('/api/locations');
        const data = await res.json();
        if (!isMounted) return;

        const allLocations = Array.isArray(data) ? data.filter(item => item.isActive !== false) : [];
        const selectableLocations = allLocations.filter(item => item.isComingSoon !== true);
        setLocations(allLocations);

        const storedLocation = getSelectedPickupLocation();
        const match = selectableLocations.find(
          location => location.name === storedLocation || location.slug === storedLocation || location._id === storedLocation
        );

        if (match) {
          setSelectedLocationState(match.name);
          setIsOpen(false);
        } else if (selectableLocations.length > 0) {
          setSelectedLocationState(selectableLocations[0].name);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Failed to load pickup locations', error);
      } finally {
        if (isMounted) setReady(true);
      }
    };

    loadLocations();
    return () => {
      isMounted = false;
    };
  }, [router.pathname]);

  const handleSelect = (locationName) => {
    if (!locationName) return;
    const targetLocation = locations.find(location => location.name === locationName);
    if (targetLocation?.isComingSoon) return;
    setSelectedLocationState(locationName);
    setSelectedPickupLocation(locationName);
    setIsOpen(false);
  };

  const selectableLocations = locations.filter(location => location.isComingSoon !== true);

  if (router.pathname.startsWith('/admin') || router.pathname.startsWith('/employee') || !ready || selectableLocations.length === 0) {
    return null;
  }

  return (
    <>
      {selectedLocation && !isOpen && (
        <div className="bg-[#f4efe7] border-b border-[#e5d7c3]">
          <div className="max-w-7xl mx-auto px-4 py-2 text-sm text-gray-700 flex items-center justify-between gap-2">
            <span>
              Pickup location: <strong>{selectedLocation}</strong>
            </span>
            <button type="button" onClick={() => setIsOpen(true)} className="text-primary underline font-medium">
              Change
            </button>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose your pickup location</h2>
            <p className="text-sm text-gray-600 mb-4">Select where you would like to pick up your order.</p>

            <label className="block text-sm font-semibold text-gray-700 mb-2">Pickup location</label>
            <select
              value={selectedLocation}
              onChange={e => setSelectedLocationState(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-900"
            >
              {locations.map(location => (
                <option
                  key={location._id || location.slug || location.name}
                  value={location.name}
                  disabled={!!location.isComingSoon}
                >
                  {location.name}
                  {location.isComingSoon ? ' (Coming Soon)' : ''}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                Close
              </button>
              <button
                type="button"
                onClick={() => handleSelect(selectedLocation)}
                disabled={locations.find(location => location.name === selectedLocation)?.isComingSoon}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
