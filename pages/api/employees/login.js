import dbConnect from '@/lib/dbConnect';
import Employee from '@/lib/models/Employee';
import Attendance from '@/lib/models/Attendance';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== 'POST') return res.status(405).end();

  try {
    // simple auth for the endpoint
    const secret = req.headers['x-employee-secret'] || req.body.secret;
    if (!process.env.EMPLOYEE_API_SECRET || secret !== process.env.EMPLOYEE_API_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email, employeeId, assignedId } = req.body;
    if (!email && !employeeId && !assignedId) return res.status(400).json({ error: 'employeeId, assignedId, or email required' });

    const employee = employeeId
      ? await Employee.findById(employeeId)
      : assignedId
      ? await Employee.findOne({ assignedId: assignedId.trim() })
      : await Employee.findOne({ email: email.toLowerCase() });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const attendance = new Attendance({ employee: employee._id, type: 'login', ip, userAgent });
    await attendance.save();

    // Send notification email
    const subject = `Employee Login: ${employee.name}`;
    const html = `
      <p><strong>${employee.name}</strong> (${employee.email}) logged in.</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>IP:</strong> ${ip}</p>
      <p><strong>User Agent:</strong> ${userAgent}</p>
    `;

    try {
      await resend.emails.send({
        from: 'Bobanest <orders@bobanest.com>',
        to: ['bobanest.us@gmail.com'],
        subject,
        html,
      });
    } catch (err) {
      console.error('Email send failed:', err);
    }

    return res.json({ success: true, attendanceId: attendance._id });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
