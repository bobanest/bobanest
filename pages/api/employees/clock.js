import dbConnect from '@/lib/dbConnect';
import Employee from '@/lib/models/Employee';
import Attendance from '@/lib/models/Attendance';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendAttendanceEmail(employee, type, ip, userAgent) {
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const subject = type === 'login' ? `Employee Login: ${employee.name}` : `Employee Logout: ${employee.name}`;
  const html = `
    <p><strong>${employee.name}</strong> (${employee.email}) ${type === 'login' ? 'logged in' : 'logged out'}.</p>
    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>IP:</strong> ${ip}</p>
    <p><strong>User Agent:</strong> ${userAgent}</p>
  `;

  await resend.emails.send({
    from: 'Bobanest <orders@bobanest.com>',
    to: ['bobanest.us@gmail.com'],
    subject,
    html,
  });
}

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const { assignedId } = req.query;
    if (!assignedId) return res.status(400).json({ error: 'assignedId required' });

    const employee = await Employee.findOne({ assignedId: assignedId.trim() });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const lastAttendance = await Attendance.findOne({ employee: employee._id }).sort({ timestamp: -1 }).lean();
    const status = lastAttendance?.type === 'login' ? 'in' : 'out';
    return res.json({ status, lastType: lastAttendance?.type, lastTimestamp: lastAttendance?.timestamp });
  }

  if (req.method === 'POST') {
    const secret = req.headers['x-employee-secret'] || req.body.secret;
    const validSecret = process.env.EMPLOYEE_API_SECRET || process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET;
    if (!validSecret || secret !== validSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { assignedId } = req.body;
    if (!assignedId) return res.status(400).json({ error: 'assignedId required' });

    const employee = await Employee.findOne({ assignedId: assignedId.trim() });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const lastAttendance = await Attendance.findOne({ employee: employee._id }).sort({ timestamp: -1 });
    const type = lastAttendance?.type === 'login' ? 'logout' : 'login';

    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const attendance = new Attendance({ employee: employee._id, type, ip, userAgent });
    await attendance.save();

    if (!resend) {
      return res.status(500).json({ success: false, error: 'Email service not configured' });
    }

    try {
      await sendAttendanceEmail(employee, type, ip, userAgent);
    } catch (err) {
      console.error('Email send failed:', err);
      return res.status(500).json({ success: false, error: 'Failed to send email' });
    }

    return res.json({ success: true, type, attendanceId: attendance._id });
  }

  res.status(405).end();
}
