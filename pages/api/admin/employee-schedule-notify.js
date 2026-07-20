import dbConnect from '@/lib/dbConnect';
import EmployeeSchedule from '@/lib/models/EmployeeSchedule';
import ScheduleNotificationLog from '@/lib/models/ScheduleNotificationLog';
import { sendEmployeeScheduleEmail } from '@/lib/employeeScheduleEmail';

const DEFAULT_TIMEZONE = process.env.SCHEDULE_TIMEZONE || 'America/New_York';

function isAuthorized(req) {
  const vercelCron = req.headers['x-vercel-cron'];
  if (vercelCron === '1') return true;

  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const secret = String(req.query?.secret || req.body?.secret || bearer || '').trim();
  const validSecrets = [process.env.CRON_SECRET, process.env.EMPLOYEE_API_SECRET].filter(Boolean);
  return validSecrets.includes(secret);
}

function getLocalParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(date);

  const read = (type) => parts.find((p) => p.type === type)?.value;
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    year: Number(read('year')),
    month: Number(read('month')),
    day: Number(read('day')),
    hour: Number(read('hour')),
    minute: Number(read('minute')),
    second: Number(read('second')),
    weekday: weekdayMap[read('weekday')] ?? 0,
  };
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const tzValue = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+0';
  const match = tzValue.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return sign * (hours * 60 + minutes);
}

function zonedTimeToUtc({ year, month, day, hour = 0, minute = 0, second = 0 }, timeZone) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60000);
}

function formatShiftRange(startAt, endAt, timeZone) {
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(startAt);
  const startLabel = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(startAt);
  const endLabel = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(endAt);
  return `${dateLabel} · ${startLabel} - ${endLabel}`;
}

function getNextWeekWindow(now, timeZone) {
  const local = getLocalParts(now, timeZone);
  const currentDay = new Date(Date.UTC(local.year, local.month - 1, local.day));
  const daysUntilNextMonday = (8 - local.weekday) % 7 || 7;
  currentDay.setUTCDate(currentDay.getUTCDate() + daysUntilNextMonday);
  const nextMonday = {
    year: currentDay.getUTCFullYear(),
    month: currentDay.getUTCMonth() + 1,
    day: currentDay.getUTCDate(),
  };
  const start = zonedTimeToUtc({ ...nextMonday, hour: 0, minute: 0, second: 0 }, timeZone);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

async function sendWeeklySummaries(timeZone) {
  const now = new Date();
  const local = getLocalParts(now, timeZone);
  const shouldSendThisRun = local.weekday === 0 && local.hour === 18;
  if (!shouldSendThisRun) {
    return { attempted: 0, sent: 0, skipped: 0, reason: 'outside weekly send window' };
  }

  const { start, end } = getNextWeekWindow(now, timeZone);
  const schedules = await EmployeeSchedule.find({
    isCancelled: { $ne: true },
    startAt: { $gte: start, $lt: end },
  })
    .populate('employee')
    .sort({ startAt: 1 })
    .lean();

  const byEmployee = new Map();
  for (const row of schedules) {
    const employee = row?.employee;
    if (!employee?._id || !employee?.email || employee?.isActive === false) continue;
    const key = String(employee._id);
    if (!byEmployee.has(key)) byEmployee.set(key, { employee, shifts: [] });
    byEmployee.get(key).shifts.push(row);
  }

  let attempted = 0;
  let sent = 0;
  let skipped = 0;

  for (const entry of byEmployee.values()) {
    attempted += 1;
    const logExists = await ScheduleNotificationLog.findOne({
      type: 'weekly_summary',
      employee: entry.employee._id,
      weekStart: start,
    }).lean();
    if (logExists) {
      skipped += 1;
      continue;
    }

    const lines = entry.shifts
      .map((shift) => `<li><strong>${shift.title || 'Shift'}</strong> — ${formatShiftRange(new Date(shift.startAt), new Date(shift.endAt), timeZone)}${shift.notes ? ` (${shift.notes})` : ''}</li>`)
      .join('');
    const subject = `Your schedule for next week (${start.toLocaleDateString()} - ${new Date(end.getTime() - 1).toLocaleDateString()})`;
    const html = `
      <p>Hi ${entry.employee.name},</p>
      <p>Here is your work schedule for next week:</p>
      <ul>${lines}</ul>
      <p>Please contact your manager if you need any updates.</p>
    `;
    const text = `Hi ${entry.employee.name},\n\nHere is your work schedule for next week:\n${entry.shifts.map((shift) => `- ${shift.title || 'Shift'}: ${formatShiftRange(new Date(shift.startAt), new Date(shift.endAt), timeZone)}${shift.notes ? ` (${shift.notes})` : ''}`).join('\n')}\n\nPlease contact your manager if you need any updates.`;

    const result = await sendEmployeeScheduleEmail({
      to: entry.employee.email,
      subject,
      html,
      text,
    });
    if (!result.sent) {
      console.error(`Failed weekly summary for ${entry.employee.email}: ${result.error || 'unknown error'}`);
      skipped += 1;
      continue;
    }

    await ScheduleNotificationLog.create({
      type: 'weekly_summary',
      employee: entry.employee._id,
      weekStart: start,
      sentAt: new Date(),
    });
    sent += 1;
  }

  return { attempted, sent, skipped, weekStart: start.toISOString(), weekEnd: end.toISOString() };
}

async function sendShiftReminders(timeZone) {
  const now = new Date();
  
  // Check for shifts starting between 2-3 hours from now (wider window for daily cron)
  const windowStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const shifts = await EmployeeSchedule.find({
    isCancelled: { $ne: true },
    startAt: { $gte: windowStart, $lt: windowEnd },
  })
    .populate('employee')
    .sort({ startAt: 1 })
    .lean();

  let attempted = 0;
  let sent = 0;
  let skipped = 0;

  for (const shift of shifts) {
    const employee = shift?.employee;
    if (!employee?._id || !employee?.email || employee?.isActive === false) {
      skipped += 1;
      continue;
    }

    attempted += 1;
    const logExists = await ScheduleNotificationLog.findOne({
      type: 'shift_reminder',
      schedule: shift._id,
    }).lean();
    if (logExists) {
      skipped += 1;
      continue;
    }

    const shiftLabel = formatShiftRange(new Date(shift.startAt), new Date(shift.endAt), timeZone);
    const subject = `Reminder: your shift starts in 2 hours`;
    const html = `
      <p>Hi ${employee.name},</p>
      <p>This is a reminder that your shift starts in about 2 hours.</p>
      <p><strong>${shift.title || 'Shift'}</strong> — ${shiftLabel}</p>
      ${shift.notes ? `<p><strong>Note:</strong> ${shift.notes}</p>` : ''}
      <p>Please arrive on time. Thank you!</p>
    `;
    const text = `Hi ${employee.name},\n\nThis is a reminder that your shift starts in about 2 hours.\n${shift.title || 'Shift'} — ${shiftLabel}${shift.notes ? `\nNote: ${shift.notes}` : ''}\n\nPlease arrive on time. Thank you!`;

    const result = await sendEmployeeScheduleEmail({
      to: employee.email,
      subject,
      html,
      text,
    });
    if (!result.sent) {
      console.error(`Failed 2-hour reminder for ${employee.email}: ${result.error || 'unknown error'}`);
      skipped += 1;
      continue;
    }

    await ScheduleNotificationLog.create({
      type: 'shift_reminder',
      employee: employee._id,
      schedule: shift._id,
      sentAt: new Date(),
    });
    sent += 1;
  }

  return {
    attempted,
    sent,
    skipped,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
  };
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end();
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  await dbConnect();

  try {
    const timeZone = process.env.SCHEDULE_TIMEZONE || DEFAULT_TIMEZONE;
    const [weekly, reminders] = await Promise.all([
      sendWeeklySummaries(timeZone),
      sendShiftReminders(timeZone),
    ]);

    return res.json({
      success: true,
      timeZone,
      weekly,
      reminders,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Employee schedule notification error:', error);
    return res.status(500).json({ error: 'Failed to run schedule notifications' });
  }
}
