import dbConnect from '@/lib/dbConnect';
import InstagramSetting from '@/lib/models/InstagramSetting';

export default async function handler(req, res) {
  await dbConnect();
  if (req.method === 'GET') {
    let setting = await InstagramSetting.findOne();
    if (!setting) setting = new InstagramSetting();
    res.json({ handle: setting.instagramHandle });
  } else if (req.method === 'POST') {
    const { handle } = req.body;
    let setting = await InstagramSetting.findOne();
    if (!setting) setting = new InstagramSetting();
    setting.instagramHandle = handle;
    setting.updatedAt = Date.now();
    await setting.save();
    res.json({ success: true });
  } else {
    res.status(405).end();
  }
}