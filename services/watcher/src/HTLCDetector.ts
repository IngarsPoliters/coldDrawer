import { EventEmitter } from 'events';
import { BitcoinWatcher, BitcoinWatcherConfig } from './BitcoinWatcher';
import { EVMBridge, EVMBridgeConfig } from './EVMBridge';
import { PendingHTLC } from './utils/htlc';
import { BitcoinTransaction } from './utils/bitcoin';
import logger from './utils/logger';

export interface HTLCDetectorConfig {
  bitcoin: BitcoinWatcherConfig;
  evm: EVMBridgeConfig;
  autoProcessClaims: boolean;
  timeoutBufferSeconds: number;
}

export interface HTLCDetectorEvents {
  'swap_initiated': (tokenId: string, hashH: string) => void;
  'swap_completed': (tokenId: string, secret: string) => void;
  'swap_refunded': (tokenId: string, reason: string) => void;
  'error': (error: Error, context?: any) => void;
}

export declare interface HTLCDetector {
  on<U extends keyof HTLCDetectorEvents>(
    event: U, listener: HTLCDetectorEvents[U]
  ): this;
  
  emit<U extends keyof HTLCDetectorEvents>(
    event: U, ...args: Parameters<HTLCDetectorEvents[U]>
  ): boolean;
}

export class HTLCDetector extends EventEmitter {
  private config: HTLCDetectorConfig;
  private bitcoinWatcher: BitcoinWatcher;
  private evmBridge: EVMBridge;
  private isRunning = false;

  constructor(config: HTLCDetectorConfig) {
    super();
    this.config = config;
    
    this.bitcoinWatcher = new BitcoinWatcher(config.bitcoin);
    this.evmBridge = new EVMBridge(config.evm);

    this.setupEventHandlers();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('HTLC Detector is already running');
      return;
    }

    logger.info('Starting HTLC Detector');

    try {
      // Initialize EVM bridge first
      await this.evmBridge.initialize();
      
      // Start Bitcoin watcher
      await this.bitcoinWatcher.start();
      
      this.isRunning = true;
      logger.info('HTLC Detector started successfully');

    } catch (error) {
      logger.error('Failed to start HTLC Detector', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping HTLC Detector');

    try {
      await this.bitcoinWatcher.stop();
      await this.evmBridge.cleanup();
      
      this.isRunning = false;
      logger.info('HTLC Detector stopped');

    } catch (error) {
      logger.error('Error stopping HTLC Detector', { error });
    }
  }

  registerSwap(
    tokenId: string,
    hashH: string,
    priceBTC: string,
    sellerAddress: string,
    buyerAddress: string,
    deadline: number
  ): void {
    logger.info('Registering new swap', { 
      tokenId, 
      hashH: hashH.slice(0, 10) + '...',
      priceBTC,
      deadline: new Date(deadline * 1000).toISOString()
    });

    const htlc: Omit<PendingHTLC, 'status' | 'createdAt' | 'updatedAt'> = {
      hashH,
      tokenId,
      priceBTC,
      sellerAddress,
      buyerAddress,
      deadline
    };

    this.bitcoinWatcher.addHTLCWatch(htlc);
    this.emit('swap_initiated', tokenId, hashH);
  }

  async forceClaimAsset(tokenId: string, secret: string): Promise<string> {
    logger.info('Force claiming asset', { tokenId, secret: secret.slice(0, 10) + '...' });
    
    try {
      const txHash = await this.evmBridge.claimAsset(tokenId, secret);
      this.emit('swap_completed', tokenId, secret);
      return txHash;
    } catch (error) {
      logger.error('Failed to force claim asset', { tokenId, error });
      throw error;
    }
  }

  async forceRefundAsset(tokenId: string): Promise<string> {
    logger.info('Force refunding asset', { tokenId });
    
    try {
      const txHash = await this.evmBridge.refundAsset(tokenId);
      this.emit('swap_refunded', tokenId, 'Manual refund');
      return txHash;
    } catch (error) {
      logger.error('Failed to force refund asset', { tokenId, error });
      throw error;
    }
  }

  getSwapStatus(hashH: string): PendingHTLC | undefined {
    return this.bitcoinWatcher.getHTLCStatus(hashH);
  }

  getAllSwaps(): PendingHTLC[] {
    return this.bitcoinWatcher.getAllHTLCs();
  }

  getStats() {
    const bitcoinStats = this.bitcoinWatcher.getStats();
    
    return {
      isRunning: this.isRunning,
      bitcoin: bitcoinStats,
      evm: {
        wallet: this.evmBridge.getWalletAddress(),
        // Note: balance and network info require async calls
      }
    };
  }

  async getDetailedStats() {
    const basicStats = this.getStats();
    
    try {
      const [balance, networkInfo] = await Promise.all([
        this.evmBridge.getBalance(),
        this.evmBridge.getNetworkInfo()
      ]);

      return {
        ...basicStats,
        evm: {
          ...basicStats.evm,
          balance,
          network: networkInfo
        }
      };
    } catch (error) {
      logger.error('Failed to get detailed stats', { error });
      return basicStats;
    }
  }

  private setupEventHandlers(): void {
    // Bitcoin watcher events
    this.bitcoinWatcher.on('htlc_detected', this.handleHTLCDetected.bind(this));
    this.bitcoinWatcher.on('secret_revealed', this.handleSecretRevealed.bind(this));
    this.bitcoinWatcher.on('htlc_expired', this.handleHTLCExpired.bind(this));
    this.bitcoinWatcher.on('error', this.handleBitcoinError.bind(this));

    // EVM bridge events
    this.evmBridge.on('asset_escrowed', this.handleAssetEscrowed.bind(this));
    this.evmBridge.on('asset_claimed', this.handleAssetClaimed.bind(this));
    this.evmBridge.on('asset_refunded', this.handleAssetRefunded.bind(this));
    this.evmBridge.on('error', this.handleEVMError.bind(this));
  }

  private async handleHTLCDetected(htlc: PendingHTLC, btcTx: BitcoinTransaction): Promise<void> {
    logger.info('Bitcoin HTLC detected, opening asset escrow', { 
      tokenId: htlc.tokenId, 
      btcTxid: btcTx.txid 
    });

    try {
      // Calculate expiry with buffer
      const assetExpiry = htlc.deadline - this.config.timeoutBufferSeconds;
      
      if (assetExpiry <= Math.floor(Date.now() / 1000)) {
        logger.warn('Asset expiry too soon, skipping escrow', { 
          tokenId: htlc.tokenId,
          assetExpiry,
          now: Math.floor(Date.now() / 1000)
        });
        return;
      }

      await this.evmBridge.openSaleEscrow(
        htlc.tokenId,
        htlc.buyerAddress,
        htlc.hashH,
        assetExpiry,
        htlc.priceBTC
      );

    } catch (error) {
      logger.error('Failed to open asset escrow after BTC detection', { 
        tokenId: htlc.tokenId, 
        error 
      });
      this.emit('error', error as Error, { context: 'asset_escrow', tokenId: htlc.tokenId });
    }
  }

  private async handleSecretRevealed(hashH: string, secret: string, btcTx: BitcoinTransaction): Promise<void> {
    const htlc = this.bitcoinWatcher.getHTLCStatus(hashH);
    if (!htlc) {
      logger.warn('Secret revealed for unknown HTLC', { hashH, secret });
      return;
    }

    logger.info('Secret revealed, claiming asset', { 
      tokenId: htlc.tokenId, 
      revealTxid: btcTx.txid 
    });

    if (!this.config.autoProcessClaims) {
      logger.info('Auto-processing disabled, skipping claim', { tokenId: htlc.tokenId });
      return;
    }

    try {
      await this.evmBridge.claimAsset(htlc.tokenId, secret);
    } catch (error) {
      logger.error('Failed to claim asset after secret reveal', { 
        tokenId: htlc.tokenId, 
        error 
      });
      this.emit('error', error as Error, { context: 'asset_claim', tokenId: htlc.tokenId });
    }
  }

  private async handleHTLCExpired(htlc: PendingHTLC): Promise<void> {
    logger.info('HTLC expired, checking for refund', { tokenId: htlc.tokenId });

    try {
      const isInEscrow = await this.evmBridge.isInEscrow(htlc.tokenId);
      
      if (isInEscrow) {
        logger.info('Asset in escrow and expired, initiating refund', { tokenId: htlc.tokenId });
        await this.evmBridge.refundAsset(htlc.tokenId);
      } else {
        logger.info('Asset not in escrow, no refund needed', { tokenId: htlc.tokenId });
      }

    } catch (error) {
      logger.error('Failed to handle expired HTLC', { 
        tokenId: htlc.tokenId, 
        error 
      });
      this.emit('error', error as Error, { context: 'htlc_expiry', tokenId: htlc.tokenId });
    }
  }

  private handleAssetEscrowed(tokenId: string, buyer: string, hashH: string, txHash: string): void {
    logger.info('Asset escrowed on EVM', { tokenId, buyer, hashH, txHash });
    // Update HTLC status if needed
  }

  private handleAssetClaimed(tokenId: string, buyer: string, secret: string, txHash: string): void {
    logger.info('Asset claimed on EVM', { tokenId, buyer, txHash });
    this.emit('swap_completed', tokenId, secret);
  }

  private handleAssetRefunded(tokenId: string, seller: string, txHash: string): void {
    logger.info('Asset refunded on EVM', { tokenId, seller, txHash });
    this.emit('swap_refunded', tokenId, 'Timeout refund');
  }

  private handleBitcoinError(error: Error): void {
    logger.error('Bitcoin watcher error', { error: error.message });
    this.emit('error', error, { context: 'bitcoin_watcher' });
  }

  private handleEVMError(error: Error): void {
    logger.error('EVM bridge error', { error: error.message });
    this.emit('error', error, { context: 'evm_bridge' });
  }
}