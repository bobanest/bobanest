import dbConnect from '@/lib/dbConnect';
import InstagramSetting from '@/lib/models/InstagramSetting';

export default async function handler(req, res) {
  await dbConnect();
  const settings = await InstagramSetting.findOne();
  const handle = settings?.instagramHandle || 'bobanest';

  // Use a free Instagram RSS proxy (replace with a reliable service)
  // This example uses a public RSS to JSON converter (not stable for production)
  // For production, consider using a service like "instagram-scraper" API or Meta's Basic Display API
  try {
    const rssUrl = `https://rss.app/instagram/v1/feed?username=${handle}`;
    const response = await fetch(rssUrl);
    const data = await response.json();
    // Assuming the service returns an array of posts with image URL, caption, etc.
    // Adjust according to the actual API response format
    const posts = data.items?.slice(0, 12).map(item => ({
      imageUrl: item.media_url || item.image,
      caption: item.title || item.caption,
      link: item.permalink,
      timestamp: item.pubDate,
    })) || [];
    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch Instagram feed' });
  }
}