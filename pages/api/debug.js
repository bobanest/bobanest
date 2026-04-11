export default function handler(req, res) {
  res.status(200).json({
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'missing',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set' : 'missing',
      MONGODB_URI: process.env.MONGODB_URI ? 'set' : 'missing',
    },
    timestamp: new Date().toISOString(),
  });
}