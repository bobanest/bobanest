import crypto from 'crypto';

const TTL_MS = 30 * 60 * 1000;

function secret() {
  return process.env.NEXTAUTH_SECRET || '';
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

// Proof that the holder verified ownership of `email` by entering the emailed code.
export function createRewardToken(email) {
  const payload = Buffer.from(`${String(email).toLowerCase()}|${Date.now() + TTL_MS}`).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyRewardToken(token, email) {
  if (!secret() || typeof token !== 'string') return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  const [tokenEmail, expiry] = Buffer.from(payload, 'base64url').toString().split('|');
  return tokenEmail === String(email).toLowerCase() && Number(expiry) > Date.now();
}
