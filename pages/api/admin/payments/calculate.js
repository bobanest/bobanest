import { calculatePayroll, getPayrollPreview } from '@/lib/payroll';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const secret = req.headers['x-employee-secret'] || req.body?.secret;
  if (!process.env.EMPLOYEE_API_SECRET || secret !== process.env.EMPLOYEE_API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { periodStart, periodEnd, previewOnly = false, payableHoursByEmployee = {} } = req.body;
    if (!periodStart || !periodEnd) return res.status(400).json({ error: 'periodStart and periodEnd required' });

    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (isNaN(start) || isNaN(end) || start >= end) return res.status(400).json({ error: 'Invalid period' });

    if (previewOnly) {
      const preview = await getPayrollPreview(start, end, payableHoursByEmployee);
      return res.json({ success: true, preview });
    }

    const payments = await calculatePayroll(start, end, payableHoursByEmployee);
    return res.json({ success: true, payments });
  } catch (err) {
    console.error('Payroll calculate error:', err);
    return res.status(500).json({ error: 'Failed to calculate payroll' });
  }
}
