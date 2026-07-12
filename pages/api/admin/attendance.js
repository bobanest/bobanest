import dbConnect from '@/lib/dbConnect';
import Attendance from '@/lib/models/Attendance';
import Employee from '@/lib/models/Employee';
import Expense from '@/lib/models/Expense';

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function calculateHoursFromAttendances(attendances, periodEnd = new Date()) {
  let totalMs = 0;
  let lastLogin = null;

  for (const row of attendances) {
    if (row.type === 'login') {
      lastLogin = new Date(row.timestamp);
    } else if (row.type === 'logout' && lastLogin) {
      const logout = new Date(row.timestamp);
      totalMs += Math.max(0, logout - lastLogin);
      lastLogin = null;
    }
  }

  if (lastLogin) {
    totalMs += Math.max(0, new Date(periodEnd) - lastLogin);
  }

  return totalMs / (1000 * 60 * 60);
}

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

    const targetIds = ids.map((id) => String(id));
    const unpaidLogs = await Attendance.find({
      _id: { $in: targetIds },
      isPaid: { $ne: true },
    })
      .populate('employee')
      .sort({ timestamp: 1 })
      .lean();

    if (Boolean(isPaid) && unpaidLogs.length > 0) {
      const grouped = unpaidLogs.reduce((acc, log) => {
        const employeeId = String(log?.employee?._id || '');
        if (!employeeId) return acc;
        if (!acc[employeeId]) {
          acc[employeeId] = { employee: log.employee, logs: [] };
        }
        acc[employeeId].logs.push(log);
        return acc;
      }, {});

      const expensesToCreate = Object.values(grouped)
        .map(({ employee, logs }) => {
          const paidHours = round2(calculateHoursFromAttendances(logs));
          const hourlyRate = Number(employee?.hourlyRate || 0);
          const amount = round2(paidHours * hourlyRate);

          if (amount <= 0) return null;
          const employeeName = employee?.name || 'Employee';
          const from = logs[0]?.timestamp ? new Date(logs[0].timestamp).toISOString().slice(0, 10) : '';
          const to = logs[logs.length - 1]?.timestamp ? new Date(logs[logs.length - 1].timestamp).toISOString().slice(0, 10) : '';

          return {
            description: `Payroll - ${employeeName}`,
            amount,
            category: 'labor',
            date: new Date(),
            notes: `Auto from payroll mark paid | Employee: ${employeeName} | Hours: ${paidHours.toFixed(2)} | Rate: $${round2(hourlyRate).toFixed(2)} | Records: ${logs.length} | Range: ${from} to ${to}`,
          };
        })
        .filter(Boolean);

      if (expensesToCreate.length) {
        await Expense.insertMany(expensesToCreate);
      }
    }

    const update = isPaid
      ? { isPaid: true, paidAt: new Date() }
      : { isPaid: false, paidAt: null };

    const updateResult = await Attendance.updateMany(
      { _id: { $in: targetIds }, isPaid: { $ne: Boolean(isPaid) } },
      { $set: update }
    );
    return res.json({ success: true, count: Number(updateResult.modifiedCount || 0), isPaid: Boolean(isPaid) });
  }

  if (req.method === 'PATCH') {
    const { id, employeeId, type, timestamp } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }
    if (!type || !['login', 'logout'].includes(type)) {
      return res.status(400).json({ error: 'type must be login or logout' });
    }
    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }
    if (!timestamp) {
      return res.status(400).json({ error: 'timestamp is required' });
    }

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    if (attendance.isPaid) {
      return res.status(400).json({ error: 'Paid attendance records cannot be edited' });
    }

    const employee = await Employee.findById(employeeId).lean();
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const when = new Date(timestamp);
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ error: 'Invalid timestamp' });
    }

    attendance.employee = employeeId;
    attendance.type = type;
    attendance.timestamp = when;
    attendance.userAgent = 'admin-manual-edit';
    await attendance.save();

    const populated = await Attendance.findById(attendance._id).populate('employee').lean();
    return res.json(populated);
  }

  res.status(405).end();
}
