import fs from 'fs/promises';
import path from 'path';
import dbConnect from '@/lib/dbConnect';
import WalkInLog from '@/lib/models/WalkInLog';

const filePath = path.join(process.cwd(), 'data', 'local-walkin-logs.json');

async function readFallback() {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeFallback(data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();
      const logs = await WalkInLog.find({}).sort({ date: -1, createdAt: -1 }).lean();
      return res.json(logs);
    } catch {
      return res.json(await readFallback());
    }
  }

  if (req.method === 'POST') {
    const payload = {
      _id: makeId(),
      date: req.body?.date || new Date().toISOString().slice(0, 10),
      items: req.body?.items || [],
      note: req.body?.note || '',
      source: req.body?.source || 'manual',
      grossSales: Number(req.body?.grossSales || 0),
      netSales: Number(req.body?.netSales || 0),
      discounts: Number(req.body?.discounts || 0),
      inventoryDeducted: false,
      createdAt: new Date().toISOString(),
    };

    try {
      await dbConnect();
      const created = await WalkInLog.create(payload);
      return res.status(201).json({ ...created.toObject(), deductions: 0 });
    } catch {
      const logs = await readFallback();
      logs.unshift(payload);
      await writeFallback(logs);
      return res.status(201).json({ ...payload, deductions: 0 });
    }
  }

  if (req.method === 'PUT') {
    const { id, grossSales = 0, netSales = 0, discounts = 0 } = req.body || {};

    try {
      await dbConnect();
      const updated = await WalkInLog.findByIdAndUpdate(
        id,
        { grossSales, netSales, discounts },
        { new: true }
      );
      return res.json(updated);
    } catch {
      const logs = await readFallback();
      const next = logs.map((log) =>
        log._id === id ? { ...log, grossSales, netSales, discounts } : log
      );
      await writeFallback(next);
      return res.json({ success: true });
    }
  }

  if (req.method === 'DELETE') {
    const id = req.body?.id;

    try {
      await dbConnect();
      await WalkInLog.findByIdAndDelete(id);
      return res.json({ success: true });
    } catch {
      const logs = await readFallback();
      await writeFallback(logs.filter((log) => log._id !== id));
      return res.json({ success: true });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}