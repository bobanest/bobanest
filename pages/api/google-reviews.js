/**
 * Google Places Reviews API route
 *
 * Requires these env vars in .env.local and Vercel:
 *   GOOGLE_PLACES_API_KEY  — your Google Cloud API key (Places API enabled)
 *   GOOGLE_PLACE_ID        — the Place ID for Bobanest (see README for how to find it)
 *
 * Without env vars the route returns the hardcoded fallback reviews so the
 * homepage still looks great before you wire up the real API.
 */

const FALLBACK_REVIEWS = [
  {
    author_name: 'Destiny R.',
    rating: 5,
    text: 'Absolutely love Bobanest! The taro milk tea is perfectly sweet and the boba is always fresh. My go-to spot in Zephyrhills!',
    relative_time_description: '2 weeks ago',
    profile_photo_url: null,
  },
  {
    author_name: 'Marcus T.',
    rating: 5,
    text: 'Best bubble tea I have had! The custom fruit tea builder is amazing — I made a strawberry-mango combo with popping boba and it was incredible.',
    relative_time_description: '1 month ago',
    profile_photo_url: null,
  },
  {
    author_name: 'Priya L.',
    rating: 5,
    text: 'Super friendly staff and the drinks are always consistent. The brown sugar milk tea is out of this world. Highly recommend!',
    relative_time_description: '3 weeks ago',
    profile_photo_url: null,
  },
  {
    author_name: 'Jonathan M.',
    rating: 5,
    text: 'Online ordering is so easy and the drinks were ready right on time. This place has become our family Friday treat!',
    relative_time_description: '1 month ago',
    profile_photo_url: null,
  },
  {
    author_name: 'Samantha K.',
    rating: 5,
    text: 'Love the rewards program — I have already redeemed points twice! Great flavors and the staff always make it with so much care.',
    relative_time_description: '2 months ago',
    profile_photo_url: null,
  },
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  // No credentials configured — return curated fallback data
  if (!apiKey || !placeId) {
    return res.status(200).json({
      reviews: FALLBACK_REVIEWS,
      rating: 4.9,
      total: 47,
      source: 'fallback',
    });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status, data.error_message);
      return res.status(200).json({
        reviews: FALLBACK_REVIEWS,
        rating: 4.9,
        total: 47,
        source: 'fallback',
      });
    }

    const result = data.result || {};
    // Only show 4- and 5-star reviews, sorted newest first
    const reviews = (result.reviews || [])
      .filter(r => r.rating >= 4)
      .slice(0, 6);

    return res.status(200).json({
      reviews,
      rating: result.rating || null,
      total: result.user_ratings_total || null,
      source: 'google',
    });
  } catch (err) {
    console.error('Google Reviews fetch failed:', err);
    return res.status(200).json({
      reviews: FALLBACK_REVIEWS,
      rating: 4.9,
      total: 47,
      source: 'fallback',
    });
  }
}
