// pages/api/track-location.js
import dbConnect from '@/lib/dbConnect';
import Visitor from '@/lib/models/Visitor';
import axios from 'axios';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    const { lat, lon } = req.body;
    let locationData = {};

    if (lat && lon) {
      // Reverse geocode using OpenStreetMap
      try {
        const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        locationData = {
          city: geoRes.data.address?.city || geoRes.data.address?.town,
          region: geoRes.data.address?.state,
          country: geoRes.data.address?.country,
          lat,
          lon,
        };
      } catch (error) {
        console.error('Geocoding failed');
      }
    } else {
      // IP-based fallback
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      locationData = { ip };
    }

    await Visitor.create({
      ...locationData,
      userAgent: req.headers['user-agent'],
    });

    res.status(200).json({ message: 'Location tracked' });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}