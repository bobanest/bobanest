import dbConnect from '@/lib/dbConnect';
import Employee from '@/lib/models/Employee';
import EmployeeSchedule from '@/lib/models/EmployeeSchedule';

function ensureAuthorized(req, res) {
  const secret = req.headers['x-employee-secret'] || req.query?.secret || req.body?.secret;
  if (!process.env.EMPLOYEE_API_SECRET || secret !== process.env.EMPLOYEE_API_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

function getMonthRange(monthStr) {
  if (!/^\d{4}-\d{2}$/.test(monthStr || '')) return null;
  const [year, month] = monthStr.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return null;
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { start, end };
}

function parseShiftPayload(body = {}) {
  const employeeId = String(body.employeeId || '').trim();
  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);
  const title = String(body.title || 'Shift').trim() || 'Shift';
  const notes = String(body.notes || '').trim();

  if (!employeeId) return { error: 'employeeId is required' };
  if (Number.isNaN(startAt.getTime())) return { error: 'startAt is invalid' };
  if (Number.isNaN(endAt.getTime())) return { error: 'endAt is invalid' };
  if (endAt <= startAt) return { error: 'endAt must be after startAt' };

  return { employeeId, startAt, endAt, title, notes };
}

export default async function handler(req, res) {
  await dbConnect();

  if (!ensureAuthorized(req, res)) return;

  if (req.method === 'GET') {
    const { month } = req.query;
    const monthRange = getMonthRange(String(month || ''));
    const query = { isCancelled: { $ne: true } };
    if (monthRange) {
      query.startAt = { $gte: monthRange.start, $lt: monthRange.end };
    }

    const schedules = await EmployeeSchedule.find(query)
      .populate('employee')
      .sort({ startAt: 1 })
      .lean();
    return res.json(schedules);
  }

  if (req.method === 'POST') {
    const parsed = parseShiftPayload(req.body || {});
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const employee = await Employee.findById(parsed.employeeId).lean();
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const created = await EmployeeSchedule.create({
      employee: parsed.employeeId,
      startAt: parsed.startAt,
      endAt: parsed.endAt,
      title: parsed.title,
      notes: parsed.notes,
      createdBy: 'admin',
    });
    const populated = await EmployeeSchedule.findById(created._id).populate('employee').lean();
    return res.status(201).json(populated);
  }

  if (req.method === 'PUT') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });

    const parsed = parseShiftPayload(req.body || {});
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const employee = await Employee.findById(parsed.employeeId).lean();
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const updated = await EmployeeSchedule.findByIdAndUpdate(
      id,
      {
        $set: {
          employee: parsed.employeeId,
          startAt: parsed.startAt,
          endAt: parsed.endAt,
          title: parsed.title,
          notes: parsed.notes,
        },
      },
      { new: true, runValidators: true }
    ).populate('employee');

    if (!updated) return res.status(404).json({ error: 'Schedule not found' });
    return res.json(updated);
  }

  if (req.method === 'DELETE') {
    const id = String(req.query.id || req.body?.id || '').trim();
    if (!id) return res.status(400).json({ error: 'id is required' });
    const deleted = await EmployeeSchedule.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ error: 'Schedule not found' });
    return res.json({ success: true });
  }

  return res.status(405).end();
}
