import dbConnect from '@/lib/dbConnect';
import FacebookTracking from '@/lib/models/FacebookTracking';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      let settings = await FacebookTracking.findOne();
      if (!settings) {
        settings = new FacebookTracking();
        await settings.save();
      }
      return res.json({
        pixelId: settings.pixelId,
        accessToken: settings.accessToken,
        enabled: settings.enabled,
        testEventCode: settings.testEventCode
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load settings' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { pixelId, accessToken, enabled, testEventCode } = req.body;

      let settings = await FacebookTracking.findOne();
      if (!settings) {
        settings = new FacebookTracking();
      }

      settings.pixelId = pixelId || '';
      settings.accessToken = accessToken || '';
      settings.enabled = !!enabled;
      settings.testEventCode = testEventCode || '';
      settings.updatedAt = new Date();

      await settings.save();

      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to save settings' });
    }
  }

  res.status(405).end();
}