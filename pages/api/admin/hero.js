
import dbConnect from '@/lib/dbConnect';
import HeroSetting from '@/lib/models/HeroSetting';
import * as yup from 'yup';

const DEPLOYED_HERO_URL = 'https://www.bobanest.com/api/admin/hero';
const DEFAULT_HERO = {
  imageUrl: '/hero-default.jpg',
  title: 'Fresh Bubble Tea Delivered to You',
  subtitle: 'Handcrafted with premium ingredients. Order online for pickup or delivery.',
};

async function fetchDeployedHero() {
  try {
    const response = await fetch(DEPLOYED_HERO_URL);
    if (!response.ok) return null;
    const data = await response.json();
    return data && typeof data === 'object' ? data : null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  try {
    await dbConnect();
  } catch (error) {
    if (req.method === 'GET') {
      const deployedHero = await fetchDeployedHero();
      return res.status(200).json(deployedHero || DEFAULT_HERO);
    }

    return res.status(503).json({ error: 'Database unavailable' });
  }

  if (req.method === 'GET') {
    let hero = await HeroSetting.findOne();
    if (!hero) hero = new HeroSetting(DEFAULT_HERO);
    return res.status(200).json(hero);
  }


  if (req.method === 'POST') {
    // Yup validation schema
    const schema = yup.object({
      imageUrl: yup.string().url().required(),
      title: yup.string().required(),
      subtitle: yup.string().required(),
    });
    try {
      await schema.validate(req.body, { abortEarly: false });
      const { imageUrl, title, subtitle } = req.body;
      let hero = await HeroSetting.findOne();
      if (!hero) hero = new HeroSetting();
      hero.imageUrl = imageUrl || hero.imageUrl;
      hero.title = title || hero.title;
      hero.subtitle = subtitle || hero.subtitle;
      hero.updatedAt = Date.now();
      await hero.save();
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}