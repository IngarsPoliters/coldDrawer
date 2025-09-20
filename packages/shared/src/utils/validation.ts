import { AssetMetadata, AssetCategory, HTLCValidationResult } from '../types';
import { validateHash } from './crypto';
import { validateTimeWindows, calculateTimeWindows } from './time';

export function validateAssetMetadata(metadata: AssetMetadata): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Title validation
  if (!metadata.title || metadata.title.trim().length === 0) {
    errors.push('Title is required');
  } else if (metadata.title.length > 100) {
    errors.push('Title must be 100 characters or less');
  }
  
  // Category validation
  const validCategories: AssetCategory[] = ['vehicle', 'property', 'equipment', 'other'];
  if (!validCategories.includes(metadata.category)) {
    errors.push('Invalid category');
  }
  
  // Identifiers validation
  if (metadata.identifiers) {
    Object.entries(metadata.identifiers).forEach(([key, value]) => {
      if (value && value.length > 50) {
        errors.push(`Identifier ${key} must be 50 characters or less`);
      }
    });
  }
  
  // Attributes validation
  if (metadata.attributes) {
    Object.entries(metadata.attributes).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 50) {
        errors.push(`Attribute ${key} must be 50 characters or less`);
      }
      if (typeof value === 'number' && (value < 0 || value > 999999)) {
        errors.push(`Attribute ${key} must be between 0 and 999999`);
      }
    });
  }
  
  // Note validation
  if (metadata.note && metadata.note.length > 140) {
    errors.push('Note must be 140 characters or less');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateAddress(address: string, network: 'evm' | 'bitcoin'): boolean {
  if (network === 'evm') {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  
  if (network === 'bitcoin') {
    // Simple validation for testnet addresses
    return address.length >= 26 && address.length <= 62;
  }
  
  return false;
}

export function validateTokenId(tokenId: string): boolean {
  return /^[0-9]+$/.test(tokenId) && BigInt(tokenId) > 0n;
}

export function validateBTCAmount(amount: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const satoshis = BigInt(amount);
    if (satoshis <= 0n) {
      errors.push('Amount must be greater than 0');
    }
    if (satoshis < 1000n) {
      errors.push('Amount must be at least 1000 satoshis (dust limit)');
    }
    if (satoshis > 21000000n * 100000000n) {
      errors.push('Amount exceeds maximum Bitcoin supply');
    }
  } catch {
    errors.push('Invalid amount format');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateHTLCParams(
  hashH: string,
  priceBTC: string,
  deadline: number,
  buyerAddress?: string,
  sellerAddress?: string
): HTLCValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Hash validation
  if (!validateHash(hashH)) {
    errors.push('Invalid hash format');
  }
  
  // Price validation
  const priceValidation = validateBTCAmount(priceBTC);
  if (!priceValidation.valid) {
    errors.push(...priceValidation.errors);
  }
  
  // Time windows validation
  const timeWindows = calculateTimeWindows(deadline);
  const timeValidation = validateTimeWindows(timeWindows);
  if (!timeValidation.valid) {
    errors.push(...timeValidation.errors);
  }
  
  // Address validation
  if (buyerAddress && !validateAddress(buyerAddress, 'evm')) {
    errors.push('Invalid buyer address');
  }
  
  if (sellerAddress && !validateAddress(sellerAddress, 'evm')) {
    errors.push('Invalid seller address');
  }
  
  // Warnings
  const timeUntilDeadline = deadline - Math.floor(Date.now() / 1000);
  if (timeUntilDeadline < 3600) {
    warnings.push('Deadline is less than 1 hour from now');
  }
  
  if (timeUntilDeadline > 7 * 24 * 3600) {
    warnings.push('Deadline is more than 7 days from now');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}