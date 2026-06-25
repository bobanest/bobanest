import dbConnect from '@/lib/dbConnect';
import WalkInLog from '@/lib/models/WalkInLog';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  await dbConnect();

  const { date } = req.query; // optional: YYYY-MM-DD
  const targetDate = date ? new Date(date) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to yesterday for cron
  targetDate.setHours(0, 0, 0, 0);

  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  try {
    // Check if we already have data for this date
    const existing = await WalkInLog.findOne({
      date: { $gte: targetDate, $lt: nextDay },
      source: 'shift4'
    });

    if (existing) {
      return res.json({
        success: true,
        message: `Already synced for ${targetDate.toISOString().slice(0, 10)}`,
        data: existing
      });
    }

    // Fetch from Shift4 API
    // Note: Adjust endpoint and parameters based on actual Shift4 API documentation
    const shift4Response = await fetch(`https://api.shift4.com/v2/transactions?created.gte=${targetDate.toISOString().slice(0, 10)}T00:00:00Z&created.lt=${nextDay.toISOString().slice(0, 10)}T00:00:00Z&limit=1000`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.SHIFT4_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!shift4Response.ok) {
      throw new Error(`Shift4 API error: ${shift4Response.status}`);
    }

    const shift4Data = await shift4Response.json();

    // Aggregate transactions by date
    let totalAmount = 0;
    let transactionCount = 0;

    for (const transaction of shift4Data.transactions || []) {
      if (transaction.status === 'completed' && transaction.amount > 0) {
        totalAmount += transaction.amount / 100; // Convert cents to dollars
        transactionCount++;
      }
    }

    if (totalAmount === 0) {
      return res.json({
        success: true,
        message: `No sales data for ${targetDate.toISOString().slice(0, 10)}`,
        data: null
      });
    }

    // Create WalkInLog entry
    const walkInLog = new WalkInLog({
      date: targetDate,
      grossSales: totalAmount,
      netSales: totalAmount, // Assuming no refunds for simplicity
      items: [{
        productName: 'Shift4 Transactions',
        quantity: transactionCount,
        price: totalAmount / transactionCount
      }],
      source: 'shift4',
      notes: `Auto-imported from Shift4 (${transactionCount} transactions)`
    });

    await walkInLog.save();

    res.json({
      success: true,
      message: `Synced ${transactionCount} transactions totaling $${totalAmount.toFixed(2)}`,
      data: walkInLog
    });

  } catch (error) {
    console.error('Shift4 sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}