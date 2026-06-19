
import dbConnect from '@/lib/dbConnect';
import HeroSetting from '@/lib/models/HeroSetting';
import * as yup from 'yup';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    let hero = await HeroSetting.findOne();
    if (!hero) hero = new HeroSetting();
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