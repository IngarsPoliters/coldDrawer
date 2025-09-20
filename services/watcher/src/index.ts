import * as dotenv from 'dotenv';
import { HTLCDetector, HTLCDetectorConfig } from './HTLCDetector';
import logger from './utils/logger';

// Load environment variables
dotenv.config({ path: '../../.env' });

async function createHTLCDetector(): Promise<HTLCDetector> {
  const config: HTLCDetectorConfig = {
    bitcoin: {
      apiUrl: process.env.BITCOIN_TESTNET_RPC_URL || 'https://blockstream.info/testnet/api',
      wsUrl: process.env.BITCOIN_TESTNET_WS_URL || 'wss://blockstream.info/testnet/api/v1/ws',
      pollInterval: 30000, // 30 seconds
      maxRetries: 5,
      confirmations: parseInt(process.env.MIN_CONFIRMATIONS || '1')
    },
    evm: {
      rpcUrl: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
      contractAddress: process.env.ASSET_REGISTRY_ADDRESS || '',
      privateKey: process.env.DEPLOYER_PRIVATE_KEY || '',
      gasLimit: '500000',
      gasPrice: undefined // Let ethers estimate
    },
    autoProcessClaims: true,
    timeoutBufferSeconds: parseInt(process.env.HTLC_TIMEOUT_BUFFER_HOURS || '2') * 3600
  };

  // Validate required config
  if (!config.evm.contractAddress) {
    throw new Error('ASSET_REGISTRY_ADDRESS is required');
  }
  if (!config.evm.privateKey) {
    throw new Error('DEPLOYER_PRIVATE_KEY is required');
  }

  return new HTLCDetector(config);
}

async function main() {
  logger.info('Starting coldDrawer HTLC Watcher Service');

  try {
    const detector = await createHTLCDetector();

    // Setup event handlers
    detector.on('swap_initiated', (tokenId, hashH) => {
      logger.info('📝 Swap initiated', { tokenId, hashH: hashH.slice(0, 10) + '...' });
    });

    detector.on('swap_completed', (tokenId, secret) => {
      logger.info('✅ Swap completed successfully', { 
        tokenId, 
        secret: secret.slice(0, 10) + '...' 
      });
    });

    detector.on('swap_refunded', (tokenId, reason) => {
      logger.info('🔄 Swap refunded', { tokenId, reason });
    });

    detector.on('error', (error, context) => {
      logger.error('❌ Detector error', { error: error.message, context });
    });

    // Start the detector
    await detector.start();

    // Setup graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      try {
        await detector.stop();
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Health check endpoint (if needed for monitoring)
    if (process.env.ENABLE_HEALTH_CHECK === 'true') {
      const express = require('express');
      const app = express();
      const port = process.env.WATCHER_PORT || 3002;

      app.get('/health', async (req: any, res: any) => {
        try {
          const stats = await detector.getDetailedStats();
          res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            stats
          });
        } catch (error) {
          res.status(500).json({
            status: 'unhealthy',
            error: (error as Error).message
          });
        }
      });

      app.get('/swaps', (req: any, res: any) => {
        const swaps = detector.getAllSwaps();
        res.json(swaps);
      });

      app.post('/swap/:tokenId/claim', async (req: any, res: any) => {
        try {
          const { tokenId } = req.params;
          const { secret } = req.body;
          
          if (!secret) {
            return res.status(400).json({ error: 'Secret is required' });
          }

          const txHash = await detector.forceClaimAsset(tokenId, secret);
          res.json({ success: true, txHash });
        } catch (error) {
          res.status(500).json({ error: (error as Error).message });
        }
      });

      app.post('/swap/:tokenId/refund', async (req: any, res: any) => {
        try {
          const { tokenId } = req.params;
          const txHash = await detector.forceRefundAsset(tokenId);
          res.json({ success: true, txHash });
        } catch (error) {
          res.status(500).json({ error: (error as Error).message });
        }
      });

      app.listen(port, () => {
        logger.info(`Health check server running on port ${port}`);
      });
    }

    // Status logging
    setInterval(async () => {
      try {
        const stats = detector.getStats();
        logger.info('📊 Service status', {
          isRunning: stats.isRunning,
          totalSwaps: stats.bitcoin.total,
          watchedAddresses: stats.bitcoin.watchedAddresses,
          wsConnected: stats.bitcoin.wsConnected
        });
      } catch (error) {
        logger.error('Failed to log status', { error });
      }
    }, 300000); // Every 5 minutes

    logger.info('🚀 HTLC Watcher Service started successfully');

  } catch (error) {
    logger.error('Failed to start HTLC Watcher Service', { error });
    process.exit(1);
  }
}

// Example usage function (for testing)
export async function testSwap() {
  const detector = await createHTLCDetector();
  await detector.start();

  // Register a test swap
  detector.registerSwap(
    '1', // tokenId
    '0x' + 'a'.repeat(64), // hashH
    '50000000', // 0.5 BTC in satoshis
    'tb1qtest...', // seller BTC address
    '0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE', // buyer EVM address
    Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
  );

  logger.info('Test swap registered');
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error', { error });
    process.exit(1);
  });
}