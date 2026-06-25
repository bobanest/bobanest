import dbConnect from '@/lib/dbConnect';
import Attendance from '@/lib/models/Attendance';
import Employee from '@/lib/models/Employee';

export default async function handler(req, res) {
  await dbConnect();
  const secret = req.headers['x-employee-secret'] || req.query?.secret || req.body?.secret;
  if (!process.env.EMPLOYEE_API_SECRET || secret !== process.env.EMPLOYEE_API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { employeeId, start, end, unpaidOnly } = req.query;
    const q = {};
    if (employeeId) q.employee = employeeId;
    if (unpaidOnly === 'true') q.isPaid = { $ne: true };
    if (start || end) q.timestamp = {};
    if (start) q.timestamp.$gte = new Date(start);
    if (end) q.timestamp.$lte = new Date(end);

    const logs = await Attendance.find(q).populate('employee').sort({ timestamp: -1 }).lean();
    return res.json(logs);
  }

  if (req.method === 'POST') {
    const { employeeId, assignedId, type, timestamp } = req.body || {};
    if (!type || !['login', 'logout'].includes(type)) {
      return res.status(400).json({ error: 'type must be login or logout' });
    }
    if (!employeeId && !assignedId) {
      return res.status(400).json({ error: 'employeeId or assignedId required' });
    }

    const employee = employeeId
      ? await Employee.findById(employeeId)
      : await Employee.findOne({ assignedId: assignedId.trim() });

    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const when = timestamp ? new Date(timestamp) : new Date();
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ error: 'Invalid timestamp' });
    }

    const attendance = await Attendance.create({
      employee: employee._id,
      type,
      timestamp: when,
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || 'admin-manual-entry',
    });

    const populated = await Attendance.findById(attendance._id).populate('employee').lean();
    return res.status(201).json(populated);
  }

  if (req.method === 'PUT') {
    const { ids, isPaid = true } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const update = isPaid
      ? { isPaid: true, paidAt: new Date() }
      : { isPaid: false, paidAt: null };

    await Attendance.updateMany({ _id: { $in: ids } }, { $set: update });
    return res.json({ success: true, count: ids.length, isPaid: Boolean(isPaid) });
  }

  res.status(405).end();
}
