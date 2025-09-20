import { QRPayload } from '../types';

export function createQRPayload(
  hashH: string,
  priceBTC: string,
  receiverAddress: string,
  deadline: number,
  tokenId: string,
  assetTitle: string,
  networkBTC: 'testnet' | 'mainnet' = 'testnet',
  networkAsset: string = 'polygon-amoy'
): QRPayload {
  return {
    version: '1.0',
    hashH,
    priceBTC,
    receiverAddress,
    deadline,
    tokenId,
    assetTitle,
    networkBTC,
    networkAsset
  };
}

export function parseQRPayload(data: string): QRPayload | null {
  try {
    const payload = JSON.parse(data) as QRPayload;
    
    // Validate required fields
    if (!payload.version || !payload.hashH || !payload.priceBTC || 
        !payload.receiverAddress || !payload.deadline || !payload.tokenId) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

export function formatQRData(payload: QRPayload): string {
  return JSON.stringify(payload, null, 0);
}

export function createBitcoinURI(payload: QRPayload): string {
  const params = new URLSearchParams({
    amount: (parseInt(payload.priceBTC) / 100000000).toString(), // Convert satoshis to BTC
    label: `Asset Purchase: ${payload.assetTitle}`,
    message: `coldDrawer asset purchase - Token ID: ${payload.tokenId}`
  });
  
  return `bitcoin:${payload.receiverAddress}?${params.toString()}`;
}

export function validateQRPayload(payload: QRPayload): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (payload.version !== '1.0') {
    errors.push('Unsupported QR payload version');
  }
  
  if (!/^[a-fA-F0-9]{64}$/.test(payload.hashH)) {
    errors.push('Invalid hash format');
  }
  
  if (!/^[0-9]+$/.test(payload.priceBTC) || BigInt(payload.priceBTC) <= 0n) {
    errors.push('Invalid price format');
  }
  
  if (!payload.receiverAddress || payload.receiverAddress.length < 26) {
    errors.push('Invalid receiver address');
  }
  
  if (payload.deadline <= Math.floor(Date.now() / 1000)) {
    errors.push('Deadline must be in the future');
  }
  
  if (!/^[0-9]+$/.test(payload.tokenId)) {
    errors.push('Invalid token ID format');
  }
  
  if (!payload.assetTitle || payload.assetTitle.trim().length === 0) {
    errors.push('Asset title is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}