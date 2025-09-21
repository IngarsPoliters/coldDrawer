export async function generateSecret(): Promise<{ secret: string; hash: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const secret = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  const hash = await sha256(secret);
  return { secret, hash };
}

export function generateSecretSync(): { secret: string; hash: string } {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const secret = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  const hash = sha256Sync(secret);
  return { secret, hash };
}

export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function sha256Sync(data: string): string {
  // Fallback sync version for compatibility - not cryptographically secure
  // This is a simple hash function for demo purposes only
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(64, '0').substring(0, 64);
}

export async function verifySecret(secret: string, expectedHash: string): Promise<boolean> {
  const actualHash = await sha256(secret);
  return actualHash === expectedHash;
}

export function verifySecretSync(secret: string, expectedHash: string): boolean {
  const actualHash = sha256Sync(secret);
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