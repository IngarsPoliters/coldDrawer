import { Asset, AssetEvent, EventType } from '@coldDrawer/shared';

export function parseContractEvent(log: any, contractInterface: any): AssetEvent | null {
  try {
    const parsed = contractInterface.parseLog(log);
    if (!parsed) return null;

    const baseEvent = {
      txid: log.transactionHash,
      blockNumber: log.blockNumber,
      timestamp: Math.floor(Date.now() / 1000), // Will be updated with block timestamp
      gasUsed: undefined,
      gasPrice: undefined
    };

    switch (parsed.name) {
      case 'Minted':
        return {
          type: 'mint',
          tokenId: parsed.args.tokenId.toString(),
          minter: parsed.args.owner,
          title: parsed.args.title,
          category: parsed.args.category,
          ...baseEvent
        };

      case 'Transfer':
        // Filter out mint transfers (from zero address)
        if (parsed.args.from === '0x0000000000000000000000000000000000000000') {
          return null;
        }
        return {
          type: 'transfer',
          tokenId: parsed.args.tokenId.toString(),
          from: parsed.args.from,
          to: parsed.args.to,
          ...baseEvent
        };

      case 'SaleOpen':
        return {
          type: 'sale_open',
          tokenId: parsed.args.tokenId.toString(),
          seller: parsed.args.seller,
          buyer: parsed.args.buyer,
          hashH: parsed.args.hashH,
          priceBTC: parsed.args.priceBTC.toString(),
          expiryTimestamp: Number(parsed.args.expiryTimestamp),
          ...baseEvent
        };

      case 'SaleSettle':
        return {
          type: 'sale_settle',
          tokenId: parsed.args.tokenId.toString(),
          seller: parsed.args.seller,
          buyer: parsed.args.buyer,
          hashH: parsed.args.hashH,
          secretS: parsed.args.secretS,
          ...baseEvent
        };

      case 'SaleRefund':
        return {
          type: 'sale_refund',
          tokenId: parsed.args.tokenId.toString(),
          seller: parsed.args.seller,
          buyer: parsed.args.buyer,
          hashH: parsed.args.hashH,
          ...baseEvent
        };

      case 'MetadataFrozen':
        return {
          type: 'freeze',
          tokenId: parsed.args.tokenId.toString(),
          owner: parsed.args.owner,
          ...baseEvent
        };

      case 'NoteAdded':
        return {
          type: 'note',
          tokenId: parsed.args.tokenId.toString(),
          owner: parsed.args.owner,
          note: parsed.args.note,
          ...baseEvent
        };

      default:
        return null;
    }
  } catch (error) {
    console.error('Failed to parse contract event:', error);
    return null;
  }
}

export function determineAssetStatus(events: AssetEvent[]): Asset['status'] {
  // Sort events by block number, then by transaction index
  const sortedEvents = events.sort((a, b) => a.blockNumber - b.blockNumber);
  
  // Get the most recent relevant event
  for (let i = sortedEvents.length - 1; i >= 0; i--) {
    const event = sortedEvents[i];
    
    switch (event.type) {
      case 'sale_settle':
        return 'settled';
      case 'sale_refund':
        return 'refunded';
      case 'sale_open':
        return 'escrow';
      case 'mint':
      case 'transfer':
        return 'owned';
    }
  }
  
  return 'owned';
}

export function getCurrentOwner(events: AssetEvent[]): string {
  // Sort events by block number
  const sortedEvents = events.sort((a, b) => a.blockNumber - b.blockNumber);
  
  // Find the most recent ownership change
  for (let i = sortedEvents.length - 1; i >= 0; i--) {
    const event = sortedEvents[i];
    
    switch (event.type) {
      case 'sale_settle':
        return (event as any).buyer;
      case 'transfer':
        return (event as any).to;
      case 'mint':
        return (event as any).minter;
    }
  }
  
  return '';
}

export function buildAssetTimeline(events: AssetEvent[]): AssetEvent[] {
  return events
    .sort((a, b) => a.blockNumber - b.blockNumber)
    .filter(event => {
      // Include all events except transfers from zero address (mints are handled separately)
      if (event.type === 'transfer') {
        return (event as any).from !== '0x0000000000000000000000000000000000000000';
      }
      return true;
    });
}

export function validateEventData(event: AssetEvent): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!event.tokenId || !/^[0-9]+$/.test(event.tokenId)) {
    errors.push('Invalid token ID');
  }
  
  if (!event.txid || !/^0x[a-fA-F0-9]{64}$/.test(event.txid)) {
    errors.push('Invalid transaction hash');
  }
  
  if (event.blockNumber <= 0) {
    errors.push('Invalid block number');
  }
  
  if (event.timestamp <= 0) {
    errors.push('Invalid timestamp');
  }
  
  // Type-specific validations
  switch (event.type) {
    case 'mint':
      const mintEvent = event as any;
      if (!mintEvent.minter || !/^0x[a-fA-F0-9]{40}$/.test(mintEvent.minter)) {
        errors.push('Invalid minter address');
      }
      if (!mintEvent.title || mintEvent.title.length === 0) {
        errors.push('Missing asset title');
      }
      break;
      
    case 'transfer':
      const transferEvent = event as any;
      if (!transferEvent.from || !/^0x[a-fA-F0-9]{40}$/.test(transferEvent.from)) {
        errors.push('Invalid from address');
      }
      if (!transferEvent.to || !/^0x[a-fA-F0-9]{40}$/.test(transferEvent.to)) {
        errors.push('Invalid to address');
      }
      break;
      
    case 'sale_open':
      const saleEvent = event as any;
      if (!saleEvent.hashH || !/^0x[a-fA-F0-9]{64}$/.test(saleEvent.hashH)) {
        errors.push('Invalid hash H');
      }
      if (!saleEvent.priceBTC || BigInt(saleEvent.priceBTC) <= 0n) {
        errors.push('Invalid BTC price');
      }
      break;
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}