// Network configurations
export const NETWORKS = {
  BITCOIN_TESTNET: {
    name: 'Bitcoin Testnet',
    chainId: 'bitcoin-testnet',
    explorerUrl: 'https://blockstream.info/testnet',
    rpcUrl: 'https://blockstream.info/testnet/api'
  },
  POLYGON_AMOY: {
    name: 'Polygon Amoy Testnet',
    chainId: 80002,
    explorerUrl: 'https://amoy.polygonscan.com',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    currency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    }
  }
} as const;

// Asset categories with display info
export const ASSET_CATEGORIES = {
  vehicle: {
    label: 'Vehicle',
    icon: '🚗',
    fields: ['vin', 'plate', 'make', 'model', 'year', 'color']
  },
  property: {
    label: 'Property',
    icon: '🏡',
    fields: ['address', 'type', 'area', 'year', 'rooms']
  },
  equipment: {
    label: 'Equipment',
    icon: '🧰',
    fields: ['serial', 'make', 'model', 'year', 'type']
  },
  other: {
    label: 'Other',
    icon: '📦',
    fields: ['serial', 'type', 'description']
  }
} as const;

// Status configurations
export const ASSET_STATUS = {
  owned: {
    label: 'Owned',
    color: 'green',
    description: 'Asset is owned by the current user'
  },
  for_sale: {
    label: 'For Sale',
    color: 'blue',
    description: 'Asset is listed for sale but not yet in escrow'
  },
  escrow: {
    label: 'In Escrow',
    color: 'amber',
    description: 'Asset is locked in escrow pending payment'
  },
  settled: {
    label: 'Settled',
    color: 'green',
    description: 'Sale has been completed successfully'
  },
  refunded: {
    label: 'Refunded',
    color: 'gray',
    description: 'Sale was cancelled and funds returned'
  }
} as const;

// Time constants
export const TIME_CONSTANTS = {
  HOUR_IN_SECONDS: 3600,
  DAY_IN_SECONDS: 86400,
  WEEK_IN_SECONDS: 604800,
  DEFAULT_BUFFER_HOURS: 2,
  MIN_BUFFER_HOURS: 1,
  MAX_BUFFER_HOURS: 24,
  MIN_DEADLINE_HOURS: 1,
  MAX_DEADLINE_DAYS: 30
} as const;

// Bitcoin constants
export const BITCOIN_CONSTANTS = {
  SATOSHIS_PER_BTC: 100000000,
  DUST_LIMIT: 1000,
  MAX_SUPPLY_SATOSHIS: 21000000n * 100000000n,
  MIN_CONFIRMATIONS: 1,
  MAX_FEE_RATE: 1000 // sat/vB
} as const;

// Validation limits
export const VALIDATION_LIMITS = {
  TITLE_MAX_LENGTH: 100,
  NOTE_MAX_LENGTH: 140,
  IDENTIFIER_MAX_LENGTH: 50,
  ATTRIBUTE_MAX_LENGTH: 50,
  ATTRIBUTE_MAX_NUMBER: 999999,
  HASH_LENGTH: 64,
  SECRET_LENGTH: 64
} as const;

// API endpoints
export const API_ENDPOINTS = {
  PORTFOLIO: '/api/portfolio',
  ASSET: '/api/asset',
  EVENTS: '/api/events',
  MINT: '/api/mint',
  SELL: '/api/sell',
  TRANSFER: '/api/transfer',
  WEBSOCKET: '/ws'
} as const;

// Event types for filtering
export const EVENT_TYPES = [
  'mint',
  'transfer',
  'sale_open',
  'sale_settle',
  'sale_refund',
  'freeze',
  'note'
] as const;