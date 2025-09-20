import * as dotenv from 'dotenv';
import { EventIndexer, IndexerConfig } from './EventIndexer';
import { WebSocketServer } from './WebSocketServer';
import { APIServer, APIServerConfig } from './APIServer';
import logger from './utils/logger';

// Load environment variables
dotenv.config({ path: '../../.env' });

async function createIndexer(): Promise<EventIndexer> {
  const config: IndexerConfig = {
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    contractAddress: process.env.ASSET_REGISTRY_ADDRESS || '',
    startBlock: process.env.START_BLOCK ? parseInt(process.env.START_BLOCK) : undefined,
    batchSize: 1000, // Process 1000 blocks at a time
    pollInterval: 10000, // Poll every 10 seconds
    useDatabase: process.env.DATABASE_URL !== undefined,
    databasePath: process.env.DATABASE_URL?.replace('sqlite:', '') || ':memory:',
    maxRetries: 3
  };

  // Validate required config
  if (!config.contractAddress) {
    throw new Error('ASSET_REGISTRY_ADDRESS is required');
  }

  return new EventIndexer(config);
}

async function main() {
  logger.info('Starting coldDrawer Indexer Service');

  try {
    // Create indexer
    const indexer = await createIndexer();

    // Create WebSocket server
    const wsPort = parseInt(process.env.INDEXER_WS_PORT || '3001');
    const wsServer = new WebSocketServer(wsPort);

    // Create API server
    const apiConfig: APIServerConfig = {
      port: parseInt(process.env.INDEXER_PORT || '3001'),
      corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
      enableRateLimit: process.env.ENABLE_RATE_LIMIT === 'true',
      maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '60')
    };

    const apiServer = new APIServer(apiConfig, indexer, wsServer);

    // Initialize indexer
    await indexer.initialize();

    // Setup event handlers to broadcast to WebSocket clients
    indexer.on('event', (event) => {
      wsServer.broadcastEvent(event);
    });

    indexer.on('events_batch', (events) => {
      logger.debug('Processing events batch', { count: events.length });
      
      // Broadcast asset updates for the affected tokens
      const affectedTokens = new Set(events.map(e => e.tokenId));
      
      for (const tokenId of affectedTokens) {
        indexer.getAsset(tokenId).then(asset => {
          if (asset) {
            wsServer.broadcastAssetUpdate(asset);
          }
        }).catch(error => {
          logger.error('Failed to get asset for broadcast', { tokenId, error });
        });
      }
    });

    indexer.on('sync_complete', async (fromBlock, toBlock, eventCount) => {
      logger.info('Sync completed', { fromBlock, toBlock, eventCount });
      
      // Broadcast updated stats
      try {
        const stats = await indexer.getStats();
        wsServer.broadcastStats(stats);
      } catch (error) {
        logger.error('Failed to broadcast stats', { error });
      }
    });

    indexer.on('error', (error) => {
      logger.error('Indexer error', { error: error.message });
    });

    // Start services
    await apiServer.start();
    await indexer.start();

    // Enable real-time listening if supported
    if (process.env.ENABLE_REALTIME_EVENTS === 'true') {
      await indexer.startRealtimeListening();
      logger.info('Real-time event listening enabled');
    }

    // Setup graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      
      try {
        if (process.env.ENABLE_REALTIME_EVENTS === 'true') {
          indexer.stopRealtimeListening();
        }
        
        await indexer.stop();
        await apiServer.stop();
        await wsServer.close();
        
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Status logging
    setInterval(async () => {
      try {
        const stats = await indexer.getStats();
        const wsStats = wsServer.getStats();
        
        logger.info('📊 Service status', {
          assets: stats.totalAssets,
          events: stats.totalEvents,
          lastBlock: stats.lastBlockProcessed,
          wsClients: wsStats.connectedClients,
          wsSubscriptions: wsStats.totalSubscriptions
        });
      } catch (error) {
        logger.error('Failed to log status', { error });
      }
    }, 300000); // Every 5 minutes

    logger.info('🚀 Indexer Service started successfully');

  } catch (error) {
    logger.error('Failed to start Indexer Service', { error });
    process.exit(1);
  }
}

// Example client usage
export class IndexerClient {
  private baseUrl: string;
  private ws: WebSocket | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // REST API methods
  async getAssets(params: {
    owner?: string;
    category?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}/api/assets?${query}`);
    return await response.json();
  }

  async getAsset(tokenId: string) {
    const response = await fetch(`${this.baseUrl}/api/assets/${tokenId}`);
    return await response.json();
  }

  async getAssetEvents(tokenId: string) {
    const response = await fetch(`${this.baseUrl}/api/assets/${tokenId}/events`);
    return await response.json();
  }

  async getEvents(filter: any = {}) {
    const query = new URLSearchParams(filter);
    const response = await fetch(`${this.baseUrl}/api/events?${query}`);
    return await response.json();
  }

  async getStats() {
    const response = await fetch(`${this.baseUrl}/api/stats`);
    return await response.json();
  }

  async getPortfolio(address: string) {
    const response = await fetch(`${this.baseUrl}/api/portfolio/${address}`);
    return await response.json();
  }

  // WebSocket methods
  connectWebSocket(wsUrl: string) {
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      logger.info('Connected to indexer WebSocket');
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      logger.debug('WebSocket message received', { type: message.type });
    };
    
    this.ws.onclose = () => {
      logger.info('WebSocket connection closed');
    };
    
    this.ws.onerror = (error) => {
      logger.error('WebSocket error', { error });
    };
  }

  subscribeToEvents(filter?: any) {
    if (this.ws) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        data: {
          type: 'events',
          filter
        }
      }));
    }
  }

  subscribeToAssets(filter?: any) {
    if (this.ws) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        data: {
          type: 'assets',
          filter
        }
      }));
    }
  }

  subscribeToStats() {
    if (this.ws) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        data: {
          type: 'stats'
        }
      }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error', { error });
    process.exit(1);
  });
}