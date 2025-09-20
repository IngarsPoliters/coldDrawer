import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { AssetEvent, EventFilter } from '@coldDrawer/shared';
import logger from './utils/logger';

export interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'event' | 'error' | 'heartbeat';
  data?: any;
  id?: string;
}

export interface Subscription {
  type: 'events' | 'assets' | 'stats';
  filter?: EventFilter | { owner?: string; category?: string; status?: string };
  id: string;
}

export class WebSocketServer extends EventEmitter {
  private wss: WebSocket.Server;
  private clients = new Map<WebSocket, Set<Subscription>>();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(port: number) {
    super();
    
    this.wss = new WebSocket.Server({ port });
    this.setupServer();
    
    // Setup heartbeat to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // 30 seconds

    logger.info('WebSocket server started', { port });
  }

  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.debug('New WebSocket connection');
      
      this.clients.set(ws, new Set());
      
      // Setup message handler
      ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(ws, data);
      });

      // Setup close handler
      ws.on('close', () => {
        logger.debug('WebSocket connection closed');
        this.clients.delete(ws);
      });

      // Setup error handler
      ws.on('error', (error) => {
        logger.error('WebSocket error', { error });
        this.clients.delete(ws);
      });

      // Send welcome message
      this.sendMessage(ws, {
        type: 'event',
        data: {
          event: 'connected',
          message: 'Connected to coldDrawer indexer'
        }
      });
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', { error });
    });
  }

  private handleMessage(ws: WebSocket, data: WebSocket.Data): void {
    try {
      const message: WSMessage = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(ws, message);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscribe(ws, message);
          break;
          
        case 'heartbeat':
          this.sendMessage(ws, { type: 'heartbeat', data: { timestamp: Date.now() } });
          break;
          
        default:
          this.sendError(ws, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('Failed to parse WebSocket message', { error, data: data.toString() });
      this.sendError(ws, 'Invalid message format');
    }
  }

  private handleSubscribe(ws: WebSocket, message: WSMessage): void {
    try {
      const subscription: Subscription = {
        type: message.data.type,
        filter: message.data.filter,
        id: message.id || this.generateId()
      };

      const clientSubs = this.clients.get(ws);
      if (clientSubs) {
        clientSubs.add(subscription);
        
        logger.debug('Client subscribed', { 
          subscription: subscription.type, 
          id: subscription.id,
          filter: subscription.filter 
        });
        
        this.sendMessage(ws, {
          type: 'event',
          data: {
            event: 'subscribed',
            subscription: subscription.id,
            type: subscription.type
          }
        });
      }
    } catch (error) {
      logger.error('Failed to handle subscribe', { error, message });
      this.sendError(ws, 'Failed to subscribe');
    }
  }

  private handleUnsubscribe(ws: WebSocket, message: WSMessage): void {
    try {
      const subscriptionId = message.data.id;
      const clientSubs = this.clients.get(ws);
      
      if (clientSubs) {
        for (const sub of clientSubs) {
          if (sub.id === subscriptionId) {
            clientSubs.delete(sub);
            
            logger.debug('Client unsubscribed', { id: subscriptionId });
            
            this.sendMessage(ws, {
              type: 'event',
              data: {
                event: 'unsubscribed',
                subscription: subscriptionId
              }
            });
            break;
          }
        }
      }
    } catch (error) {
      logger.error('Failed to handle unsubscribe', { error, message });
      this.sendError(ws, 'Failed to unsubscribe');
    }
  }

  private sendMessage(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Failed to send WebSocket message', { error });
      }
    }
  }

  private sendError(ws: WebSocket, errorMessage: string): void {
    this.sendMessage(ws, {
      type: 'error',
      data: { message: errorMessage }
    });
  }

  private sendHeartbeat(): void {
    const heartbeat = {
      type: 'heartbeat' as const,
      data: { timestamp: Date.now() }
    };

    for (const [ws] of this.clients) {
      this.sendMessage(ws, heartbeat);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Public methods to broadcast events
  broadcastEvent(event: AssetEvent): void {
    const message: WSMessage = {
      type: 'event',
      data: {
        event: 'asset_event',
        data: event
      }
    };

    for (const [ws, subscriptions] of this.clients) {
      for (const sub of subscriptions) {
        if (sub.type === 'events' && this.matchesEventFilter(event, sub.filter)) {
          this.sendMessage(ws, {
            ...message,
            id: sub.id
          });
        }
      }
    }
  }

  broadcastAssetUpdate(asset: any): void {
    const message: WSMessage = {
      type: 'event',
      data: {
        event: 'asset_update',
        data: asset
      }
    };

    for (const [ws, subscriptions] of this.clients) {
      for (const sub of subscriptions) {
        if (sub.type === 'assets' && this.matchesAssetFilter(asset, sub.filter)) {
          this.sendMessage(ws, {
            ...message,
            id: sub.id
          });
        }
      }
    }
  }

  broadcastStats(stats: any): void {
    const message: WSMessage = {
      type: 'event',
      data: {
        event: 'stats_update',
        data: stats
      }
    };

    for (const [ws, subscriptions] of this.clients) {
      for (const sub of subscriptions) {
        if (sub.type === 'stats') {
          this.sendMessage(ws, {
            ...message,
            id: sub.id
          });
        }
      }
    }
  }

  private matchesEventFilter(event: AssetEvent, filter?: EventFilter): boolean {
    if (!filter) return true;

    if (filter.tokenId && event.tokenId !== filter.tokenId) {
      return false;
    }

    if (filter.type && event.type !== filter.type) {
      return false;
    }

    if (filter.address) {
      const eventStr = JSON.stringify(event).toLowerCase();
      const address = filter.address.toLowerCase();
      if (!eventStr.includes(address)) {
        return false;
      }
    }

    if (filter.fromBlock && event.blockNumber < filter.fromBlock) {
      return false;
    }

    if (filter.toBlock && event.blockNumber > filter.toBlock) {
      return false;
    }

    return true;
  }

  private matchesAssetFilter(asset: any, filter?: any): boolean {
    if (!filter) return true;

    if (filter.owner && asset.ownerAddress.toLowerCase() !== filter.owner.toLowerCase()) {
      return false;
    }

    if (filter.category && asset.category !== filter.category) {
      return false;
    }

    if (filter.status && asset.status !== filter.status) {
      return false;
    }

    return true;
  }

  getStats(): {
    connectedClients: number;
    totalSubscriptions: number;
    subscriptionsByType: Record<string, number>;
  } {
    let totalSubscriptions = 0;
    const subscriptionsByType: Record<string, number> = {};

    for (const [, subscriptions] of this.clients) {
      totalSubscriptions += subscriptions.size;
      
      for (const sub of subscriptions) {
        subscriptionsByType[sub.type] = (subscriptionsByType[sub.type] || 0) + 1;
      }
    }

    return {
      connectedClients: this.clients.size,
      totalSubscriptions,
      subscriptionsByType
    };
  }

  async close(): Promise<void> {
    logger.info('Closing WebSocket server');
    
    clearInterval(this.heartbeatInterval);
    
    // Close all client connections
    for (const [ws] of this.clients) {
      ws.close();
    }
    
    // Close server
    return new Promise((resolve, reject) => {
      this.wss.close((error) => {
        if (error) {
          logger.error('Error closing WebSocket server', { error });
          reject(error);
        } else {
          logger.info('WebSocket server closed');
          resolve();
        }
      });
    });
  }
}