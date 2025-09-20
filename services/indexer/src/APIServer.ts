import express from 'express';
import cors from 'cors';
import { EventIndexer } from './EventIndexer';
import { WebSocketServer } from './WebSocketServer';
import { EventFilter } from '@coldDrawer/shared';
import logger from './utils/logger';

export interface APIServerConfig {
  port: number;
  corsOrigin?: string | string[];
  enableRateLimit?: boolean;
  maxRequestsPerMinute?: number;
}

export class APIServer {
  private app: express.Application;
  private server: any;
  private config: APIServerConfig;
  private indexer: EventIndexer;
  private wsServer: WebSocketServer;

  constructor(
    config: APIServerConfig,
    indexer: EventIndexer,
    wsServer: WebSocketServer
  ) {
    this.config = config;
    this.indexer = indexer;
    this.wsServer = wsServer;
    this.app = express();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(cors({
      origin: this.config.corsOrigin || '*',
      credentials: true
    }));

    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.debug('API request', {
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip
      });
      next();
    });

    // Rate limiting (basic implementation)
    if (this.config.enableRateLimit) {
      const requests = new Map<string, number[]>();
      const maxRequests = this.config.maxRequestsPerMinute || 60;
      
      this.app.use((req, res, next) => {
        const ip = req.ip;
        const now = Date.now();
        const windowStart = now - 60000; // 1 minute window
        
        if (!requests.has(ip)) {
          requests.set(ip, []);
        }
        
        const userRequests = requests.get(ip)!;
        
        // Remove old requests
        const recentRequests = userRequests.filter(time => time > windowStart);
        requests.set(ip, recentRequests);
        
        if (recentRequests.length >= maxRequests) {
          return res.status(429).json({
            error: 'Too many requests',
            retryAfter: Math.ceil((recentRequests[0] + 60000 - now) / 1000)
          });
        }
        
        recentRequests.push(now);
        next();
      });
    }
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        const stats = await this.indexer.getStats();
        const wsStats = this.wsServer.getStats();
        const indexerStatus = this.indexer.getStatus();
        
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          indexer: {
            ...indexerStatus,
            ...stats
          },
          websocket: wsStats
        });
      } catch (error) {
        logger.error('Health check failed', { error });
        res.status(500).json({
          status: 'unhealthy',
          error: (error as Error).message
        });
      }
    });

    // Asset endpoints
    this.app.get('/api/assets', async (req, res) => {
      try {
        const { owner, category, status, search, limit = '50', offset = '0' } = req.query;
        
        let assets;
        
        if (search) {
          assets = await this.indexer.searchAssets(search as string);
        } else if (owner) {
          assets = await this.indexer.getAssetsByOwner(owner as string);
        } else if (category) {
          assets = await this.indexer.getAssetsByCategory(category as string);
        } else if (status) {
          assets = await this.indexer.getAssetsByStatus(status as any);
        } else {
          assets = await this.indexer.getAllAssets();
        }
        
        // Apply pagination
        const limitNum = parseInt(limit as string);
        const offsetNum = parseInt(offset as string);
        const paginatedAssets = assets.slice(offsetNum, offsetNum + limitNum);
        
        res.json({
          assets: paginatedAssets,
          total: assets.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < assets.length
        });
      } catch (error) {
        logger.error('Failed to get assets', { error, query: req.query });
        res.status(500).json({ error: 'Failed to get assets' });
      }
    });

    this.app.get('/api/assets/:tokenId', async (req, res) => {
      try {
        const { tokenId } = req.params;
        const asset = await this.indexer.getAsset(tokenId);
        
        if (!asset) {
          return res.status(404).json({ error: 'Asset not found' });
        }
        
        res.json(asset);
      } catch (error) {
        logger.error('Failed to get asset', { error, tokenId: req.params.tokenId });
        res.status(500).json({ error: 'Failed to get asset' });
      }
    });

    this.app.get('/api/assets/:tokenId/events', async (req, res) => {
      try {
        const { tokenId } = req.params;
        const events = await this.indexer.getAssetEvents(tokenId);
        
        res.json({
          events,
          tokenId
        });
      } catch (error) {
        logger.error('Failed to get asset events', { error, tokenId: req.params.tokenId });
        res.status(500).json({ error: 'Failed to get asset events' });
      }
    });

    // Event endpoints
    this.app.get('/api/events', async (req, res) => {
      try {
        const filter: EventFilter = {};
        
        if (req.query.tokenId) filter.tokenId = req.query.tokenId as string;
        if (req.query.type) filter.type = req.query.type as any;
        if (req.query.address) filter.address = req.query.address as string;
        if (req.query.fromBlock) filter.fromBlock = parseInt(req.query.fromBlock as string);
        if (req.query.toBlock) filter.toBlock = parseInt(req.query.toBlock as string);
        if (req.query.limit) filter.limit = parseInt(req.query.limit as string);
        if (req.query.offset) filter.offset = parseInt(req.query.offset as string);
        
        const events = await this.indexer.getEvents(filter);
        
        res.json({
          events,
          filter
        });
      } catch (error) {
        logger.error('Failed to get events', { error, query: req.query });
        res.status(500).json({ error: 'Failed to get events' });
      }
    });

    // Stats endpoint
    this.app.get('/api/stats', async (req, res) => {
      try {
        const stats = await this.indexer.getStats();
        res.json(stats);
      } catch (error) {
        logger.error('Failed to get stats', { error });
        res.status(500).json({ error: 'Failed to get stats' });
      }
    });

    // Admin endpoints
    this.app.post('/api/admin/sync', async (req, res) => {
      try {
        const { fromBlock } = req.body;
        await this.indexer.forceSync(fromBlock);
        
        res.json({ 
          success: true, 
          message: 'Sync initiated',
          fromBlock 
        });
      } catch (error) {
        logger.error('Failed to force sync', { error, body: req.body });
        res.status(500).json({ error: 'Failed to force sync' });
      }
    });

    this.app.get('/api/admin/export', async (req, res) => {
      try {
        const data = await this.indexer.exportData();
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="indexer-export.json"');
        res.json(data);
      } catch (error) {
        logger.error('Failed to export data', { error });
        res.status(500).json({ error: 'Failed to export data' });
      }
    });

    this.app.post('/api/admin/import', async (req, res) => {
      try {
        const data = req.body;
        await this.indexer.importData(data);
        
        res.json({ 
          success: true, 
          message: 'Data imported successfully' 
        });
      } catch (error) {
        logger.error('Failed to import data', { error });
        res.status(500).json({ error: 'Failed to import data' });
      }
    });

    // Portfolio endpoint (assets grouped by owner)
    this.app.get('/api/portfolio/:address', async (req, res) => {
      try {
        const { address } = req.params;
        const assets = await this.indexer.getAssetsByOwner(address);
        
        // Group by category and status
        const portfolio = {
          owner: address,
          totalAssets: assets.length,
          byCategory: {} as Record<string, number>,
          byStatus: {} as Record<string, number>,
          assets
        };
        
        for (const asset of assets) {
          portfolio.byCategory[asset.category] = (portfolio.byCategory[asset.category] || 0) + 1;
          portfolio.byStatus[asset.status] = (portfolio.byStatus[asset.status] || 0) + 1;
        }
        
        res.json(portfolio);
      } catch (error) {
        logger.error('Failed to get portfolio', { error, address: req.params.address });
        res.status(500).json({ error: 'Failed to get portfolio' });
      }
    });

    // Error handling
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled API error', { error: err, path: req.path });
      res.status(500).json({ error: 'Internal server error' });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, (error?: Error) => {
        if (error) {
          logger.error('Failed to start API server', { error });
          reject(error);
        } else {
          logger.info('API server started', { port: this.config.port });
          resolve();
        }
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    
    return new Promise((resolve, reject) => {
      this.server.close((error?: Error) => {
        if (error) {
          logger.error('Error stopping API server', { error });
          reject(error);
        } else {
          logger.info('API server stopped');
          resolve();
        }
      });
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}