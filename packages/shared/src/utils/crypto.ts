import { createHash, randomBytes } from 'crypto';

export function generateSecret(): { secret: string; hash: string } {
  const secret = randomBytes(32).toString('hex');
  const hash = sha256(secret);
  return { secret, hash };
}

export function sha256(data: string): string {
  return createHash('sha256').update(Buffer.from(data, 'hex')).digest('hex');
}

export function verifySecret(secret: string, expectedHash: string): boolean {
  const actualHash = sha256(secret);
  return actualHash === expectedHash;
}

export function validateHash(hash: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(hash);
}

export function validateSecret(secret: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(secret);
}

export function normalizeHash(hash: string): string {
  return hash.toLowerCase().replace(/^0x/, '');
}

export function normalizeSecret(secret: string): string {
  return secret.toLowerCase().replace(/^0x/, '');
}