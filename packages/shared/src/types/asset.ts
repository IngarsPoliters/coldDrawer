export type AssetCategory = "vehicle" | "property" | "equipment" | "other";

export type AssetStatus = "owned" | "for_sale" | "escrow" | "settled" | "refunded";

export interface AssetIdentifiers {
  vin?: string;
  plate?: string;
  serial?: string;
  [key: string]: string | undefined;
}

export interface AssetAttributes {
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  [key: string]: string | number | undefined;
}

export interface Asset {
  tokenId: string;
  chainId: string;
  category: AssetCategory;
  title: string;
  identifiers?: AssetIdentifiers;
  attributes?: AssetAttributes;
  status: AssetStatus;
  ownerAddress: string;
  note?: string;
  frozen?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AssetMetadata {
  title: string;
  category: AssetCategory;
  identifiers: AssetIdentifiers;
  attributes: AssetAttributes;
  note?: string;
}

export interface MintAssetRequest {
  tokenId: string;
  metadata: AssetMetadata;
}

export interface SellAssetRequest {
  tokenId: string;
  priceBTC: string; // in satoshis
  deadlineTimestamp: number;
  buyerAddress?: string;
}

export interface TransferAssetRequest {
  tokenId: string;
  toAddress: string;
}