export interface HTLCParams {
  hashH: string; // SHA256 hash in hex
  amount: string; // in satoshis
  receiverAddress: string;
  senderAddress: string;
  timelock: number; // Unix timestamp
}

export interface BitcoinHTLC extends HTLCParams {
  txid?: string;
  vout?: number;
  scriptPubKey?: string;
  redeemScript?: string;
  witnessScript?: string;
}

export interface AssetHTLC {
  tokenId: string;
  seller: string;
  buyer: string;
  hashH: string;
  expiryTimestamp: number;
  priceBTC: string;
  status: "open" | "claimed" | "refunded";
}

export interface QRPayload {
  version: "1.0";
  hashH: string;
  priceBTC: string; // in satoshis
  receiverAddress: string;
  deadline: number; // Unix timestamp
  tokenId: string;
  assetTitle: string;
  networkBTC: "testnet" | "mainnet";
  networkAsset: string; // e.g., "polygon-amoy"
}

export interface HTLCSecret {
  secret: string; // 32-byte secret in hex
  hash: string; // SHA256(secret) in hex
}

export interface SwapState {
  phase: "pending" | "btc_locked" | "asset_locked" | "settled" | "refunded" | "expired";
  btcHTLC?: BitcoinHTLC;
  assetHTLC?: AssetHTLC;
  secretS?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TimeWindows {
  btcTimelock: number; // Unix timestamp
  assetTimelock: number; // Unix timestamp
  bufferHours: number; // Safety buffer between windows
}

export interface HTLCValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}