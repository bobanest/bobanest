import dbConnect from '@/lib/dbConnect';
import Payment from '@/lib/models/Payment';
import PaymentHistory from '@/lib/models/PaymentHistory';
import Employee from '@/lib/models/Employee';

export default async function handler(req, res) {
  await dbConnect();
  const secret = req.headers['x-employee-secret'] || req.body?.secret;
  if (!process.env.EMPLOYEE_API_SECRET || secret !== process.env.EMPLOYEE_API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const list = await Payment.find().populate('employee').sort({ createdAt: -1 }).lean();
    return res.json(list);
  }

  if (req.method === 'POST') {
    const {
      employeeId,
      employeeName,
      paymentDate,
      periodStart,
      periodEnd,
      hours,
      paidHours,
      totalHours,
      gross,
      note,
    } = req.body;

    if (!employeeId && !employeeName) {
      return res.status(400).json({ error: 'employeeId or employeeName is required' });
    }

    try {
      let resolvedEmployeeId = employeeId || null;
      let resolvedEmployeeName = String(employeeName || '').trim();

      if (resolvedEmployeeId) {
        const employee = await Employee.findById(resolvedEmployeeId).lean();
        if (employee) {
          resolvedEmployeeName = employee.name || resolvedEmployeeName;
        }
      } else if (resolvedEmployeeName) {
        const employee = await Employee.findOne({
          name: { $regex: `^${resolvedEmployeeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        }).lean();
        if (employee) {
          resolvedEmployeeId = employee._id;
          resolvedEmployeeName = employee.name || resolvedEmployeeName;
        }
      }

      const effectiveDate = paymentDate ? new Date(paymentDate) : new Date();
      if (Number.isNaN(effectiveDate.getTime())) {
        return res.status(400).json({ error: 'Invalid paymentDate' });
      }

      const normalizedPeriodStart = periodStart ? new Date(periodStart) : effectiveDate;
      const normalizedPeriodEnd = periodEnd ? new Date(periodEnd) : effectiveDate;
      if (Number.isNaN(normalizedPeriodStart.getTime()) || Number.isNaN(normalizedPeriodEnd.getTime())) {
        return res.status(400).json({ error: 'Invalid period date values' });
      }

      const normalizedHours = Number(hours ?? paidHours ?? 0);
      const normalizedPaidHours = Number(paidHours ?? normalizedHours);
      const normalizedTotalHours = Number(totalHours ?? normalizedHours);
      const normalizedGross = Number(gross || 0);
      const p = await Payment.create({
        employee: resolvedEmployeeId,
        employeeName: resolvedEmployeeName,
        paymentDate: effectiveDate,
        periodStart: normalizedPeriodStart,
        periodEnd: normalizedPeriodEnd,
        hours: normalizedHours,
        paidHours: normalizedPaidHours,
        totalHours: normalizedTotalHours,
        gross: normalizedGross,
        note: String(note || '').trim(),
        status: 'pending'
      });

      await PaymentHistory.create({
        payment: p._id,
        employee: resolvedEmployeeId,
        employeeName: resolvedEmployeeName,
        action: 'created',
        previousStatus: null,
        newStatus: 'pending',
        gross: normalizedGross,
        periodStart: normalizedPeriodStart,
        periodEnd: normalizedPeriodEnd,
        note: 'Payment created manually',
      });
      return res.json(p);
    } catch (err) {
      console.error('Create payment error:', err);
      return res.status(500).json({ error: 'Failed to create payment' });
    }
  }

  res.status(405).end();
}
