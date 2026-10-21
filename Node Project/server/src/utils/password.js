import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Hash a password with scrypt.
 *
 * Format: `salt:derivedKeyHex`. A fresh 16-byte random salt is generated for
 * every password, so two users with the same password never share a hash.
 */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

/**
 * Verify a password against a stored hash.
 *
 * Uses a constant-time comparison so a mismatch cannot be detected by timing
 * the response.
 */
export function verifyPassword(password, stored) {
  try {
    const [salt, derived] = String(stored).split(':');
    if (!salt || !derived) return false;
    const test = scryptSync(password, salt, 64);
    const expected = Buffer.from(derived, 'hex');
    return test.length === expected.length && timingSafeEqual(test, expected);
  } catch {
    return false;
  }
}

/**
 * Generate a temporary password for a newly invited team member.
 *
 * 18 characters from a URL-safe alphabet — enough entropy that the value is
 * not guessable, and short enough to send over WhatsApp or read aloud.
 */
export function generateTempPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(18);
  let out = '';
  for (let i = 0; i < 18; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
