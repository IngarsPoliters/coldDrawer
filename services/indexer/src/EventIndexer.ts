import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { AssetEvent } from '@coldDrawer/shared';
import { InMemoryCache } from './cache/InMemoryCache';
import { SQLiteCache } from './cache/SQLiteCache';
import { parseContractEvent, validateEventData } from './utils/events';
import logger from './utils/logger';

export interface IndexerConfig {
  rpcUrl: string;
  contractAddress: string;
  startBlock?: number;
  batchSize: number;
  pollInterval: number;
  useDatabase: boolean;
  databasePath?: string;
  maxRetries: number;
}

export interface IndexerEvents {
  'event': (event: AssetEvent) => void;
  'events_batch': (events: AssetEvent[]) => void;
  'sync_complete': (fromBlock: number, toBlock: number, eventCount: number) => void;
  'error': (error: Error) => void;
}

export declare interface EventIndexer {
  on<U extends keyof IndexerEvents>(
    event: U, listener: IndexerEvents[U]
  ): this;
  
  emit<U extends keyof IndexerEvents>(
    event: U, ...args: Parameters<IndexerEvents[U]>
  ): boolean;
}

export class EventIndexer extends EventEmitter {
  private config: IndexerConfig;
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private cache: InMemoryCache | SQLiteCache;
  private isRunning = false;
  private syncTimer: NodeJS.Timeout | null = null;

  // Contract ABI for events
  private readonly ABI = [
    'event Minted(uint256 indexed tokenId, address indexed owner, string title, string category)',
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
    'event NoteAdded(uint256 indexed tokenId, address indexed owner, string note)',
    'event MetadataFrozen(uint256 indexed tokenId, address indexed owner)',
    'event SaleOpen(uint256 indexed tokenId, address indexed seller, address indexed buyer, bytes32 hashH, uint256 priceBTC, uint256 expiryTimestamp)',
    'event SaleSettle(uint256 indexed tokenId, address indexed seller, address indexed buyer, bytes32 hashH, bytes32 secretS)',
    'event SaleRefund(uint256 indexed tokenId, address indexed seller, address indexed buyer, bytes32 hashH)'
  ];

  constructor(config: IndexerConfig) {
    super();
    this.config = config;
    
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.contract = new ethers.Contract(config.contractAddress, this.ABI, this.provider);
    
    // Initialize cache
    if (config.useDatabase) {
      this.cache = new SQLiteCache(config.databasePath);
    } else {
      this.cache = new InMemoryCache();
    }
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing event indexer', {
        contractAddress: this.config.contractAddress,
        rpcUrl: this.config.rpcUrl,
        useDatabase: this.config.useDatabase
      });

      // Initialize cache
      if (this.cache instanceof SQLiteCache) {
        await this.cache.initialize();
      }

      // Verify contract connection
      const network = await this.provider.getNetwork();
      logger.info('Connected to network', {
        name: network.name,
        chainId: network.chainId
      });

      // Test contract call
      try {
        await this.contract.nextTokenId?.();
        logger.info('Contract connection verified');
      } catch (error) {
        logger.warn('Could not verify contract (might not have nextTokenId method)', { error });
      }

    } catch (error) {
      logger.error('Failed to initialize event indexer', { error });
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Event indexer is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting event indexer');

    try {
      // Perform initial sync
      await this.performSync();

      // Start periodic sync
      this.syncTimer = setInterval(async () => {
        try {
          await this.performSync();
        } catch (error) {
          logger.error('Sync error', { error });
          this.emit('error', error as Error);
        }
      }, this.config.pollInterval);

      logger.info('Event indexer started successfully');

    } catch (error) {
      this.isRunning = false;
      logger.error('Failed to start event indexer', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info('Stopping event indexer');

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.cache instanceof SQLiteCache) {
      await this.cache.close();
    }

    logger.info('Event indexer stopped');
  }

  // Public API methods
  async getAsset(tokenId: string) {
    return await this.cache.getAsset(tokenId);
  }

  async getAllAssets() {
    return await this.cache.getAllAssets();
  }

  async getAssetsByOwner(ownerAddress: string) {
    return await this.cache.getAssetsByOwner(ownerAddress);
  }

  async getAssetsByCategory(category: string) {
    return await this.cache.getAssetsByCategory(category);
  }

  async getAssetsByStatus(status: any) {
    return await this.cache.getAssetsByStatus(status);
  }

  async searchAssets(query: string) {
    return await this.cache.searchAssets(query);
  }

  async getEvents(filter: any = {}) {
    return await this.cache.getEvents(filter);
  }

  async getAssetEvents(tokenId: string) {
    return await this.cache.getAssetEvents(tokenId);
  }

  async getStats() {
    return await this.cache.getStats();
  }

  async forceSync(fromBlock?: number): Promise<void> {
    logger.info('Forcing sync', { fromBlock });
    
    if (fromBlock !== undefined) {
      await this.cache.setLastBlockProcessed(fromBlock - 1);
    }
    
    await this.performSync();
  }

  private async performSync(): Promise<void> {
    const currentBlock = await this.provider.getBlockNumber();
    const lastProcessed = await this.cache.getLastBlockProcessed();
    
    let fromBlock = lastProcessed + 1;
    
    // If no blocks have been processed, start from config or recent block
    if (lastProcessed === 0) {
      fromBlock = this.config.startBlock || Math.max(0, currentBlock - 1000);
    }

    if (fromBlock > currentBlock) {
      logger.debug('No new blocks to process', { fromBlock, currentBlock });
      return;
    }

    logger.debug('Syncing events', { fromBlock, toBlock: currentBlock });

    let processedEvents = 0;
    let retryCount = 0;

    // Process in batches to avoid rate limits
    for (let blockStart = fromBlock; blockStart <= currentBlock; blockStart += this.config.batchSize) {
      const blockEnd = Math.min(blockStart + this.config.batchSize - 1, currentBlock);
      
      try {
        const events = await this.fetchEventsForRange(blockStart, blockEnd);
        
        if (events.length > 0) {
          await this.cache.addEvents(events);
          processedEvents += events.length;
          
          // Emit individual events for real-time listeners
          for (const event of events) {
            this.emit('event', event);
          }
          
          // Emit batch event
          this.emit('events_batch', events);
          
          logger.debug('Processed events batch', {
            fromBlock: blockStart,
            toBlock: blockEnd,
            eventCount: events.length
          });
        }

        await this.cache.setLastBlockProcessed(blockEnd);
        retryCount = 0; // Reset retry count on success

      } catch (error) {
        retryCount++;
        logger.error('Failed to process block range', {
          fromBlock: blockStart,
          toBlock: blockEnd,
          error,
          retryCount
        });

        if (retryCount >= this.config.maxRetries) {
          throw new Error(`Failed to sync after ${this.config.maxRetries} retries: ${error}`);
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        blockStart -= this.config.batchSize; // Retry this batch
        continue;
      }
    }

    if (processedEvents > 0) {
      logger.info('Sync completed', {
        fromBlock,
        toBlock: currentBlock,
        eventCount: processedEvents
      });
      
      this.emit('sync_complete', fromBlock, currentBlock, processedEvents);
    }
  }

  private async fetchEventsForRange(fromBlock: number, toBlock: number): Promise<AssetEvent[]> {
    const events: AssetEvent[] = [];

    try {
      // Get all logs for the contract in this range
      const logs = await this.provider.getLogs({
        address: this.config.contractAddress,
        fromBlock,
        toBlock
      });

      // Get block timestamps for the events
      const blockTimestamps = new Map<number, number>();
      const uniqueBlocks = [...new Set(logs.map(log => log.blockNumber))];
      
      for (const blockNumber of uniqueBlocks) {
        try {
          const block = await this.provider.getBlock(blockNumber);
          if (block) {
            blockTimestamps.set(blockNumber, block.timestamp);
          }
        } catch (error) {
          logger.warn('Failed to get block timestamp', { blockNumber, error });
          blockTimestamps.set(blockNumber, Math.floor(Date.now() / 1000));
        }
      }

      // Parse logs into events
      for (const log of logs) {
        try {
          const event = parseContractEvent(log, this.contract.interface);
          
          if (event) {
            // Update timestamp with actual block timestamp
            event.timestamp = blockTimestamps.get(log.blockNumber) || event.timestamp;
            
            // Validate event data
            const validation = validateEventData(event);
            if (!validation.valid) {
              logger.warn('Invalid event data', { event, errors: validation.errors });
              continue;
            }
            
            events.push(event);
          }
        } catch (error) {
          logger.warn('Failed to parse log', { log, error });
        }
      }

      return events.sort((a, b) => a.blockNumber - b.blockNumber);

    } catch (error) {
      logger.error('Failed to fetch events for range', { fromBlock, toBlock, error });
      throw error;
    }
  }

  async exportData(): Promise<any> {
    if (this.cache instanceof InMemoryCache) {
      return await this.cache.exportData();
    } else {
      // For SQLite, we could implement a full export
      throw new Error('Export not implemented for SQLite cache');
    }
  }

  async importData(data: any): Promise<void> {
    if (this.cache instanceof InMemoryCache) {
      return await this.cache.importData(data);
    } else {
      throw new Error('Import not implemented for SQLite cache');
    }
  }

  // Real-time event listening (alternative to polling)
  async startRealtimeListening(): Promise<void> {
    logger.info('Starting real-time event listening');

    // Listen for new events
    this.contract.on('*', async (event) => {
      try {
        const parsedEvent = parseContractEvent(event.log, this.contract.interface);
        if (parsedEvent) {
          // Get block timestamp
          const block = await this.provider.getBlock(event.log.blockNumber);
          if (block) {
            parsedEvent.timestamp = block.timestamp;
          }

          await this.cache.addEvent(parsedEvent);
          this.emit('event', parsedEvent);
          
          logger.debug('Real-time event processed', {
            type: parsedEvent.type,
            tokenId: parsedEvent.tokenId,
            txid: parsedEvent.txid
          });
        }
      } catch (error) {
        logger.error('Failed to process real-time event', { event, error });
      }
    });
  }

  stopRealtimeListening(): void {
    logger.info('Stopping real-time event listening');
    this.contract.removeAllListeners();
  }

  getStatus(): {
    isRunning: boolean;
    lastSync: number;
    config: Partial<IndexerConfig>;
  } {
    return {
      isRunning: this.isRunning,
      lastSync: 0, // Would need to track this
      config: {
        contractAddress: this.config.contractAddress,
        batchSize: this.config.batchSize,
        pollInterval: this.config.pollInterval,
        useDatabase: this.config.useDatabase
      }
    };
  }
}