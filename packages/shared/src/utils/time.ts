import { TimeWindows } from '../types';

export const HOUR_IN_SECONDS = 3600;
export const DEFAULT_BUFFER_HOURS = 2;

export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export function addHours(timestamp: number, hours: number): number {
  return timestamp + (hours * HOUR_IN_SECONDS);
}

export function calculateTimeWindows(
  deadline: number,
  bufferHours: number = DEFAULT_BUFFER_HOURS
): TimeWindows {
  const assetTimelock = deadline;
  const btcTimelock = addHours(deadline, bufferHours);
  
  return {
    assetTimelock,
    btcTimelock,
    bufferHours
  };
}

export function validateTimeWindows(windows: TimeWindows): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const now = getCurrentTimestamp();
  
  if (windows.assetTimelock <= now) {
    errors.push('Asset timelock must be in the future');
  }
  
  if (windows.btcTimelock <= windows.assetTimelock) {
    errors.push('Bitcoin timelock must be after asset timelock');
  }
  
  const actualBuffer = (windows.btcTimelock - windows.assetTimelock) / HOUR_IN_SECONDS;
  if (actualBuffer < 1) {
    errors.push('Buffer between timelocks must be at least 1 hour');
  }
  
  if (actualBuffer > 24) {
    errors.push('Buffer between timelocks should not exceed 24 hours');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function isExpired(timestamp: number): boolean {
  return getCurrentTimestamp() > timestamp;
}

export function timeUntilExpiry(timestamp: number): number {
  return Math.max(0, timestamp - getCurrentTimestamp());
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / HOUR_IN_SECONDS);
  const minutes = Math.floor((seconds % HOUR_IN_SECONDS) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}