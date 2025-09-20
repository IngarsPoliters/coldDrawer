import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { BitcoinTransaction, fetchTransaction, extractSecretFromWitness, formatBTCAmount } from './utils/bitcoin';
import { HTLCManager, PendingHTLC } from './utils/htlc';
import logger from './utils/logger';

export interface BitcoinWatcherConfig {
  apiUrl: string;
  wsUrl?: string;
  pollInterval: number; // milliseconds
  maxRetries: number;
  confirmations: number;
}

export interface BitcoinWatcherEvents {
  'htlc_detected': (htlc: PendingHTLC, btcTx: BitcoinTransaction) => void;
  'secret_revealed': (hashH: string, secret: string, btcTx: BitcoinTransaction) => void;
  'htlc_expired': (htlc: PendingHTLC) => void;
  'error': (error: Error) => void;
  'connection_status': (connected: boolean) => void;
}

export declare interface BitcoinWatcher {
  on<U extends keyof BitcoinWatcherEvents>(
    event: U, listener: BitcoinWatcherEvents[U]
  ): this;
  
  emit<U extends keyof BitcoinWatcherEvents>(
    event: U, ...args: Parameters<BitcoinWatcherEvents[U]>
  ): boolean;
}

export class BitcoinWatcher extends EventEmitter {
  private config: BitcoinWatcherConfig;
  private htlcManager: HTLCManager;
  private ws: WebSocket | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private retryCount = 0;
  private watchedAddresses = new Set<string>();
  private processedTxs = new Set<string>();

  constructor(config: BitcoinWatcherConfig) {
    super();
    this.config = config;
    this.htlcManager = new HTLCManager();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bitcoin watcher is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Bitcoin watcher', { 
      apiUrl: this.config.apiUrl,
      wsUrl: this.config.wsUrl,
      pollInterval: this.config.pollInterval 
    });

    // Start WebSocket connection if available
    if (this.config.wsUrl) {
      this.connectWebSocket();
    }

    // Start polling
    this.startPolling();

    // Start cleanup timer
    setInterval(() => {
      this.htlcManager.cleanup();
      this.checkExpiredHTLCs();
    }, 60000); // Every minute
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info('Stopping Bitcoin watcher');

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.emit('connection_status', false);
  }

  addHTLCWatch(htlc: Omit<PendingHTLC, 'status' | 'createdAt' | 'updatedAt'>): void {
    logger.info('Adding HTLC watch', { 
      hashH: htlc.hashH, 
      tokenId: htlc.tokenId,
      priceBTC: formatBTCAmount(htlc.priceBTC)
    });

    this.htlcManager.addHTLC(htlc);

    // Add seller address to watch list
    this.watchedAddresses.add(htlc.sellerAddress);

    // Subscribe to address updates via WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.subscribeToAddress(htlc.sellerAddress);
    }
  }

  getHTLCStatus(hashH: string): PendingHTLC | undefined {
    return this.htlcManager.getHTLC(hashH);
  }

  getAllHTLCs(): PendingHTLC[] {
    return this.htlcManager.getAllHTLCs();
  }

  getStats() {
    return {
      ...this.htlcManager.getStats(),
      watchedAddresses: this.watchedAddresses.size,
      processedTxs: this.processedTxs.size,
      isRunning: this.isRunning,
      wsConnected: this.ws?.readyState === WebSocket.OPEN
    };
  }

  private connectWebSocket(): void {
    if (!this.config.wsUrl) return;

    try {
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.on('open', () => {
        logger.info('WebSocket connected to Bitcoin API');
        this.emit('connection_status', true);
        this.retryCount = 0;

        // Subscribe to all watched addresses
        for (const address of this.watchedAddresses) {
          this.subscribeToAddress(address);
        }
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          logger.error('Failed to parse WebSocket message', { error, data: data.toString() });
        }
      });

      this.ws.on('close', () => {
        logger.warn('WebSocket connection closed');
        this.emit('connection_status', false);
        this.ws = null;

        if (this.isRunning && this.retryCount < this.config.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
          logger.info(`Reconnecting WebSocket in ${delay}ms (attempt ${this.retryCount + 1})`);
          
          setTimeout(() => {
            this.retryCount++;
            this.connectWebSocket();
          }, delay);
        }
      });

      this.ws.on('error', (error) => {
        logger.error('WebSocket error', { error: error.message });
        this.emit('error', error);
      });

    } catch (error) {
      logger.error('Failed to create WebSocket connection', { error });
      this.emit('error', error as Error);
    }
  }

  private subscribeToAddress(address: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscription = {
        op: 'addr_sub',
        addr: address
      };
      this.ws.send(JSON.stringify(subscription));
      logger.debug('Subscribed to address updates', { address });
    }
  }

  private handleWebSocketMessage(message: any): void {
    if (message.op === 'utx') {
      // New unconfirmed transaction
      this.processTransaction(message.x);
    } else if (message.op === 'block') {
      // New block - recheck pending HTLCs for confirmations
      this.recheckPendingHTLCs();
    }
  }

  private startPolling(): void {
    this.pollTimer = setInterval(async () => {
      try {
        await this.pollForUpdates();
      } catch (error) {
        logger.error('Polling error', { error });
        this.emit('error', error as Error);
      }
    }, this.config.pollInterval);

    // Initial poll
    this.pollForUpdates().catch(error => {
      logger.error('Initial poll failed', { error });
    });
  }

  private async pollForUpdates(): Promise<void> {
    const waitingHTLCs = this.htlcManager.getHTLCsWaitingForBTC();
    
    for (const htlc of waitingHTLCs) {
      await this.checkAddressForHTLC(htlc);
    }

    // Check for secret reveals in recent transactions
    const lockedHTLCs = this.htlcManager.getAllHTLCs().filter(h => 
      h.status === 'asset_locked' && h.btcTxid
    );

    for (const htlc of lockedHTLCs) {
      if (htlc.btcTxid) {
        await this.checkForSecretReveal(htlc);
      }
    }
  }

  private async checkAddressForHTLC(htlc: PendingHTLC): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiUrl}/address/${htlc.sellerAddress}/txs`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const transactions: BitcoinTransaction[] = await response.json();
      
      for (const tx of transactions) {
        if (this.processedTxs.has(tx.txid)) {
          continue;
        }

        const validation = this.htlcManager.validateHTLCMatch(htlc, tx);
        if (validation.valid) {
          logger.info('HTLC detected on Bitcoin', { 
            hashH: htlc.hashH,
            txid: tx.txid,
            amount: formatBTCAmount(tx.vout.reduce((sum, out) => sum + Math.round(out.value * 100000000), 0))
          });

          this.htlcManager.updateHTLCStatus(htlc.hashH, 'btc_locked', { btcTxid: tx.txid });
          this.processedTxs.add(tx.txid);
          this.emit('htlc_detected', htlc, tx);
          break;
        }
      }
    } catch (error) {
      logger.error('Failed to check address for HTLC', { 
        address: htlc.sellerAddress, 
        error: (error as Error).message 
      });
    }
  }

  private async checkForSecretReveal(htlc: PendingHTLC): Promise<void> {
    if (!htlc.btcTxid) return;

    try {
      // Get spending transactions of the HTLC output
      const response = await fetch(`${this.config.apiUrl}/tx/${htlc.btcTxid}/outspends`);
      if (!response.ok) {
        return; // Transaction might not be spent yet
      }

      const outspends = await response.json();
      
      for (const spend of outspends) {
        if (spend.spent && spend.txid) {
          const spendTx = await fetchTransaction(spend.txid, this.config.apiUrl);
          if (spendTx) {
            const secret = this.extractSecretFromTransaction(spendTx);
            if (secret) {
              logger.info('Secret revealed in Bitcoin transaction', {
                hashH: htlc.hashH,
                secret,
                revealTxid: spendTx.txid
              });

              this.htlcManager.updateHTLCStatus(htlc.hashH, 'claimed', { secretS: secret });
              this.emit('secret_revealed', htlc.hashH, secret, spendTx);
              return;
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to check for secret reveal', {
        btcTxid: htlc.btcTxid,
        error: (error as Error).message
      });
    }
  }

  private extractSecretFromTransaction(tx: BitcoinTransaction): string | null {
    for (const input of tx.vin) {
      if (input.witness) {
        const secret = extractSecretFromWitness(input.witness);
        if (secret) {
          return secret;
        }
      }
    }
    return null;
  }

  private processTransaction(tx: BitcoinTransaction): void {
    if (this.processedTxs.has(tx.txid)) {
      return;
    }

    // Check if this transaction involves any of our watched addresses
    const involvedAddresses = new Set<string>();
    
    for (const output of tx.vout) {
      if (output.scriptPubKey.address) {
        involvedAddresses.add(output.scriptPubKey.address);
      }
    }

    const relevantHTLCs = this.htlcManager.getHTLCsWaitingForBTC().filter(htlc =>
      involvedAddresses.has(htlc.sellerAddress)
    );

    for (const htlc of relevantHTLCs) {
      const validation = this.htlcManager.validateHTLCMatch(htlc, tx);
      if (validation.valid) {
        logger.info('Real-time HTLC detected', { hashH: htlc.hashH, txid: tx.txid });
        this.htlcManager.updateHTLCStatus(htlc.hashH, 'btc_locked', { btcTxid: tx.txid });
        this.emit('htlc_detected', htlc, tx);
      }
    }

    this.processedTxs.add(tx.txid);
  }

  private async recheckPendingHTLCs(): Promise<void> {
    const pendingHTLCs = this.htlcManager.getAllHTLCs().filter(h => 
      h.status === 'btc_locked' && h.btcTxid
    );

    for (const htlc of pendingHTLCs) {
      if (htlc.btcTxid) {
        const tx = await fetchTransaction(htlc.btcTxid, this.config.apiUrl);
        if (tx && tx.confirmations && tx.confirmations >= this.config.confirmations) {
          logger.info('HTLC transaction confirmed', { 
            hashH: htlc.hashH, 
            confirmations: tx.confirmations 
          });
          // HTLCs with sufficient confirmations are ready for asset locking
        }
      }
    }
  }

  private checkExpiredHTLCs(): void {
    const expiredHTLCs = this.htlcManager.getExpiredHTLCs();
    
    for (const htlc of expiredHTLCs) {
      logger.info('HTLC expired', { hashH: htlc.hashH, tokenId: htlc.tokenId });
      this.htlcManager.updateHTLCStatus(htlc.hashH, 'expired');
      this.emit('htlc_expired', htlc);
    }
  }
}