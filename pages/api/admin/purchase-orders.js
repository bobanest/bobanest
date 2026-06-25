import dbConnect from '@/lib/dbConnect';
import PurchaseOrder from '@/lib/models/PurchaseOrder';
import InventoryItem from '@/lib/models/InventoryItem';
import Expense from '@/lib/models/Expense';
import nodemailer from 'nodemailer';

async function sendPOEmail(po) {
  if (!po.vendorEmail) return;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  const itemsHtml = po.items.map(i =>
    `<tr><td style="padding:4px 8px">${i.name}</td><td style="padding:4px 8px;text-align:center">${i.quantity} ${i.unit}</td><td style="padding:4px 8px;text-align:right">$${parseFloat(i.unitCost).toFixed(2)}</td><td style="padding:4px 8px;text-align:right">$${(i.quantity*i.unitCost).toFixed(2)}</td></tr>`
  ).join('');
  const shippingRow = po.shippingCost > 0 ? `<tr><td colspan="3" style="padding:4px 8px;text-align:right">Shipping</td><td style="padding:4px 8px;text-align:right">$${po.shippingCost.toFixed(2)}</td></tr>` : '';
  const taxRow = po.taxAmount > 0 ? `<tr><td colspan="3" style="padding:4px 8px;text-align:right">Tax (${po.taxRate}%)</td><td style="padding:4px 8px;text-align:right">$${po.taxAmount.toFixed(2)}</td></tr>` : '';
  await transporter.sendMail({
    from: `Bobanest <${process.env.EMAIL_USER}>`,
    to: po.vendorEmail,
    subject: `Purchase Order ${po.poNumber} from Bobanest`,
    html: `
      <h2>Purchase Order: ${po.poNumber}</h2>
      <p><strong>Vendor:</strong> ${po.vendor}</p>
      ${po.submittedAt ? `<p><strong>Order Date:</strong> ${new Date(po.submittedAt).toLocaleDateString()}</p>` : ''}
      ${po.notes ? `<p><strong>Notes:</strong> ${po.notes}</p>` : ''}
      <table border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;margin-top:12px">
        <thead><tr style="background:#f5f5f5">
          <th style="padding:6px 8px;text-align:left">Item</th>
          <th style="padding:6px 8px">Qty</th>
          <th style="padding:6px 8px;text-align:right">Unit Cost</th>
          <th style="padding:6px 8px;text-align:right">Total</th>
        </tr></thead>
        <tbody>${itemsHtml}${shippingRow}${taxRow}
          <tr style="font-weight:bold;background:#f5f5f5">
            <td colspan="3" style="padding:6px 8px;text-align:right">Grand Total</td>
            <td style="padding:6px 8px;text-align:right">$${po.totalCost.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <p style="margin-top:16px;color:#666">Please confirm receipt of this order. Thank you!</p>
    `,
  });
}

// Register any new items in inventory when a PO is created (stock stays 0 until received)
async function registerNewInventoryItems(items) {
  for (const item of items) {
    const exists = await InventoryItem.findOne({ name: { $regex: new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
    if (!exists) {
      await InventoryItem.create({ name: item.name, unit: item.unit || 'unit', stockCount: 0 });
    }
  }
}

// Add received quantities to inventory (with conversion factor support)
async function receiveIntoInventory(items) {
  for (const item of items) {
    const escaped = item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const factor = parseFloat(item.conversionFactor) || 1;
    const inventoryQty = parseFloat(item.quantity) * factor;
    const inventoryUnit = item.inventoryUnit || item.unit;
    const existing = await InventoryItem.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
    if (existing) {
      existing.stockCount = (existing.stockCount || 0) + inventoryQty;
      existing.unit = inventoryUnit || existing.unit;
      existing.updatedAt = new Date();
      await existing.save();
    } else {
      await InventoryItem.create({ name: item.name, unit: inventoryUnit || 'unit', stockCount: inventoryQty });
    }
  }
}

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const pos = await PurchaseOrder.find({}).sort({ createdAt: -1 }).lean();
    return res.json(pos);
  }

  if (req.method === 'POST') {
    const { vendor, vendorEmail, items, notes, shippingCost, taxRate, submittedAt, receivedAt, sendEmail } = req.body;
    if (!vendor || !items?.length) return res.status(400).json({ error: 'vendor and items required' });
    const itemsTotal = items.reduce((s, i) => s + (parseFloat(i.unitCost) * parseFloat(i.quantity)), 0);
    const shipping = parseFloat(shippingCost) || 0;
    const rate = taxRate !== undefined ? parseFloat(taxRate) : 7;
    const taxAmount = itemsTotal * (rate / 100);
    const totalCost = itemsTotal + shipping + taxAmount;
    const po = await PurchaseOrder.create({
      vendor, vendorEmail: vendorEmail || '',
      items, notes, shippingCost: shipping, taxRate: rate, taxAmount, totalCost,
      submittedAt: submittedAt ? new Date(submittedAt) : null,
      receivedAt: receivedAt ? new Date(receivedAt) : null,
    });
    let emailError = null;
    if (sendEmail && vendorEmail) {
      try { await sendPOEmail(po); } catch(e) { console.error('PO email error:', e.message); emailError = e.message; }
    }
    // Register new items in inventory (stock=0, pending delivery)
    try { await registerNewInventoryItems(items); } catch(e) { console.error('Inventory register error:', e.message); }
    return res.status(201).json({ ...po.toObject(), emailError });
  }

  if (req.method === 'PUT') {
    const { id, status, notes, items, vendor, sendEmail } = req.body;
    const update = {};
    if (status) update.status = status;
    if (notes !== undefined) update.notes = notes;
    if (vendor) update.vendor = vendor;
    if (req.body.vendorEmail !== undefined) update.vendorEmail = req.body.vendorEmail;
    if (req.body.submittedAt !== undefined) update.submittedAt = req.body.submittedAt ? new Date(req.body.submittedAt) : null;
    if (req.body.receivedAt !== undefined) update.receivedAt = req.body.receivedAt ? new Date(req.body.receivedAt) : null;
    if (items !== undefined) {
      update.items = items;
      const shipping = parseFloat(update.shippingCost ?? 0) || 0;
      update.totalCost = items.reduce((s, i) => s + (parseFloat(i.unitCost) * parseFloat(i.quantity)), 0) + shipping;
    }
    if (req.body.shippingCost !== undefined) {
      update.shippingCost = parseFloat(req.body.shippingCost) || 0;
    }
    if (req.body.taxRate !== undefined) {
      update.taxRate = parseFloat(req.body.taxRate) ?? 7;
    }
    // Recalculate totalCost if items, shipping, or tax changed
    if (items !== undefined || req.body.shippingCost !== undefined || req.body.taxRate !== undefined) {
      const baseItems = update.items || [];
      const itemsSubtotal = baseItems.reduce((s, i) => s + (parseFloat(i.unitCost) * parseFloat(i.quantity)), 0);
      const ship = update.shippingCost ?? 0;
      const rate = update.taxRate ?? 7;
      update.taxAmount = itemsSubtotal * (rate / 100);
      update.totalCost = itemsSubtotal + ship + update.taxAmount;
    }
    const po = await PurchaseOrder.findByIdAndUpdate(id, update, { new: true });
    // When marked received, add quantities to inventory
    if (status === 'received') {
      try { await receiveIntoInventory(po.items); } catch(e) { console.error('Inventory receive error:', e.message); }
      try {
        await Expense.create({
          description: `PO #${po.poNumber} — ${po.vendor}`,
          amount: po.totalCost,
          category: 'ingredients',
          date: po.receivedAt || new Date(),
          notes: `Auto-created from received purchase order. Items: ${po.items.map(i => `${i.quantity} ${i.unit} ${i.name}`).join(', ')}`,
        });
      } catch(e) { console.error('Expense auto-create error:', e.message); }
    }
    let emailError = null;
    if (sendEmail && po.vendorEmail) {
      try { await sendPOEmail(po); } catch(e) { console.error('PO email error:', e.message); emailError = e.message; }
    }
    return res.json({ ...po.toObject(), emailError });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    await PurchaseOrder.findByIdAndDelete(id);
    return res.json({ success: true });
  }

  return res.status(405).end();
}
