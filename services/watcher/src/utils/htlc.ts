import { HTLCParams, HTLCValidationResult } from '@coldDrawer/shared';
import { validateHTLCParams } from '@coldDrawer/shared';
import { BitcoinTransaction } from './bitcoin';

export interface PendingHTLC {
  hashH: string;
  tokenId: string;
  priceBTC: string;
  sellerAddress: string;
  buyerAddress: string;
  deadline: number;
  status: 'waiting_btc' | 'btc_locked' | 'asset_locked' | 'claimed' | 'refunded' | 'expired';
  btcTxid?: string;
  assetTxid?: string;
  secretS?: string;
  createdAt: number;
  updatedAt: number;
}

export class HTLCManager {
  private pendingHTLCs: Map<string, PendingHTLC> = new Map();

  addHTLC(htlc: Omit<PendingHTLC, 'status' | 'createdAt' | 'updatedAt'>): void {
    const now = Math.floor(Date.now() / 1000);
    const fullHTLC: PendingHTLC = {
      ...htlc,
      status: 'waiting_btc',
      createdAt: now,
      updatedAt: now
    };

    this.pendingHTLCs.set(htlc.hashH, fullHTLC);
  }

  getHTLC(hashH: string): PendingHTLC | undefined {
    return this.pendingHTLCs.get(hashH);
  }

  getAllHTLCs(): PendingHTLC[] {
    return Array.from(this.pendingHTLCs.values());
  }

  updateHTLCStatus(
    hashH: string, 
    status: PendingHTLC['status'], 
    extra?: Partial<Pick<PendingHTLC, 'btcTxid' | 'assetTxid' | 'secretS'>>
  ): boolean {
    const htlc = this.pendingHTLCs.get(hashH);
    if (!htlc) {
      return false;
    }

    htlc.status = status;
    htlc.updatedAt = Math.floor(Date.now() / 1000);
    
    if (extra) {
      Object.assign(htlc, extra);
    }

    return true;
  }

  removeHTLC(hashH: string): boolean {
    return this.pendingHTLCs.delete(hashH);
  }

  getExpiredHTLCs(): PendingHTLC[] {
    const now = Math.floor(Date.now() / 1000);
    return this.getAllHTLCs().filter(htlc => 
      htlc.deadline < now && 
      !['claimed', 'refunded', 'expired'].includes(htlc.status)
    );
  }

  getHTLCsWaitingForBTC(): PendingHTLC[] {
    return this.getAllHTLCs().filter(htlc => htlc.status === 'waiting_btc');
  }

  getHTLCsReadyForAssetLock(): PendingHTLC[] {
    return this.getAllHTLCs().filter(htlc => htlc.status === 'btc_locked');
  }

  validateHTLCMatch(htlc: PendingHTLC, btcTx: BitcoinTransaction): HTLCValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check amount
    const expectedAmount = parseInt(htlc.priceBTC);
    const actualAmount = btcTx.vout.reduce((sum, output) => 
      sum + Math.round(output.value * 100000000), 0
    );

    if (actualAmount < expectedAmount) {
      errors.push(`Insufficient BTC amount: expected ${expectedAmount}, got ${actualAmount}`);
    }

    // Check timing
    const now = Math.floor(Date.now() / 1000);
    if (htlc.deadline < now) {
      errors.push('HTLC has expired');
    }

    // Check confirmations (if available)
    if (btcTx.confirmations !== undefined && btcTx.confirmations < 1) {
      warnings.push('Transaction not yet confirmed');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  cleanup(): void {
    const expiredThreshold = Math.floor(Date.now() / 1000) - (24 * 60 * 60); // 24 hours ago
    
    for (const [hashH, htlc] of this.pendingHTLCs.entries()) {
      if (htlc.updatedAt < expiredThreshold && 
          ['claimed', 'refunded', 'expired'].includes(htlc.status)) {
        this.pendingHTLCs.delete(hashH);
      }
    }
  }

  getStats(): {
    total: number;
    byStatus: Record<PendingHTLC['status'], number>;
    oldestPending: number | null;
  } {
    const all = this.getAllHTLCs();
    const byStatus: Record<PendingHTLC['status'], number> = {
      waiting_btc: 0,
      btc_locked: 0,
      asset_locked: 0,
      claimed: 0,
      refunded: 0,
      expired: 0
    };

    let oldestPending: number | null = null;

    for (const htlc of all) {
      byStatus[htlc.status]++;
      
      if (!['claimed', 'refunded', 'expired'].includes(htlc.status)) {
        if (oldestPending === null || htlc.createdAt < oldestPending) {
          oldestPending = htlc.createdAt;
        }
      }
    }

    return {
      total: all.length,
      byStatus,
      oldestPending
    };
  }
}