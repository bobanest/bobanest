import dbConnect from '@/lib/dbConnect';
import Employee from '@/lib/models/Employee';
import Attendance from '@/lib/models/Attendance';
import Payment from '@/lib/models/Payment';
import PaymentHistory from '@/lib/models/PaymentHistory';

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

export function calculateHoursFromAttendances(attendances, periodEnd = new Date()) {
  let totalMs = 0;
  let lastLogin = null;

  for (const a of attendances) {
    if (a.type === 'login') {
      lastLogin = new Date(a.timestamp);
    } else if (a.type === 'logout' && lastLogin) {
      const logout = new Date(a.timestamp);
      totalMs += Math.max(0, logout - lastLogin);
      lastLogin = null;
    }
  }

  if (lastLogin) {
    totalMs += Math.max(0, new Date(periodEnd) - lastLogin);
  }

  return totalMs / (1000 * 60 * 60);
}

// Calculate hours worked for an employee between periodStart and periodEnd
export async function calculateEmployeeHours(employeeId, periodStart, periodEnd) {
  await dbConnect();
  const attendances = await Attendance.find({
    employee: employeeId,
    isPaid: { $ne: true },
    timestamp: { $gte: periodStart, $lte: periodEnd }
  }).sort({ timestamp: 1 }).lean();
  return calculateHoursFromAttendances(attendances, periodEnd);
}

export async function getPayrollPreview(periodStart, periodEnd, payableHoursByEmployee = {}) {
  await dbConnect();
  const employees = await Employee.find({ isActive: true }).lean();
  const preview = [];

  for (const emp of employees) {
    const totalHours = round2(await calculateEmployeeHours(emp._id, periodStart, periodEnd));
    const requested = Number(payableHoursByEmployee?.[String(emp._id)]);
    const payableHours = round2(
      Number.isFinite(requested)
        ? Math.max(0, Math.min(requested, totalHours))
        : totalHours
    );
    const hourlyRate = Number(emp.hourlyRate || 0);
    const gross = round2(payableHours * hourlyRate);

    preview.push({ employee: emp, totalHours, payableHours, hourlyRate, gross });
  }

  return preview;
}

export async function calculatePayroll(periodStart, periodEnd, payableHoursByEmployee = {}) {
  const preview = await getPayrollPreview(periodStart, periodEnd, payableHoursByEmployee);
  const payments = [];

  for (const row of preview) {
    const payment = await Payment.create({
      employee: row.employee._id,
      employeeName: row.employee.name || '',
      paymentDate: periodEnd,
      periodStart,
      periodEnd,
      hours: row.payableHours,
      totalHours: row.totalHours,
      paidHours: row.payableHours,
      gross: row.gross,
      status: 'pending'
    });

    await PaymentHistory.create({
      payment: payment._id,
      employee: row.employee._id,
      employeeName: row.employee.name || '',
      action: 'created',
      previousStatus: null,
      newStatus: 'pending',
      gross: row.gross,
      periodStart,
      periodEnd,
      note: 'Payment created from payroll calculation',
    });

    payments.push({
      employee: row.employee,
      payment,
      totalHours: row.totalHours,
      payableHours: row.payableHours,
      gross: row.gross,
    });
  }

  return payments;
}
