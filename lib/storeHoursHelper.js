// Pure JS helper — works on server (Node.js) and client (browser).
// Uses Intl.DateTimeFormat to convert UTC → store's local timezone.

export function fmtTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function getLocalDateStr(date, tz) {
  // Returns "YYYY-MM-DD" in the store's timezone
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date);
}

function getLocalTimeStr(date, tz) {
  // Returns "HH:MM" 24-hour in the store's timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const h = parts.find(p => p.type === 'hour')?.value ?? '00';
  const m = parts.find(p => p.type === 'minute')?.value ?? '00';
  return `${h === '24' ? '00' : h}:${m}`;
}

function getDayOfWeek(localDateStr) {
  const [y, mo, d] = localDateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).getDay(); // 0=Sun
}

/**
 * Returns the store open/closed status at a given UTC datetime.
 * @param {object} doc  - StoreHours document (weeklyHours, specialHours, timezone)
 * @param {Date}   checkDate - defaults to now
 */
export function getStoreStatusAt(doc, checkDate = new Date()) {
  if (!doc || !doc.weeklyHours?.length) {
    return { isOpen: true, reason: null, todayOpen: null, todayClose: null };
  }

  const tz = doc.timezone || 'America/New_York';
  const localDateStr = getLocalDateStr(checkDate, tz);
  const localTimeStr = getLocalTimeStr(checkDate, tz);

  // ── Special hours override ─────────────────────────────────────────────────
  const special = (doc.specialHours || []).find(s => s.date === localDateStr);
  if (special) {
    if (!special.isOpen) {
      return {
        isOpen: false,
        todayOpen: null,
        todayClose: null,
        reason: special.note ? `Closed: ${special.note}` : 'Closed today (special hours)',
      };
    }
    const open = localTimeStr >= special.openTime && localTimeStr < special.closeTime;
    return {
      isOpen: open,
      todayOpen: special.openTime,
      todayClose: special.closeTime,
      reason: open ? null
        : localTimeStr < special.openTime
          ? `Opens at ${fmtTime12(special.openTime)}`
          : `Closed for today`,
    };
  }

  // ── Regular weekly hours ───────────────────────────────────────────────────
  const dow = getDayOfWeek(localDateStr);
  const dayHours = (doc.weeklyHours || []).find(h => h.day === dow);
  if (!dayHours || !dayHours.isOpen) {
    return { isOpen: false, todayOpen: null, todayClose: null, reason: 'Closed today' };
  }

  const open = localTimeStr >= dayHours.openTime && localTimeStr < dayHours.closeTime;
  return {
    isOpen: open,
    todayOpen: dayHours.openTime,
    todayClose: dayHours.closeTime,
    reason: open ? null
      : localTimeStr < dayHours.openTime
        ? `Opens at ${fmtTime12(dayHours.openTime)}`
        : `Closed for today · Opens tomorrow`,
  };
}

/**
 * Returns true if the store is open at the given datetime.
 */
export function isDateTimeOpen(doc, dt) {
  return getStoreStatusAt(doc, typeof dt === 'string' ? new Date(dt) : dt).isOpen;
}
