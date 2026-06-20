import dbConnect from '@/lib/dbConnect';
import Employee from '@/lib/models/Employee';

export default async function handler(req, res) {
  await dbConnect();

  // simple protection: require EMPLOYEE_API_SECRET as header or body
  const secret = req.headers['x-employee-secret'] || req.body?.secret;
  const validSecret = process.env.EMPLOYEE_API_SECRET || process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET;
  if (!validSecret || secret !== validSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const list = await Employee.find().sort({ createdAt: -1 }).lean();
    return res.json(list);
  }

  if (req.method === 'POST') {
    const { _id, name, email, role, hourlyRate, assignedId } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email required' });

    const updateFields = {
      name,
      email: email.toLowerCase().trim(),
      role: role || 'staff',
      hourlyRate: hourlyRate || 0,
      isActive: true,
    };
    if (assignedId && assignedId.trim()) {
      updateFields.assignedId = assignedId.trim();
    }

    try {
      let emp;
      if (_id) {
        emp = await Employee.findByIdAndUpdate(
          _id,
          { $set: updateFields },
          { new: true, runValidators: true }
        );
      } else {
        emp = await Employee.findOneAndUpdate(
          { email: email.toLowerCase().trim() },
          { $set: updateFields },
          { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
        );
      }
      return res.json(emp);
    } catch (err) {
      console.error('Create employee error:', err);
      return res.status(500).json({ error: 'Failed to create employee' });
    }
  }

  res.status(405).end();
}
