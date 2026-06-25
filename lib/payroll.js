import dbConnect from '@/lib/dbConnect';
import Employee from '@/lib/models/Employee';
import Attendance from '@/lib/models/Attendance';
import Payment from '@/lib/models/Payment';

// Calculate hours worked for an employee between periodStart and periodEnd
export async function calculateEmployeeHours(employeeId, periodStart, periodEnd) {
  await dbConnect();
  const attendances = await Attendance.find({
    employee: employeeId,
    isPaid: { $ne: true },
    timestamp: { $gte: periodStart, $lte: periodEnd }
  }).sort({ timestamp: 1 }).lean();

  let totalMs = 0;
  let lastLogin = null;

  for (const a of attendances) {
    if (a.type === 'login') {
      lastLogin = new Date(a.timestamp);
    } else if (a.type === 'logout') {
      if (lastLogin) {
        const logout = new Date(a.timestamp);
        totalMs += Math.max(0, logout - lastLogin);
        lastLogin = null;
      }
    }
  }

  // If there's an open login that extends to periodEnd
  if (lastLogin) {
    totalMs += Math.max(0, new Date(periodEnd) - lastLogin);
  }

  const hours = totalMs / (1000 * 60 * 60);
  return hours;
}

export async function calculatePayroll(periodStart, periodEnd) {
  await dbConnect();
  const employees = await Employee.find({ isActive: true }).lean();
  const payments = [];

  for (const emp of employees) {
    const hours = await calculateEmployeeHours(emp._id, periodStart, periodEnd);
    const gross = Math.round((hours * (emp.hourlyRate || 0)) * 100) / 100;

    const payment = await Payment.create({
      employee: emp._id,
      periodStart,
      periodEnd,
      hours: Math.round(hours * 100) / 100,
      gross,
      status: 'pending'
    });

    payments.push({ employee: emp, payment });
  }

  return payments;
}
