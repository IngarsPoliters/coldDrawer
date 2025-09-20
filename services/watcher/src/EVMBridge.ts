import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import logger from './utils/logger';

export interface EVMBridgeConfig {
  rpcUrl: string;
  contractAddress: string;
  privateKey: string;
  gasLimit?: string;
  gasPrice?: string;
}

export interface EVMBridgeEvents {
  'asset_escrowed': (tokenId: string, buyer: string, hashH: string, txHash: string) => void;
  'asset_claimed': (tokenId: string, buyer: string, secret: string, txHash: string) => void;
  'asset_refunded': (tokenId: string, seller: string, txHash: string) => void;
  'error': (error: Error) => void;
}

export declare interface EVMBridge {
  on<U extends keyof EVMBridgeEvents>(
    event: U, listener: EVMBridgeEvents[U]
  ): this;
  
  emit<U extends keyof EVMBridgeEvents>(
    event: U, ...args: Parameters<EVMBridgeEvents[U]>
  ): boolean;
}

export class EVMBridge extends EventEmitter {
  private config: EVMBridgeConfig;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  // AssetRegistry ABI (minimal required methods)
  private readonly ABI = [
    'function saleOpen(uint256 tokenId, address buyer, bytes32 hashH, uint256 expiryTimestamp, uint256 priceBTC) external',
    'function claim(uint256 tokenId, bytes32 secretS) external',
    'function refund(uint256 tokenId) external',
    'function getSaleEscrow(uint256 tokenId) external view returns (tuple(address seller, address buyer, bytes32 hashH, uint256 expiryTimestamp, uint256 priceBTC, bool active))',
    'function isInEscrow(uint256 tokenId) external view returns (bool)',
    'function ownerOf(uint256 tokenId) external view returns (address)',
    'event SaleOpen(uint256 indexed tokenId, address indexed seller, address indexed buyer, bytes32 hashH, uint256 priceBTC, uint256 expiryTimestamp)',
    'event SaleSettle(uint256 indexed tokenId, address indexed seller, address indexed buyer, bytes32 hashH, bytes32 secretS)',
    'event SaleRefund(uint256 indexed tokenId, address indexed seller, address indexed buyer, bytes32 hashH)'
  ];

  constructor(config: EVMBridgeConfig) {
    super();
    this.config = config;
    
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    this.contract = new ethers.Contract(config.contractAddress, this.ABI, this.wallet);

    this.setupEventListeners();
  }

  async initialize(): Promise<void> {
    try {
      // Verify contract connection
      const network = await this.provider.getNetwork();
      const balance = await this.wallet.provider.getBalance(this.wallet.address);
      
      logger.info('EVM Bridge initialized', {
        network: network.name,
        chainId: network.chainId,
        wallet: this.wallet.address,
        balance: ethers.formatEther(balance),
        contract: this.config.contractAddress
      });

      // Test contract call
      const nextTokenId = await this.contract.nextTokenId?.() || 'N/A';
      logger.info('Contract connection verified', { nextTokenId });

    } catch (error) {
      logger.error('Failed to initialize EVM Bridge', { error });
      throw error;
    }
  }

  async openSaleEscrow(
    tokenId: string,
    buyer: string,
    hashH: string,
    expiryTimestamp: number,
    priceBTC: string
  ): Promise<string> {
    try {
      logger.info('Opening sale escrow', { 
        tokenId, 
        buyer, 
        hashH: hashH.slice(0, 10) + '...',
        expiryTimestamp,
        priceBTC
      });

      const tx = await this.contract.saleOpen(
        tokenId,
        buyer,
        hashH,
        expiryTimestamp,
        priceBTC,
        {
          gasLimit: this.config.gasLimit || '500000',
          gasPrice: this.config.gasPrice || undefined
        }
      );

      const receipt = await tx.wait();
      logger.info('Sale escrow opened', { tokenId, txHash: receipt.hash });

      this.emit('asset_escrowed', tokenId, buyer, hashH, receipt.hash);
      return receipt.hash;

    } catch (error) {
      logger.error('Failed to open sale escrow', { tokenId, error });
      throw error;
    }
  }

  async claimAsset(tokenId: string, secret: string): Promise<string> {
    try {
      logger.info('Claiming asset with secret', { 
        tokenId, 
        secret: secret.slice(0, 10) + '...' 
      });

      const tx = await this.contract.claim(tokenId, secret, {
        gasLimit: this.config.gasLimit || '300000',
        gasPrice: this.config.gasPrice || undefined
      });

      const receipt = await tx.wait();
      logger.info('Asset claimed', { tokenId, txHash: receipt.hash });

      // Extract buyer from logs
      const saleSettleLog = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'SaleSettle';
        } catch {
          return false;
        }
      });

      let buyer = 'unknown';
      if (saleSettleLog) {
        const parsed = this.contract.interface.parseLog(saleSettleLog);
        buyer = parsed?.args?.buyer || 'unknown';
      }

      this.emit('asset_claimed', tokenId, buyer, secret, receipt.hash);
      return receipt.hash;

    } catch (error) {
      logger.error('Failed to claim asset', { tokenId, error });
      throw error;
    }
  }

  async refundAsset(tokenId: string): Promise<string> {
    try {
      logger.info('Refunding asset', { tokenId });

      const tx = await this.contract.refund(tokenId, {
        gasLimit: this.config.gasLimit || '200000',
        gasPrice: this.config.gasPrice || undefined
      });

      const receipt = await tx.wait();
      logger.info('Asset refunded', { tokenId, txHash: receipt.hash });

      // Extract seller from logs
      const saleRefundLog = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'SaleRefund';
        } catch {
          return false;
        }
      });

      let seller = 'unknown';
      if (saleRefundLog) {
        const parsed = this.contract.interface.parseLog(saleRefundLog);
        seller = parsed?.args?.seller || 'unknown';
      }

      this.emit('asset_refunded', tokenId, seller, receipt.hash);
      return receipt.hash;

    } catch (error) {
      logger.error('Failed to refund asset', { tokenId, error });
      throw error;
    }
  }

  async getSaleEscrow(tokenId: string): Promise<{
    seller: string;
    buyer: string;
    hashH: string;
    expiryTimestamp: bigint;
    priceBTC: bigint;
    active: boolean;
  } | null> {
    try {
      const escrow = await this.contract.getSaleEscrow(tokenId);
      return {
        seller: escrow.seller,
        buyer: escrow.buyer,
        hashH: escrow.hashH,
        expiryTimestamp: escrow.expiryTimestamp,
        priceBTC: escrow.priceBTC,
        active: escrow.active
      };
    } catch (error) {
      logger.error('Failed to get sale escrow', { tokenId, error });
      return null;
    }
  }

  async isInEscrow(tokenId: string): Promise<boolean> {
    try {
      return await this.contract.isInEscrow(tokenId);
    } catch (error) {
      logger.error('Failed to check escrow status', { tokenId, error });
      return false;
    }
  }

  async getAssetOwner(tokenId: string): Promise<string | null> {
    try {
      return await this.contract.ownerOf(tokenId);
    } catch (error) {
      logger.error('Failed to get asset owner', { tokenId, error });
      return null;
    }
  }

  async estimateGas(method: string, params: any[]): Promise<string> {
    try {
      const gasEstimate = await this.contract[method].estimateGas(...params);
      // Add 20% buffer
      return (gasEstimate * 120n / 100n).toString();
    } catch (error) {
      logger.error('Failed to estimate gas', { method, params, error });
      return this.config.gasLimit || '500000';
    }
  }

  getWalletAddress(): string {
    return this.wallet.address;
  }

  async getBalance(): Promise<string> {
    const balance = await this.wallet.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }

  async getNetworkInfo(): Promise<{ name: string; chainId: bigint }> {
    const network = await this.provider.getNetwork();
    return {
      name: network.name,
      chainId: network.chainId
    };
  }

  private setupEventListeners(): void {
    // Listen for contract events
    this.contract.on('SaleOpen', (tokenId, seller, buyer, hashH, priceBTC, expiryTimestamp, event) => {
      logger.info('SaleOpen event detected', { 
        tokenId: tokenId.toString(), 
        seller, 
        buyer, 
        hashH,
        txHash: event.transactionHash 
      });
    });

    this.contract.on('SaleSettle', (tokenId, seller, buyer, hashH, secretS, event) => {
      logger.info('SaleSettle event detected', { 
        tokenId: tokenId.toString(), 
        seller, 
        buyer, 
        hashH,
        secret: secretS.slice(0, 10) + '...',
        txHash: event.transactionHash 
      });
    });

    this.contract.on('SaleRefund', (tokenId, seller, buyer, hashH, event) => {
      logger.info('SaleRefund event detected', { 
        tokenId: tokenId.toString(), 
        seller, 
        buyer, 
        hashH,
        txHash: event.transactionHash 
      });
    });

    // Handle provider errors
    this.provider.on('error', (error) => {
      logger.error('Provider error', { error });
      this.emit('error', error);
    });
  }

  async cleanup(): Promise<void> {
    try {
      this.contract.removeAllListeners();
      this.provider.removeAllListeners();
      logger.info('EVM Bridge cleaned up');
    } catch (error) {
      logger.error('Error during cleanup', { error });
    }
  }
}