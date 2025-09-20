export type EventType = 
  | "mint" 
  | "transfer" 
  | "sale_open" 
  | "sale_settle" 
  | "sale_refund" 
  | "freeze" 
  | "note";

export interface BaseEvent {
  type: EventType;
  tokenId: string;
  txid: string;
  blockNumber: number;
  timestamp: number;
  gasUsed?: string;
  gasPrice?: string;
}

export interface MintEvent extends BaseEvent {
  type: "mint";
  minter: string;
  title: string;
  category: string;
}

export interface TransferEvent extends BaseEvent {
  type: "transfer";
  from: string;
  to: string;
}

export interface SaleOpenEvent extends BaseEvent {
  type: "sale_open";
  seller: string;
  buyer: string;
  hashH: string;
  priceBTC: string;
  expiryTimestamp: number;
}

export interface SaleSettleEvent extends BaseEvent {
  type: "sale_settle";
  seller: string;
  buyer: string;
  hashH: string;
  secretS: string;
  btcTxid?: string;
}

export interface SaleRefundEvent extends BaseEvent {
  type: "sale_refund";
  seller: string;
  buyer: string;
  hashH: string;
}

export interface FreezeEvent extends BaseEvent {
  type: "freeze";
  owner: string;
}

export interface NoteEvent extends BaseEvent {
  type: "note";
  owner: string;
  note: string;
}

export type AssetEvent = 
  | MintEvent 
  | TransferEvent 
  | SaleOpenEvent 
  | SaleSettleEvent 
  | SaleRefundEvent 
  | FreezeEvent 
  | NoteEvent;

export interface EventFilter {
  tokenId?: string;
  type?: EventType;
  address?: string;
  fromBlock?: number;
  toBlock?: number;
  limit?: number;
  offset?: number;
}