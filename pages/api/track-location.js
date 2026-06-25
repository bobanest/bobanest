// pages/api/track-location.js
import dbConnect from '@/lib/dbConnect';
import Visitor from '@/lib/models/Visitor';
import axios from 'axios';
import * as yup from 'yup';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    // Yup validation schema for location
    const schema = yup.object({
      lat: yup.number().optional(),
      lon: yup.number().optional(),
    });
    try {
      await schema.validate(req.body, { abortEarly: false });
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
    } catch (err) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}