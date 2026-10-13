import crypto from 'crypto';

const PREFIX = 'scrypt$';

export function hashPasscode(passcode) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(passcode), salt, 32).toString('hex');
  return `${PREFIX}${salt}$${hash}`;
}

export function isHashedPasscode(stored) {
  return typeof stored === 'string' && stored.startsWith(PREFIX);
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function verifyPasscode(passcode, stored) {
  const candidate = String(passcode || '').trim();
  if (!candidate || !stored) return false;

  if (!isHashedPasscode(stored)) {
    return safeEqual(candidate, String(stored).trim());
  }

  const [, salt, hash] = stored.split('$');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(candidate, salt, 32).toString('hex');
  return safeEqual(derived, hash);
}
