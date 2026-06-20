import dbConnect from '@/lib/dbConnect';
import Attendance from '@/lib/models/Attendance';

export default async function handler(req, res) {
  await dbConnect();
  const secret = req.headers['x-employee-secret'] || req.query?.secret;
  const validSecret = process.env.EMPLOYEE_API_SECRET || process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET;
  if (!validSecret || secret !== validSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { employeeId, start, end } = req.query;
    const q = {};
    if (employeeId) q.employee = employeeId;
    if (start || end) q.timestamp = {};
    if (start) q.timestamp.$gte = new Date(start);
    if (end) q.timestamp.$lte = new Date(end);

    const logs = await Attendance.find(q).populate('employee').sort({ timestamp: -1 }).lean();
    return res.json(logs);
  }

  res.status(405).end();
}
